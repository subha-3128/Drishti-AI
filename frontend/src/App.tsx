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
import { DetectorClient } from './ai/inference/detectorClient';
import { clearModelCache, isModelCached } from './ai/inference/modelCache';
import { RawDetection } from './ai/detection/yoloxCodec';
import { HazardAlert, HazardEngine } from './safety/hazard-engine/hazardEngine';
import { VoiceEngine } from './voice/voiceEngine';
import { DrishtiSettings, loadSettings, saveSettings } from './storage/settings';
import { StatusPanel } from './components/StatusPanel';
import { OnboardingView } from './screens/OnboardingView';
import { SettingsView } from './screens/SettingsView';
import { SafetyView } from './screens/SafetyView';

type Tab = 'home' | 'settings' | 'safety';

export default function App() {
  const [settings, setSettings] = useState<DrishtiSettings>(() => loadSettings());
  const [tab, setTab] = useState<Tab>('home');
  const [appState, setAppState] = useState<AppState>('idle');
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [aiStatus, setAiStatus] = useState<string>('Idle (not loaded)');
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [modelCached, setModelCached] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [lastAlert, setLastAlert] = useState<HazardAlert | null>(null);
  const [liveDetections, setLiveDetections] = useState<RawDetection[]>([]);
  const [inferenceMs, setInferenceMs] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const loopTimerRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const appStateRef = useRef<AppState>('idle');

  const voiceRef = useRef<VoiceEngine | null>(null);
  if (!voiceRef.current) voiceRef.current = new VoiceEngine();

  const detectorRef = useRef<DetectorClient | null>(null);
  if (!detectorRef.current) detectorRef.current = new DetectorClient();

  const hazardEngineRef = useRef<HazardEngine | null>(null);
  if (!hazardEngineRef.current) {
    hazardEngineRef.current = new HazardEngine({
      minConfidence: settings.minConfidence,
      cooldownMs: settings.cooldownMs,
    });
  }

  const cameraRef = useRef<CameraManager | null>(null);
  if (!cameraRef.current) {
    cameraRef.current = new CameraManager({
      onStatusChange: (status) => {
        setCameraStatus(status);
      },
      onError: (msg) => {
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
    isModelCached('/models/yolox_nano.onnx').then(setModelCached).catch(() => {});

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
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
      if (loopTimerRef.current !== null) {
        window.clearTimeout(loopTimerRef.current);
        loopTimerRef.current = null;
      }
      cameraRef.current?.stop();
      hazardEngineRef.current?.reset();
      releaseWakeLock();
      setLiveDetections([]);
      setInferenceMs(null);

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
    [releaseWakeLock]
  );

  // Stop safely if user locks screen or backgrounds the PWA tab.
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loopTimerRef.current !== null) window.clearTimeout(loopTimerRef.current);
      cameraRef.current?.stop();
      detectorRef.current?.terminate();
      voiceRef.current?.stopAll();
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  const drawOverlay = useCallback((detections: RawDetection[]) => {
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
      const det = detectorRef.current;
      if (!cam || !det) return;

      let nextDelayMs = 85; // ~12 FPS max target
      if (!det.isBusy()) {
        const frame = cam.captureNewestFrame();
        if (frame) {
          try {
            const result = await det.detect(frame.imageData, settings.minConfidence, frame.timestamp);
            if (result && appStateRef.current === 'active') {
              setInferenceMs(result.inferenceMs);
              setLiveDetections(result.detections);
              if (settings.showCameraPreview) {
                drawOverlay(result.detections);
              }

              const alerts = hazardEngineRef.current?.processDetections(result.detections, Date.now()) ?? [];
              if (alerts.length > 0) {
                setLastAlert(alerts[0]);
                for (const alert of alerts) {
                  voiceRef.current?.enqueue(alert.message, alert.priority);
                }
              }

              // Pace down on slower devices to prevent UI freeze or overheating
              if (result.inferenceMs > 300) {
                nextDelayMs = 250;
              }
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'AI processing failed.';
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

    loopTimerRef.current = window.setTimeout(runFrame, 60);
  }, [drawOverlay, settings.minConfidence, settings.showCameraPreview, stopAssistance]);

  const startAssistance = async () => {
    setErrorBanner(null);
    setTab('home');

    const step1 = transitionAppState(appStateRef.current, 'initializing_models');
    if (!step1.accepted) return;
    appStateRef.current = step1.nextState;
    setAppState(step1.nextState);
    setAiStatus('Initializing YOLOX-Nano...');
    voiceRef.current?.enqueue('AI is initializing.', 'P2');

    try {
      const { modelName, provider } = await detectorRef.current!.initialize();
      setAiStatus(`Ready (${modelName} • ${provider})`);
      setModelCached(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load AI model.';
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
      return;
    }

    const cameraOk = await cameraRef.current!.start(videoRef.current);
    if (!cameraOk) {
      return;
    }

    // Request Wake Lock so screen stays on while walking (best-effort)
    if ('wakeLock' in navigator) {
      navigator.wakeLock
        .request('screen')
        .then((sentinel) => {
          wakeLockRef.current = sentinel;
        })
        .catch(() => {});
    }

    const activeRes = transitionAppState(appStateRef.current, 'active', {
      cameraRunning: cameraRef.current!.getStatus() === 'active',
      modelLoaded: detectorRef.current!.isReady(),
      aiInitialized: detectorRef.current!.isReady(),
    });

    if (!activeRes.accepted) {
      setErrorBanner(activeRes.reason ?? 'Could not activate assistance.');
      stopAssistance('');
      return;
    }

    appStateRef.current = activeRes.nextState;
    setAppState(activeRes.nextState);
    voiceRef.current?.speakImmediateSystem('Assistance started.');
    scheduleNextFrame();
  };

  const isRunning = appState === 'active' || appState === 'initializing_models' || appState === 'starting_camera';
  const voiceAvailability = voiceRef.current?.getAvailability() ?? {
    supported: false,
    voiceCount: 0,
    statusLabel: 'Voice Unavailable',
  };

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
                <button
                  type="button"
                  className="stop-cta"
                  onClick={() => stopAssistance('Assistance stopped.')}
                  aria-label="Stop Navigation Assistance"
                >
                  <Stop size={30} weight="fill" aria-hidden="true" />
                  <span>Stop Assistance</span>
                </button>
              )}

              <div className="card" aria-live="polite" aria-atomic="true">
                <div style={{ fontSize: '0.85rem', color: 'var(--color-muted-foreground)' }}>
                  Latest Spoken Alert {inferenceMs !== null ? `• ${inferenceMs} ms/frame` : ''}
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
