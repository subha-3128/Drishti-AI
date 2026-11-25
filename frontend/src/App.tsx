import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Stop,
  House,
  Sliders,
  ShieldWarning,
  WarningCircle,
} from '@phosphor-icons/react';
import { AppState, transitionAppState } from './app/stateMachine';
import { CameraManager, CameraStatus } from './camera/cameraManager';
import { computeNextFrameDelayMs, MotionMonitor } from './camera/adaptiveScheduler';
import { MirageDetection } from './ai/mirage/mirageAdapter';
import { MirageInferenceError, MirageService } from './ai/mirage/mirageService';
import { clearModelCache, isModelCached } from './ai/inference/modelCache';
import { estimateDirection, formatDirectionPhrase } from './safety/direction/directionEstimator';
import { HazardAlert, HazardEngine } from './safety/hazard-engine/hazardEngine';
import { VoiceAvailability, VoiceEngine } from './voice/voiceEngine';
import { MicrophoneVad } from './voice/microphoneVad';
import { parseVoiceCommand } from './voice/voiceCommandParser';
import { DrishtiSettings, loadSettings, saveSettings } from './storage/settings';
import { StatusPanel } from './components/StatusPanel';
import { OnboardingView } from './screens/OnboardingView';
import { SettingsView } from './screens/SettingsView';
import { SafetyView } from './screens/SafetyView';

type Tab = 'home' | 'settings' | 'safety';
const MIRAGE_MODEL_URL = '/models/mirage.cact';

export default function App() {
  const [settings, setSettings] = useState<DrishtiSettings>(() => loadSettings());
  const [tab, setTab] = useState<Tab>('home');
  const [appState, setAppState] = useState<AppState>('idle');
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [aiStatus, setAiStatus] = useState<string>('Idle (Mirage not loaded)');
  const [voiceCmdStatus, setVoiceCmdStatus] = useState<string>('Disabled');
  const [powerSaverActive, setPowerSaverActive] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [modelCached, setModelCached] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [lastAlert, setLastAlert] = useState<HazardAlert | null>(null);
  const [liveDetections, setLiveDetections] = useState<MirageDetection[]>([]);
  const [inferenceMs, setInferenceMs] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const loopTimerRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const appStateRef = useRef<AppState>('idle');
  const operationIdRef = useRef<number>(0);
  const startAbortRef = useRef<AbortController | null>(null);
  const settingsRef = useRef<DrishtiSettings>(settings);
  const lastAlertRef = useRef<HazardAlert | null>(null);
  const liveDetectionsRef = useRef<MirageDetection[]>([]);

  settingsRef.current = settings;
  lastAlertRef.current = lastAlert;
  liveDetectionsRef.current = liveDetections;

  const voiceRef = useRef<VoiceEngine | null>(null);
  if (!voiceRef.current) voiceRef.current = new VoiceEngine();

  const [voiceAvailability, setVoiceAvailability] = useState<VoiceAvailability>(() =>
    voiceRef.current!.getAvailability()
  );

  const mirageRef = useRef<MirageService | null>(null);
  if (!mirageRef.current) mirageRef.current = new MirageService();

  const motionRef = useRef<MotionMonitor | null>(null);
  if (!motionRef.current) motionRef.current = new MotionMonitor();

  const micVadRef = useRef<MicrophoneVad | null>(null);
  if (!micVadRef.current) micVadRef.current = new MicrophoneVad();

  const hazardEngineRef = useRef<HazardEngine | null>(null);
  if (!hazardEngineRef.current) {
    hazardEngineRef.current = new HazardEngine({
      minConfidence: settings.minConfidence,
      cooldownMs: settings.cooldownMs,
    });
  }

  const clearOverlay = useCallback(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const cameraRef = useRef<CameraManager | null>(null);
  if (!cameraRef.current) {
    cameraRef.current = new CameraManager({
      onStatusChange: (status, detail) => {
        setCameraStatus(status);
        if (status === 'active' && detail) {
          setErrorBanner(detail);
        }
      },
      onError: (msg) => {
        clearOverlay();
        setLiveDetections([]);
        setErrorBanner(msg);
        setAppState((prev) => {
          const res = transitionAppState(prev, 'camera_error');
          appStateRef.current = res.nextState;
          return res.nextState;
        });
        voiceRef.current?.speakImmediateSystem(msg);
      },
    });
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    saveSettings(settings);
    voiceRef.current?.configure({
      rate: settings.speechRate,
      volume: settings.speechVolume,
      hapticsEnabled: settings.hapticsEnabled,
      spatialAudioEnabled: settings.spatialAudioEnabled,
      scanningTickEnabled: settings.scanningTickEnabled,
    });
    hazardEngineRef.current?.updateOptions({
      minConfidence: settings.minConfidence,
      cooldownMs: settings.cooldownMs,
    });
  }, [settings]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    isModelCached(MIRAGE_MODEL_URL).then(setModelCached).catch(() => {});
    const unsubVoice = voiceRef.current?.subscribeAvailability(setVoiceAvailability);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      unsubVoice?.();
    };
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, []);

  const stopAssistance = useCallback(
    (spokenAnnouncement = 'Assistance stopped.') => {
      operationIdRef.current += 1;
      startAbortRef.current?.abort();
      startAbortRef.current = null;

      if (loopTimerRef.current !== null) {
        window.clearTimeout(loopTimerRef.current);
        loopTimerRef.current = null;
      }
      motionRef.current?.stop();
      cameraRef.current?.stop();
      hazardEngineRef.current?.reset();
      releaseWakeLock();
      clearOverlay();
      setLiveDetections([]);
      setInferenceMs(null);
      setPowerSaverActive(false);

      setAppState((prev) => {
        const stopping = transitionAppState(prev, 'stopping');
        const idle = transitionAppState(stopping.nextState, 'idle');
        appStateRef.current = idle.nextState;
        return idle.nextState;
      });

      if (spokenAnnouncement) {
        voiceRef.current?.speakImmediateSystem(spokenAnnouncement);
      }
    },
    [clearOverlay, releaseWakeLock]
  );

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && appStateRef.current === 'active') {
        stopAssistance('Camera paused. Navigation assistance unavailable.');
        setErrorBanner('App backgrounded or screen locked. Camera paused.');
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [stopAssistance]);

  useEffect(() => {
    return () => {
      operationIdRef.current += 1;
      startAbortRef.current?.abort();
      if (loopTimerRef.current !== null) window.clearTimeout(loopTimerRef.current);
      motionRef.current?.stop();
      micVadRef.current?.stop();
      cameraRef.current?.stop();
      mirageRef.current?.terminate();
      voiceRef.current?.dispose();
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  const drawOverlay = useCallback((detections: MirageDetection[]) => {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const w = video.clientWidth || 640;
    const h = video.clientHeight || 480;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    ctx.lineWidth = 3;
    ctx.font = 'bold 14px sans-serif';
    for (const det of detections) {
      const x = det.bbox.x1 * w;
      const y = det.bbox.y1 * h;
      const bw = (det.bbox.x2 - det.bbox.x1) * w;
      const bh = (det.bbox.y2 - det.bbox.y1) * h;

      ctx.strokeStyle = '#22C55E';
      ctx.strokeRect(x, y, bw, bh);

      const label = `${det.spokenName} ${Math.round(det.confidence * 100)}%`;
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = '#020617';
      ctx.fillRect(x, Math.max(0, y - 22), textWidth + 10, 22);
      ctx.fillStyle = '#F8FAFC';
      ctx.fillText(label, x + 5, Math.max(15, y - 6));
    }
  }, []);

  const scheduleNextFrame = useCallback(() => {
    const runFrame = async () => {
      if (appStateRef.current !== 'active') return;
      const cam = cameraRef.current;
      const mirage = mirageRef.current;
      if (!cam || !mirage) return;

      let nextDelayMs = 150;
      if (!mirage.isBusy()) {
        const frame = cam.captureNewestFrame();
        if (frame) {
          try {
            const cur = settingsRef.current;
            const result = await mirage.detectFrame(frame.imageData, cur.minConfidence, frame.timestamp);
            if (result && appStateRef.current === 'active') {
              setInferenceMs(result.inferenceMs);
              setLiveDetections(result.detections);
              if (cur.showCameraPreview) {
                drawOverlay(result.detections);
              }

              const alerts = hazardEngineRef.current?.processDetections(result.detections, Date.now()) ?? [];
              if (alerts.length > 0) {
                setLastAlert(alerts[0]);
                for (const alert of alerts) {
                  voiceRef.current?.enqueue(alert.message, alert.priority, alert.direction);
                }
              } else {
                voiceRef.current?.playScanningTick();
              }

              const stationary = motionRef.current?.isStationary() ?? false;
              const hasUrgentHazard = alerts.some((a) => a.priority === 'P0' || a.priority === 'P1');
              setPowerSaverActive(cur.batterySaverEnabled && stationary && !hasUrgentHazard);
              nextDelayMs = computeNextFrameDelayMs({
                inferenceMs: result.inferenceMs,
                isStationary: stationary,
                hasUrgentHazard,
                batterySaverEnabled: cur.batterySaverEnabled,
              });
            }
          } catch (err) {
            if (err instanceof MirageInferenceError && err.timedOut && appStateRef.current === 'active') {
              const recoveryOpId = operationIdRef.current;
              const recoverySignal = startAbortRef.current?.signal;
              try {
                await mirageRef.current?.initialize(recoverySignal);
                if (appStateRef.current === 'active' && operationIdRef.current === recoveryOpId && !recoverySignal?.aborted) {
                  loopTimerRef.current = window.setTimeout(runFrame, 300);
                  return;
                }
                return;
              } catch {
                if (operationIdRef.current !== recoveryOpId || recoverySignal?.aborted) {
                  return;
                }
              }
            }
            const msg = err instanceof Error ? err.message : 'Cactus Mirage processing failed.';
            setErrorBanner(msg);
            voiceRef.current?.speakImmediateSystem('AI processing error. Assistance stopped.');
            stopAssistance('');
            return;
          }
        }
      }

      if (appStateRef.current === 'active') {
        loopTimerRef.current = window.setTimeout(runFrame, nextDelayMs);
      }
    };

    loopTimerRef.current = window.setTimeout(runFrame, 80);
  }, [drawOverlay, stopAssistance]);

  const startAssistance = useCallback(async () => {
    if (
      appStateRef.current === 'initializing_models' ||
      appStateRef.current === 'starting_camera' ||
      appStateRef.current === 'active'
    ) {
      return;
    }

    const opId = ++operationIdRef.current;
    const controller = new AbortController();
    startAbortRef.current = controller;

    setErrorBanner(null);
    setTab('home');

    const step1 = transitionAppState(appStateRef.current, 'initializing_models');
    if (!step1.accepted) return;
    appStateRef.current = step1.nextState;
    setAppState(step1.nextState);
    setAiStatus('Initializing Cactus Mirage...');
    voiceRef.current?.enqueue('AI is initializing.', 'P2');

    try {
      const { modelName, runtime } = await mirageRef.current!.initialize(controller.signal);
      if (opId !== operationIdRef.current || controller.signal.aborted) {
        return;
      }
      setAiStatus(`Ready (${modelName} • ${runtime})`);
      setModelCached(true);
    } catch (err) {
      if (opId !== operationIdRef.current || controller.signal.aborted) {
        return;
      }
      const msg = err instanceof Error ? err.message : 'Failed to load Cactus Mirage.';
      setAiStatus('Model Error');
      setErrorBanner(msg);
      const errRes = transitionAppState(appStateRef.current, 'model_error');
      appStateRef.current = errRes.nextState;
      setAppState(errRes.nextState);
      voiceRef.current?.speakImmediateSystem('AI model failed to load. Assistance unavailable.');
      return;
    }

    const step2 = transitionAppState(appStateRef.current, 'starting_camera');
    appStateRef.current = step2.nextState;
    setAppState(step2.nextState);

    if (!videoRef.current) {
      setErrorBanner('Camera preview element is not mounted.');
      stopAssistance('');
      return;
    }

    const cameraOk = await cameraRef.current!.start(videoRef.current, controller.signal);
    if (opId !== operationIdRef.current || controller.signal.aborted) {
      cameraRef.current?.stop();
      return;
    }
    if (!cameraOk) {
      return;
    }

    if ('wakeLock' in navigator) {
      navigator.wakeLock
        .request('screen')
        .then((sentinel) => {
          if (opId !== operationIdRef.current || controller.signal.aborted) {
            sentinel.release().catch(() => {});
            return;
          }
          wakeLockRef.current = sentinel;
        })
        .catch(() => {});
    }

    const activeRes = transitionAppState(appStateRef.current, 'active', {
      cameraRunning: cameraRef.current!.getStatus() === 'active',
      modelLoaded: mirageRef.current!.isReady(),
      aiInitialized: mirageRef.current!.isReady(),
    });

    if (!activeRes.accepted) {
      setErrorBanner(activeRes.reason ?? 'Could not activate assistance.');
      stopAssistance('');
      return;
    }

    appStateRef.current = activeRes.nextState;
    setAppState(activeRes.nextState);
    motionRef.current?.start();
    voiceRef.current?.speakImmediateSystem('Assistance started.');
    scheduleNextFrame();
  }, [scheduleNextFrame, stopAssistance]);

  const speakCurrentSceneSummary = useCallback(() => {
    const top = liveDetectionsRef.current.slice(0, 3);
    if (top.length === 0) {
      voiceRef.current?.speakImmediateSystem('No obstacles currently in view.');
      return;
    }
    const summary = top
      .map((d) => `${d.spokenName} ${formatDirectionPhrase(estimateDirection(d.bbox, d.confidence))}`)
      .join(', ');
    voiceRef.current?.speakImmediateSystem(`In view: ${summary}.`);
  }, []);

  const startRef = useRef(startAssistance);
  const stopRef = useRef(stopAssistance);
  const summaryRef = useRef(speakCurrentSceneSummary);
  startRef.current = startAssistance;
  stopRef.current = stopAssistance;
  summaryRef.current = speakCurrentSceneSummary;

  // Offline hands-free voice commands via Cactus Whistle.
  useEffect(() => {
    if (!settings.onboardingCompleted || !settings.voiceCommandsEnabled) {
      micVadRef.current?.stop();
      setVoiceCmdStatus('Disabled');
      return;
    }

    const abort = new AbortController();
    setVoiceCmdStatus('Loading Cactus Whistle...');

    mirageRef.current
      ?.initializeWhistle(abort.signal)
      .then(async () => {
        if (abort.signal.aborted) return;
        await micVadRef.current!.start(
          async (samples16k) => {
            if (abort.signal.aborted || !mirageRef.current?.isWhistleReady()) return;
            try {
              const transcript = await mirageRef.current.transcribeAudio(samples16k);
              const cmd = parseVoiceCommand(transcript);
              if (!cmd) return;

              if (cmd === 'pause') {
                stopRef.current('Paused by voice command.');
              } else if (cmd === 'start') {
                void startRef.current();
              } else if (cmd === 'repeat') {
                voiceRef.current?.speakImmediateSystem(
                  lastAlertRef.current?.message ?? 'No recent alert.'
                );
              } else if (cmd === 'ahead') {
                summaryRef.current();
              } else if (cmd === 'faster') {
                setSettings((prev) => ({
                  ...prev,
                  speechRate: Math.min(1.6, Number((prev.speechRate + 0.15).toFixed(2))),
                }));
                voiceRef.current?.speakImmediateSystem('Speech rate increased.');
              } else if (cmd === 'slower') {
                setSettings((prev) => ({
                  ...prev,
                  speechRate: Math.max(0.7, Number((prev.speechRate - 0.15).toFixed(2))),
                }));
                voiceRef.current?.speakImmediateSystem('Speech rate decreased.');
              }
            } catch {
              // Ignore single transcription failure without interrupting visual assistance.
            }
          },
          () => voiceRef.current?.isSpeaking() ?? false
        );
        if (!abort.signal.aborted) {
          setVoiceCmdStatus('Listening (Cactus Whistle)');
        }
      })
      .catch((err) => {
        if (abort.signal.aborted) return;
        const msg = err instanceof Error ? err.message : 'Voice commands unavailable.';
        setVoiceCmdStatus(`Unavailable (${msg})`);
      });

    return () => {
      abort.abort();
      micVadRef.current?.stop();
    };
  }, [settings.onboardingCompleted, settings.voiceCommandsEnabled]);

  const isRunning = appState === 'active' || appState === 'initializing_models' || appState === 'starting_camera';

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-row">
          <img
            src="/icons/drishti-icon.svg"
            alt=""
            width={44}
            height={44}
            aria-hidden="true"
            style={{ borderRadius: 10 }}
          />
          <div>
            <h1 className="brand-title">Drishti AI — दृष्टि</h1>
            <p className="brand-tagline">See the path. Hear the world.</p>
          </div>
        </div>
      </header>

      {!settings.onboardingCompleted ? (
        <OnboardingView
          onComplete={() => setSettings((prev) => ({ ...prev, onboardingCompleted: true }))}
        />
      ) : (
        <>
          <nav className="nav-bar" aria-label="Main navigation">
            <button
              type="button"
              className="nav-btn"
              aria-current={tab === 'home' ? 'page' : undefined}
              onClick={() => setTab('home')}
            >
              <House size={20} weight="bold" aria-hidden="true" />
              <span>Home</span>
            </button>
            <button
              type="button"
              className="nav-btn"
              aria-current={tab === 'settings' ? 'page' : undefined}
              onClick={() => setTab('settings')}
            >
              <Sliders size={20} weight="bold" aria-hidden="true" />
              <span>Settings</span>
            </button>
            <button
              type="button"
              className="nav-btn"
              aria-current={tab === 'safety' ? 'page' : undefined}
              onClick={() => setTab('safety')}
            >
              <ShieldWarning size={20} weight="bold" aria-hidden="true" />
              <span>Safety</span>
            </button>
          </nav>

          {tab === 'home' && (
            <main style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {errorBanner && (
                <div className="alert-banner alert-banner--error" role="alert">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                    <WarningCircle size={22} weight="bold" aria-hidden="true" />
                    <span>System Alert</span>
                  </div>
                  <p style={{ margin: '6px 0 0' }}>{errorBanner}</p>
                </div>
              )}

              {!isRunning ? (
                <button
                  type="button"
                  className="primary-cta"
                  onClick={startAssistance}
                  aria-label="Start Navigation Assistance"
                >
                  <Play size={30} weight="fill" aria-hidden="true" />
                  <span>Start Assistance</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="stop-cta"
                    onClick={() => stopAssistance('Assistance stopped.')}
                    aria-label="Stop Navigation Assistance"
                  >
                    <Stop size={30} weight="fill" aria-hidden="true" />
                    <span>Stop Assistance</span>
                  </button>
                  {appState === 'active' && (
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={speakCurrentSceneSummary}
                      aria-label="Describe what is ahead right now"
                      style={{ minHeight: 56, fontSize: '1.05rem', fontWeight: 700 }}
                    >
                      What&apos;s Ahead? (Speak Obstacles)
                    </button>
                  )}
                </>
              )}

              <div className="card" aria-live="polite" aria-atomic="true">
                <div style={{ fontSize: '0.85rem', color: 'var(--color-muted-foreground)' }}>
                  Latest Spoken Alert {inferenceMs !== null ? `• ${inferenceMs} ms/frame` : ''}
                  {powerSaverActive ? ' • Stationary Battery Saver' : ''}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: 4 }}>
                  {lastAlert
                    ? `[${lastAlert.priority}] ${lastAlert.message}`
                    : appState === 'active'
                      ? 'Scanning path ahead...'
                      : 'Press Start Assistance when ready.'}
                </div>
              </div>

              <div
                className="camera-stage"
                style={{
                  display: settings.showCameraPreview ? 'block' : 'none',
                }}
              >
                <video ref={videoRef} className="camera-video" playsInline muted />
                <canvas ref={overlayRef} className="camera-overlay" aria-hidden="true" />
              </div>

              {appState === 'active' && liveDetections.length > 0 && (
                <div className="sr-only" aria-live="off">
                  {liveDetections.length} objects currently in view.
                </div>
              )}

              <StatusPanel
                cameraStatus={cameraStatus}
                aiStatus={aiStatus}
                voiceStatus={voiceAvailability.statusLabel}
                voiceCommandStatus={voiceCmdStatus}
                isOnline={isOnline}
                modelCached={modelCached}
              />

              <div className="alert-banner alert-banner--warning" role="note">
                <strong>Experimental Assistive Tool:</strong> Use alongside your white cane or guide
                dog. Never rely on this app for street-crossing decisions.
              </div>
            </main>
          )}

          {tab === 'settings' && (
            <SettingsView
              settings={settings}
              onChange={setSettings}
              onTestVoice={() =>
                voiceRef.current?.speakImmediateSystem('Drishti AI voice test. Obstacle ahead.')
              }
              onClearModelCache={async () => {
                if (!isRunning) {
                  mirageRef.current?.terminate();
                }
                await clearModelCache();
                setModelCached(false);
                setAiStatus('Cache cleared');
              }}
              modelCached={modelCached}
            />
          )}

          {tab === 'safety' && <SafetyView />}
        </>
      )}
    </div>
  );
}
