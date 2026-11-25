import { Camera, Cpu, SpeakerHigh, WifiSlash, WifiHigh } from '@phosphor-icons/react';

export interface SystemStatusProps {
  cameraStatus: string;
  aiStatus: string;
  voiceStatus: string;
  isOnline: boolean;
  modelCached: boolean;
}

export function StatusPanel({
  cameraStatus,
  aiStatus,
  voiceStatus,
  isOnline,
  modelCached,
}: SystemStatusProps) {
  return (
    <section aria-label="System Status" className="status-grid">
      <div className="status-item">
        <div className="status-label">
          <Camera size={18} weight="bold" aria-hidden="true" />
          <span>Camera</span>
        </div>
        <div className="status-value">{cameraStatus}</div>
      </div>

      <div className="status-item">
        <div className="status-label">
          <Cpu size={18} weight="bold" aria-hidden="true" />
          <span>AI Detector</span>
        </div>
        <div className="status-value">{aiStatus}</div>
      </div>

      <div className="status-item">
        <div className="status-label">
          <SpeakerHigh size={18} weight="bold" aria-hidden="true" />
          <span>Voice Output</span>
        </div>
        <div className="status-value">{voiceStatus}</div>
      </div>

      <div className="status-item">
        <div className="status-label">
          {isOnline ? (
            <WifiHigh size={18} weight="bold" aria-hidden="true" />
          ) : (
            <WifiSlash size={18} weight="bold" aria-hidden="true" />
          )}
          <span>Offline Readiness</span>
        </div>
        <div className="status-value">
          {isOnline ? 'Online' : 'Offline'} • {modelCached ? 'Model Cached' : 'Model Not Cached'}
        </div>
      </div>
    </section>
  );
}
