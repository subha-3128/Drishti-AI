import {
  ArrowLeft,
  CheckCircle,
  Cpu,
  HardDrive,
  Trash,
  WifiHigh,
  WifiSlash,
} from '@phosphor-icons/react';

interface OfflineStatusViewProps {
  isOnline: boolean;
  modelCached: boolean;
  onClearModelCache: () => void;
  onBack: () => void;
}

export function OfflineStatusView({
  isOnline,
  modelCached,
  onClearModelCache,
  onBack,
}: OfflineStatusViewProps) {
  return (
    <main className="app-main" aria-labelledby="offline-title">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          className="icon-circle-btn"
          onClick={onBack}
          aria-label="Back"
        >
          <ArrowLeft size={22} weight="bold" aria-hidden="true" />
        </button>
        <h2 id="offline-title" className="headline-page">
          Model &amp; Offline Status
        </h2>
      </div>

      <section className="card-elevated">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle size={28} weight="bold" color="var(--color-secondary)" aria-hidden="true" />
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-primary)' }}>
            {modelCached ? 'Ready for offline use' : 'Bundled in PWA'}
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-muted-foreground)' }}>
          Vision and voice models execute locally on your phone with SHA-256 checksum
          verification. Internet access is not required during walking assistance.
        </p>
      </section>

      <section className="status-list" aria-label="Model storage breakdown">
        <div className="status-row">
          <div className="status-row-left">
            <Cpu size={22} weight="bold" color="var(--color-secondary)" aria-hidden="true" />
            <div>
              <div>Tier 1 Fast Detector</div>
              <div className="font-mono" style={{ fontSize: '0.82rem', color: 'var(--color-muted-foreground)' }}>
                efficientdet_lite0.tflite (4.4 MB)
              </div>
            </div>
          </div>
          <span className="status-row-right">MediaPipe GPU</span>
        </div>

        <div className="status-row">
          <div className="status-row-left">
            <Cpu size={22} weight="bold" color="var(--color-secondary)" aria-hidden="true" />
            <div>
              <div>Tier 2 Scene Engine</div>
              <div className="font-mono" style={{ fontSize: '0.82rem', color: 'var(--color-muted-foreground)' }}>
                mirage.cact (20.6 MB)
              </div>
            </div>
          </div>
          <span className="status-row-right">Cactus WASM</span>
        </div>

        <div className="status-row">
          <div className="status-row-left">
            <Cpu size={22} weight="bold" color="var(--color-secondary)" aria-hidden="true" />
            <div>
              <div>Voice Commands (Opt-In)</div>
              <div className="font-mono" style={{ fontSize: '0.82rem', color: 'var(--color-muted-foreground)' }}>
                whistle.cact (16.1 MB)
              </div>
            </div>
          </div>
          <span className="status-row-right">Cactus WASM</span>
        </div>

        <div className="status-row">
          <div className="status-row-left">
            <HardDrive size={22} weight="bold" color="var(--color-tertiary)" aria-hidden="true" />
            <div>
              <div>Local Verification Cache</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-muted-foreground)' }}>
                {modelCached ? 'Verified in Cache API' : 'Pending first initialization'}
              </div>
            </div>
          </div>
          <span className="font-mono" style={{ fontWeight: 600 }}>
            ~41.1 MB
          </span>
        </div>

        <div className="status-row">
          <div className="status-row-left">
            {isOnline ? (
              <WifiHigh size={22} weight="bold" color="var(--color-secondary)" aria-hidden="true" />
            ) : (
              <WifiSlash size={22} weight="bold" color="var(--color-muted-foreground)" aria-hidden="true" />
            )}
            <div>
              <div>Internet Connection</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-muted-foreground)' }}>
                Not required for detection
              </div>
            </div>
          </div>
          <span className="status-row-right">{isOnline ? 'Connected' : 'Offline'}</span>
        </div>
      </section>

      <button type="button" className="btn-secondary-ivory" onClick={onClearModelCache}>
        <Trash size={20} weight="bold" aria-hidden="true" />
        <span>Clear Cached AI Models</span>
      </button>
    </main>
  );
}
