import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  CaretDown,
  CaretUp,
  CheckCircle,
  Cpu,
  Eye,
  EyeSlash,
  GearSix,
  HourglassHigh,
  House,
  Megaphone,
  Moon,
  PlayCircle,
  Question,
  RadioButton,
  SpeakerHigh,
  StopCircle,
  Sun,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import { AppState, transitionAppState } from './app/stateMachine';
import { CameraManager, CameraStatus } from './camera/cameraManager';
import { computeNextFrameDelayMs, MotionMonitor } from './camera/adaptiveScheduler';
import { FastDetectorService } from './ai/fast/fastDetectorService';
import { MirageDetection } from './ai/mirage/mirageAdapter';
import { MirageInferenceError, MirageService } from './ai/mirage/mirageService';
import { clearModelCache, isModelCached } from './ai/inference/modelCache';
import { estimateDirection, formatDirectionPhrase } from './safety/direction/directionEstimator';
import { HazardAlert, HazardEngine } from './safety/hazard-engine/hazardEngine';
import { VoiceAvailability, VoiceEngine } from './voice/voiceEngine';
import { MicrophoneVad } from './voice/microphoneVad';
import { parseVoiceCommand } from './voice/voiceCommandParser';
import { DrishtiSettings, loadSettings, saveSettings } from './storage/settings';
import { BrandMark } from './components/BrandMark';
import { StatusPanel } from './components/StatusPanel';
import { OnboardingView } from './screens/OnboardingView';
import { SettingsView } from './screens/SettingsView';
import { OfflineStatusView } from './screens/OfflineStatusView';
import { SafetyView } from './screens/SafetyView';

type Tab = 'home' | 'settings' | 'safety' | 'offline';
const FAST_MODEL_URL = '/models/efficientdet_lite0.tflite';
const MIRAGE_INTERVAL_MS = 6000;
const TICK_INTERVAL_MS = 2000;

export default function App() {
  const [settings, setSettings] = useState<DrishtiSettings>(() => loadSettings());
  const [tab, setTab] = useState<Tab>('home');
  const [appState, setAppState] = useState<AppState>('idle');
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [aiStatus, setAiStatus] = useState<string>('Ready');
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
  const mirageSceneRef = useRef<MirageDetection[]>([]);
  const lastMirageAtRef = useRef<number>(0);
  const lastTickAtRef = useRef<number>(0);

  settingsRef.current = settings;
  lastAlertRef.current = lastAlert;
  liveDetectionsRef.current = liveDetections;

  const voiceRef = useRef<VoiceEngine | null>(null);
  if (!voiceRef.current) voiceRef.current = new VoiceEngine();

  const [voiceAvailability, setVoiceAvailability] = useState<VoiceAvailability>(() =>
    voiceRef.current!.getAvailability()
  );

  const fastDetectorRef = useRef<FastDetectorService | null>(null);
  if (!fastDetectorRef.current) fastDetectorRef.current = new FastDetectorService();

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
    const root = document.documentElement;
    root.setAttribute('data-theme', settings.theme);
    root.setAttribute('data-text-size', settings.textSize);
    root.setAttribute('data-reduced-motion', String(settings.reducedMotion));
    saveSettings(settings);
    voiceRef.current?.configure({
      rate: settings.speechRate,
      volume: settings.speechVolume,
      speechAlertsEnabled: settings.speechAlertsEnabled,
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
    isModelCached(FAST_MODEL_URL).then(setModelCached).catch(() => {});
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
      mirageSceneRef.current = [];
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
      fastDetectorRef.current?.terminate();
      mirageRef.current?.terminate();
      voiceRef.current?.dispose();
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  const drawOverlay = useCallback((detections: MirageDetection[]) => {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const w = video.clientWidth || 480;
    const h = video.clientHeight || 360;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    ctx.lineWidth = 3;
    ctx.font = 'bold 14px Commissioner, sans-serif';
    for (const det of detections) {
      const x = det.bbox.x1 * w;
      const y = det.bbox.y1 * h;
      const bw = (det.bbox.x2 - det.bbox.x1) * w;
      const bh = (det.bbox.y2 - det.bbox.y1) * h;

      ctx.strokeStyle = '#F7BC62';
      ctx.strokeRect(x, y, bw, bh);

      const label = `${det.spokenName} ${Math.round(det.confidence * 100)}%`;
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = '#250C36';
      ctx.fillRect(x, Math.max(0, y - 24), textWidth + 12, 24);
      ctx.fillStyle = '#FFF8F3';
      ctx.fillText(label, x + 6, Math.max(16, y - 7));
    }
  }, []);

  const emitAlerts = useCallback((alerts: HazardAlert[]) => {
    if (alerts.length === 0) return;
    setLastAlert(alerts[0]);
    for (const alert of alerts) {
      voiceRef.current?.enqueue(alert.message, alert.priority, alert.direction);
    }
  }, []);

  const scheduleNextFrame = useCallback(() => {
    const runFrame = async () => {
      if (appStateRef.current !== 'active') return;
      const cam = cameraRef.current;
      const fast = fastDetectorRef.current;
      const mirage = mirageRef.current;
      const video = videoRef.current;
      if (!cam || !fast || !video) return;

      const now = Date.now();
      const cur = settingsRef.current;
      let nextDelayMs = 45;

      try {
        const fastResult = await fast.detectVideo(video, cur.minConfidence);
        if (fastResult && appStateRef.current === 'active') {
          setInferenceMs(fastResult.inferenceMs);
          const mergedView = [...fastResult.detections, ...mirageSceneRef.current];
          setLiveDetections(mergedView);
          if (cur.showCameraPreview) {
            drawOverlay(mergedView);
          }

          const alerts = hazardEngineRef.current?.processDetections(fastResult.detections, now) ?? [];
          if (alerts.length > 0) {
            emitAlerts(alerts);
          } else if (now - lastTickAtRef.current >= TICK_INTERVAL_MS) {
            lastTickAtRef.current = now;
            voiceRef.current?.playScanningTick();
          }

          const stationary = motionRef.current?.isStationary() ?? false;
          const hasUrgentHazard = alerts.some((a) => a.priority === 'P0' || a.priority === 'P1');
          setPowerSaverActive(cur.batterySaverEnabled && stationary && !hasUrgentHazard);
          nextDelayMs = computeNextFrameDelayMs({
            inferenceMs: fastResult.inferenceMs,
            isStationary: stationary,
            hasUrgentHazard,
            batterySaverEnabled: cur.batterySaverEnabled,
          });
        }

        if (
          mirage?.isReady() &&
          !mirage.isBusy() &&
          now - lastMirageAtRef.current >= MIRAGE_INTERVAL_MS &&
          !(cur.batterySaverEnabled && (motionRef.current?.isStationary() ?? false))
        ) {
          const frame = cam.captureNewestFrame();
          if (frame) {
            lastMirageAtRef.current = now;
            const scanOpId = operationIdRef.current;
            mirage
              .detectFrame(frame.imageData, cur.minConfidence, frame.timestamp)
              .then((mRes) => {
                if (!mRes || appStateRef.current !== 'active' || operationIdRef.current !== scanOpId) return;
                const sceneExtras = mRes.detections.filter(
                  (d) => d.classId === 'stairs' || d.classId === 'barrier' || d.classId === 'tree'
                );
                mirageSceneRef.current = sceneExtras;
                const sceneAlerts =
                  hazardEngineRef.current?.processDetections(sceneExtras, Date.now()) ?? [];
                emitAlerts(sceneAlerts);
              })
              .catch((err) => {
                if (
                  err instanceof MirageInferenceError &&
                  err.timedOut &&
                  appStateRef.current === 'active' &&
                  operationIdRef.current === scanOpId
                ) {
                  mirageRef.current?.initialize(startAbortRef.current?.signal).catch(() => {});
                }
              });
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Vision processing failed.';
        setErrorBanner(msg);
        voiceRef.current?.speakImmediateSystem('AI processing error. Assistance stopped.');
        stopAssistance('');
        return;
      }

      if (appStateRef.current === 'active') {
        loopTimerRef.current = window.setTimeout(runFrame, nextDelayMs);
      }
    };

    loopTimerRef.current = window.setTimeout(runFrame, 50);
  }, [drawOverlay, emitAlerts, stopAssistance]);

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
    setAiStatus('Loading GPU detector...');
    voiceRef.current?.enqueue('AI is initializing.', 'P2');

    let tier1Summary = '';
    try {
      tier1Summary = await fastDetectorRef.current!.initialize(
        controller.signal,
        settingsRef.current.minConfidence
      );
      if (opId !== operationIdRef.current || controller.signal.aborted) {
        return;
      }
      setAiStatus(`${tier1Summary}`);
      setModelCached(true);
    } catch (err) {
      if (opId !== operationIdRef.current || controller.signal.aborted) {
        return;
      }
      const msg = err instanceof Error ? err.message : 'Failed to load fast object detector.';
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
      modelLoaded: fastDetectorRef.current!.isReady(),
      aiInitialized: fastDetectorRef.current!.isReady(),
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

    mirageRef.current
      ?.initialize(controller.signal)
      .then(({ modelName }) => {
        if (opId === operationIdRef.current && !controller.signal.aborted) {
          setAiStatus(`${tier1Summary} + ${modelName}`);
        }
      })
      .catch(() => {});
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

  useEffect(() => {
    if (!settings.onboardingCompleted || !settings.voiceCommandsEnabled) {
      micVadRef.current?.stop();
      setVoiceCmdStatus('Disabled');
      return;
    }

    const abort = new AbortController();
    setVoiceCmdStatus('Loading Whistle...');

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
              // Ignore single transcription failure cleanly.
            }
          },
          () => voiceRef.current?.isSpeaking() ?? false
        );
        if (!abort.signal.aborted) {
          setVoiceCmdStatus('Listening (Whistle)');
        }
      })
      .catch((err) => {
        if (abort.signal.aborted) return;
        const msg = err instanceof Error ? err.message : 'Unavailable';
        setVoiceCmdStatus(`Error (${msg})`);
      });

    return () => {
      abort.abort();
      micVadRef.current?.stop();
    };
  }, [settings.onboardingCompleted, settings.voiceCommandsEnabled]);

  const isDark = settings.theme === 'high-contrast-dark';
  const isInitializing =
    appState === 'initializing_models' || appState === 'starting_camera';
  const isActive = appState === 'active';
  const isRunning = isInitializing || isActive;

  const toggleTheme = () => {
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === 'high-contrast-dark' ? 'high-contrast-light' : 'high-contrast-dark',
    }));
  };

  return (
    <div className="app-shell">
      {!settings.onboardingCompleted ? (
        <>
          <header className="app-header">
            <div className="brand-row">
              <BrandMark size={36} />
              <div>
                <h1 className="brand-title">Drishti AI</h1>
                <span className="brand-sub" lang="hi">
                  दृष्टि
                </span>
              </div>
            </div>
            <button
              type="button"
              className="pill-btn"
              onClick={toggleTheme}
              aria-label="Switch Light or Dark theme"
            >
              {isDark ? <Sun size={18} weight="bold" /> : <Moon size={18} weight="bold" />}
              <span>{isDark ? 'Ivory' : 'Dark'}</span>
            </button>
          </header>
          <OnboardingView
            onComplete={() => setSettings((prev) => ({ ...prev, onboardingCompleted: true }))}
          />
        </>
      ) : (
        <>
          {/* Persistent hidden/visible video element kept mounted cleanly across camera startup & live loop */}
          {!isRunning && (
            <header className="app-header">
              <div className="brand-row">
                <BrandMark size={40} />
                <div>
                  <h1 className="brand-title">Drishti AI</h1>
                  <span className="brand-sub" lang="hi">
                    दृष्टि
                  </span>
                </div>
              </div>
              <div className="header-actions">
                <button
                  type="button"
                  className="pill-btn"
                  onClick={toggleTheme}
                  aria-label="Switch Light or Dark theme"
                >
                  {isDark ? <Sun size={18} weight="bold" /> : <Moon size={18} weight="bold" />}
                  <span>{isDark ? 'Ivory' : 'Dark'}</span>
                </button>
                <button
                  type="button"
                  className="icon-circle-btn"
                  onClick={() => setTab('settings')}
                  aria-label="Open Settings"
                >
                  <GearSix size={22} weight="bold" aria-hidden="true" />
                </button>
              </div>
            </header>
          )}

          {tab === 'home' && (
            <main className="app-main">
              {errorBanner && (
                <div className="banner-error" role="alert">
                  <WarningCircle
                    size={22}
                    weight="bold"
                    color="var(--color-error)"
                    style={{ flexShrink: 0, marginTop: 2 }}
                    aria-hidden="true"
                  />
                  <div>
                    <strong style={{ display: 'block' }}>System Alert</strong>
                    <span style={{ fontSize: '0.92rem' }}>{errorBanner}</span>
                  </div>
                </div>
              )}

              {/* Screen 04: Home Dashboard (Idle / Error) */}
              {!isRunning && (
                <>
                  <div>
                    <h2 className="headline-page">Ready to explore?</h2>
                    <p className="verified-line">
                      <CheckCircle size={18} weight="bold" aria-hidden="true" />
                      <span>All systems ready for on-device assistance</span>
                    </p>
                  </div>

                  <section className="card-hero" aria-label="Start assistance">
                    <div className="hero-orb">
                      <Eye size={44} weight="bold" aria-hidden="true" />
                    </div>
                    <button
                      type="button"
                      className="btn-primary-royal"
                      onClick={startAssistance}
                      aria-label="Start Navigation Assistance"
                    >
                      <PlayCircle size={28} weight="fill" aria-hidden="true" />
                      <span>Start Assistance</span>
                    </button>
                    <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--color-muted-foreground)' }}>
                      Starts camera and on-device vision locally with spoken alerts.
                    </p>
                  </section>

                  <StatusPanel
                    cameraStatus={cameraStatus === 'idle' ? 'Ready' : cameraStatus}
                    aiStatus={aiStatus}
                    voiceStatus={voiceAvailability.ready ? 'Available' : voiceAvailability.statusLabel}
                    voiceCommandStatus={voiceCmdStatus}
                    isOnline={isOnline}
                    modelCached={modelCached}
                    onOpenOfflineStatus={() => setTab('offline')}
                  />

                  <p
                    style={{
                      margin: '2px 0 0',
                      fontSize: '0.85rem',
                      textAlign: 'center',
                      color: 'var(--color-muted-foreground)',
                    }}
                  >
                    Safety reminder: Continue using your white cane, guide dog, or mobility aid.
                  </p>
                </>
              )}

              {/* Screen 05: Initializing Assistance */}
              {isInitializing && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 6 }}>
                    <button
                      type="button"
                      className="icon-circle-btn"
                      onClick={() => stopAssistance('Assistance cancelled.')}
                      aria-label="Cancel and return Home"
                    >
                      <X size={22} weight="bold" aria-hidden="true" />
                    </button>
                    <h2 className="headline-page" style={{ fontSize: '1.45rem' }}>
                      Starting Assistance
                    </h2>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: 12,
                      padding: '10px 0',
                    }}
                    aria-live="polite"
                  >
                    <div className="hero-orb hero-orb--gold">
                      <HourglassHigh size={42} weight="bold" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--color-primary)' }}>
                        Preparing on-device vision
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '0.92rem', color: 'var(--color-muted-foreground)' }}>
                        Loading local models on your device. No frames leave your phone.
                      </p>
                    </div>
                  </div>

                  <section className="status-list" aria-label="Initialization stages">
                    <div
                      className={`status-row ${
                        appState === 'initializing_models' ? 'status-row--active' : 'status-row--ready'
                      }`}
                    >
                      <div className="status-row-left">
                        <Cpu size={22} weight="bold" aria-hidden="true" />
                        <span>Loading vision engine</span>
                      </div>
                      <span className="status-row-right">
                        {appState === 'initializing_models' ? 'In progress' : 'Complete'}
                      </span>
                    </div>

                    <div
                      className={`status-row ${
                        appState === 'starting_camera' ? 'status-row--active' : ''
                      }`}
                    >
                      <div className="status-row-left">
                        <Camera size={22} weight="bold" aria-hidden="true" />
                        <span>Starting rear camera</span>
                      </div>
                      <span className="status-row-right">
                        {appState === 'starting_camera' ? 'In progress' : 'Waiting'}
                      </span>
                    </div>

                    <div className="status-row">
                      <div className="status-row-left">
                        <SpeakerHigh size={22} weight="bold" aria-hidden="true" />
                        <span>Preparing audio alerts</span>
                      </div>
                      <span className="status-row-right status-row-right--muted">
                        {voiceAvailability.ready ? 'Ready' : 'Waiting'}
                      </span>
                    </div>
                  </section>

                  <button
                    type="button"
                    className="btn-secondary-ivory"
                    onClick={() => stopAssistance('Assistance cancelled.')}
                  >
                    Cancel
                  </button>
                </>
              )}

              {/* Screens 06 & 07: Live Assistance */}
              {isActive && (
                <>
                  <header
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      paddingTop: 4,
                    }}
                  >
                    <div className="badge-pill badge-jade">
                      <RadioButton size={18} weight="fill" aria-hidden="true" />
                      <span>Assistance Active</span>
                    </div>
                    <span className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--color-muted-foreground)' }}>
                      {inferenceMs !== null ? `${inferenceMs} ms/frame` : 'Warming up'}
                      {powerSaverActive ? ' • Saver' : ''}
                    </span>
                  </header>

                  <section
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}
                    aria-label="Active system status"
                  >
                    <div className="status-row" style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted-foreground)' }}>
                          Camera
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--color-secondary)' }}>
                          Active
                        </span>
                      </div>
                      <Camera size={20} weight="bold" color="var(--color-secondary)" aria-hidden="true" />
                    </div>
                    <div className="status-row" style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted-foreground)' }}>
                          Vision AI
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--color-secondary)' }}>
                          Running
                        </span>
                      </div>
                      <Cpu size={20} weight="bold" color="var(--color-secondary)" aria-hidden="true" />
                    </div>
                  </section>

                  <section
                    aria-live="polite"
                    role="status"
                    className={`card-elevated ${lastAlert ? '' : 'card-elevated--jade'}`}
                    style={{ flex: 1, justifyContent: 'center', minHeight: 170 }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        color: lastAlert ? 'var(--color-tertiary)' : 'var(--color-secondary)',
                        fontWeight: 600,
                        fontSize: '0.92rem',
                      }}
                    >
                      <Megaphone size={20} weight="bold" aria-hidden="true" />
                      <span>{lastAlert ? `Last spoken alert [${lastAlert.priority}]` : 'Scanning surroundings'}</span>
                    </div>
                    <h2 className="headline-page" style={{ fontSize: '1.85rem' }}>
                      {lastAlert ? lastAlert.message : 'Scanning path ahead...'}
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--color-muted-foreground)' }}>
                      Audio guidance is primary. Keep your phone steady alongside your white cane.
                    </p>
                  </section>

                  <button
                    type="button"
                    className="btn-secondary-ivory"
                    onClick={speakCurrentSceneSummary}
                    aria-label="Describe what is ahead right now"
                  >
                    <SpeakerHigh size={20} weight="bold" aria-hidden="true" />
                    <span>What&apos;s Ahead? (Speak Obstacles)</span>
                  </button>

                  <button
                    type="button"
                    className="status-row"
                    aria-expanded={settings.showCameraPreview}
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        showCameraPreview: !prev.showCameraPreview,
                      }))
                    }
                  >
                    <span className="status-row-left" style={{ fontSize: '0.9rem' }}>
                      {settings.showCameraPreview ? (
                        <Eye size={18} weight="bold" aria-hidden="true" />
                      ) : (
                        <EyeSlash size={18} weight="bold" aria-hidden="true" />
                      )}
                      <span>
                        {settings.showCameraPreview
                          ? 'Hide camera preview'
                          : 'Camera preview minimized (recommended)'}
                      </span>
                    </span>
                    {settings.showCameraPreview ? (
                      <CaretUp size={18} weight="bold" aria-hidden="true" />
                    ) : (
                      <CaretDown size={18} weight="bold" aria-hidden="true" />
                    )}
                  </button>
                </>
              )}

              {/* Video stays mounted during starting_camera & active so CameraManager always binds cleanly */}
              <div
                className="camera-stage"
                style={{
                  display: isActive && settings.showCameraPreview ? 'block' : 'none',
                }}
              >
                <video ref={videoRef} className="camera-video" playsInline muted />
                <canvas ref={overlayRef} className="camera-overlay" aria-hidden="true" />
              </div>

              {isActive && liveDetections.length > 0 && (
                <div className="sr-only" aria-live="off">
                  {liveDetections.length} objects currently in view.
                </div>
              )}

              {isActive && (
                <button
                  type="button"
                  className="btn-stop-crimson"
                  onClick={() => stopAssistance('Assistance stopped.')}
                  aria-label="Stop Navigation Assistance"
                >
                  <StopCircle size={28} weight="fill" aria-hidden="true" />
                  <span>Stop Assistance</span>
                </button>
              )}
            </main>
          )}

          {tab === 'settings' && (
            <SettingsView
              settings={settings}
              onChange={setSettings}
              onTestVoice={() =>
                voiceRef.current?.speakImmediateSystem('Drishti AI voice test. Obstacle ahead.')
              }
              onOpenOfflineStatus={() => setTab('offline')}
              modelCached={modelCached}
            />
          )}

          {tab === 'offline' && (
            <OfflineStatusView
              isOnline={isOnline}
              modelCached={modelCached}
              onClearModelCache={async () => {
                if (!isRunning) {
                  fastDetectorRef.current?.terminate();
                  mirageRef.current?.terminate();
                }
                await clearModelCache();
                setModelCached(false);
                setAiStatus('Cache cleared');
              }}
              onBack={() => setTab('home')}
            />
          )}

          {tab === 'safety' && <SafetyView />}

          {/* Stitch 3-Destination Bottom Navigation Bar */}
          {!isRunning && (
            <nav className="bottom-nav" aria-label="Main navigation">
              <div className="bottom-nav-grid">
                <button
                  type="button"
                  className="bottom-nav-btn"
                  aria-current={tab === 'home' || tab === 'offline' ? 'page' : undefined}
                  onClick={() => setTab('home')}
                >
                  <House size={22} weight={tab === 'home' ? 'fill' : 'bold'} aria-hidden="true" />
                  <span>Home</span>
                </button>
                <button
                  type="button"
                  className="bottom-nav-btn"
                  aria-current={tab === 'settings' ? 'page' : undefined}
                  onClick={() => setTab('settings')}
                >
                  <GearSix size={22} weight={tab === 'settings' ? 'fill' : 'bold'} aria-hidden="true" />
                  <span>Settings</span>
                </button>
                <button
                  type="button"
                  className="bottom-nav-btn"
                  aria-current={tab === 'safety' ? 'page' : undefined}
                  onClick={() => setTab('safety')}
                >
                  <Question size={22} weight={tab === 'safety' ? 'fill' : 'bold'} aria-hidden="true" />
                  <span>Help</span>
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
