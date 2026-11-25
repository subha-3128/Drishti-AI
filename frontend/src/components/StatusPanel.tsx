import {
  Camera,
  CaretRight,
  CheckCircle,
  Cpu,
  Microphone,
  SpeakerHigh,
  WifiHigh,
  WifiSlash,
} from '@phosphor-icons/react';

export interface SystemStatusProps {
  cameraStatus: string;
  aiStatus: string;
  voiceStatus: string;
  voiceCommandStatus: string;
  isOnline: boolean;
  modelCached: boolean;
  onOpenOfflineStatus?: () => void;
}

export function StatusPanel({
  cameraStatus,
  aiStatus,
  voiceStatus,
  voiceCommandStatus,
  isOnline,
  modelCached,
  onOpenOfflineStatus,
}: SystemStatusProps) {
  return (
    <section aria-label="System Status" className="status-list">
      <div className="status-row">
        <div className="status-row-left">
          <Camera size={22} weight="bold" color="var(--color-secondary)" aria-hidden="true" />
          <span>Camera</span>
        </div>
        <span className="status-row-right">
          <CheckCircle size={18} weight="bold" aria-hidden="true" />
          <span>{cameraStatus}</span>
        </span>
      </div>

      <div className="status-row">
        <div className="status-row-left">
          <Cpu size={22} weight="bold" color="var(--color-secondary)" aria-hidden="true" />
          <span>Vision Engine</span>
        </div>
        <span className="status-row-right">{aiStatus}</span>
      </div>

      <div className="status-row">
        <div className="status-row-left">
          <SpeakerHigh size={22} weight="bold" color="var(--color-secondary)" aria-hidden="true" />
          <span>Audio Alerts</span>
        </div>
        <span className="status-row-right">{voiceStatus}</span>
      </div>

      <div className="status-row">
        <div className="status-row-left">
          <Microphone size={22} weight="bold" color="var(--color-secondary)" aria-hidden="true" />
          <span>Voice Commands</span>
        </div>
        <span
          className={`status-row-right ${
            voiceCommandStatus === 'Disabled' ? 'status-row-right--muted' : ''
          }`}
        >
          {voiceCommandStatus}
        </span>
      </div>

      <button
        type="button"
        className="status-row"
        onClick={onOpenOfflineStatus}
        aria-label="Open Model and Offline Status details"
      >
        <div className="status-row-left">
          {isOnline ? (
            <WifiHigh size={22} weight="bold" color="var(--color-secondary)" aria-hidden="true" />
          ) : (
            <WifiSlash size={22} weight="bold" color="var(--color-tertiary)" aria-hidden="true" />
          )}
          <span>Offline Mode</span>
        </div>
        <span className="status-row-right">
          <span>
            {isOnline ? 'Online' : 'Offline'} • {modelCached ? 'Cached' : 'Ready'}
          </span>
          <CaretRight size={18} weight="bold" color="var(--color-muted-foreground)" aria-hidden="true" />
        </span>
      </button>
    </section>
  );
}
