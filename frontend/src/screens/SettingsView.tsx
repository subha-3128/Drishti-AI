import { Sliders, Trash } from '@phosphor-icons/react';
import { DrishtiSettings } from '../storage/settings';

interface SettingsViewProps {
  settings: DrishtiSettings;
  onChange: (next: DrishtiSettings) => void;
  onTestVoice: () => void;
  onClearModelCache: () => void;
  modelCached: boolean;
}

export function SettingsView({
  settings,
  onChange,
  onTestVoice,
  onClearModelCache,
  modelCached,
}: SettingsViewProps) {
  return (
    <section className="card" aria-labelledby="settings-title">
      <h2 id="settings-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sliders size={24} weight="bold" aria-hidden="true" />
        <span>Settings</span>
      </h2>

      <div className="setting-row">
        <label htmlFor="speech-rate">
          Speech Rate: <strong>{settings.speechRate.toFixed(2)}x</strong>
        </label>
        <input
          id="speech-rate"
          type="range"
          min={0.7}
          max={1.6}
          step={0.05}
          value={settings.speechRate}
          onChange={(e) => onChange({ ...settings, speechRate: Number(e.target.value) })}
        />
      </div>

      <div className="setting-row">
        <label htmlFor="speech-volume">
          Speech Volume: <strong>{Math.round(settings.speechVolume * 100)}%</strong>
        </label>
        <input
          id="speech-volume"
          type="range"
          min={0.2}
          max={1.0}
          step={0.1}
          value={settings.speechVolume}
          onChange={(e) => onChange({ ...settings, speechVolume: Number(e.target.value) })}
        />
        <button type="button" className="secondary-btn" onClick={onTestVoice}>
          Test Voice Alert
        </button>
      </div>

      <div className="setting-row">
        <label htmlFor="min-confidence">
          Detection Confidence Threshold: <strong>{Math.round(settings.minConfidence * 100)}%</strong>
        </label>
        <input
          id="min-confidence"
          type="range"
          min={0.25}
          max={0.85}
          step={0.05}
          value={settings.minConfidence}
          onChange={(e) => onChange({ ...settings, minConfidence: Number(e.target.value) })}
        />
      </div>

      <div className="setting-row">
        <label htmlFor="cooldown-ms">
          Repeat Alert Cooldown: <strong>{(settings.cooldownMs / 1000).toFixed(1)}s</strong>
        </label>
        <input
          id="cooldown-ms"
          type="range"
          min={2000}
          max={10000}
          step={500}
          value={settings.cooldownMs}
          onChange={(e) => onChange({ ...settings, cooldownMs: Number(e.target.value) })}
        />
      </div>

      <div className="setting-row">
        <label htmlFor="theme-select">Display Contrast Theme</label>
        <select
          id="theme-select"
          value={settings.theme}
          onChange={(e) =>
            onChange({
              ...settings,
              theme: e.target.value === 'high-contrast-light' ? 'high-contrast-light' : 'high-contrast-dark',
            })
          }
          style={{ padding: 10, borderRadius: 8, background: 'var(--color-muted)', color: 'var(--color-foreground)' }}
        >
          <option value="high-contrast-dark">High-Contrast Dark</option>
          <option value="high-contrast-light">High-Contrast Light</option>
        </select>
      </div>

      <div className="setting-row">
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            checked={settings.hapticsEnabled}
            onChange={(e) => onChange({ ...settings, hapticsEnabled: e.target.checked })}
            style={{ width: 22, height: 22 }}
          />
          <span>Enable directional haptic vibration for urgent alerts</span>
        </label>
      </div>

      <div className="setting-row">
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            checked={settings.spatialAudioEnabled}
            onChange={(e) => onChange({ ...settings, spatialAudioEnabled: e.target.checked })}
            style={{ width: 22, height: 22 }}
          />
          <span>Enable 3D stereo directional audio tones (left/right earbud cues)</span>
        </label>
      </div>

      <div className="setting-row">
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            checked={settings.scanningTickEnabled}
            onChange={(e) => onChange({ ...settings, scanningTickEnabled: e.target.checked })}
            style={{ width: 22, height: 22 }}
          />
          <span>Play subtle heartbeat tick on each scan (confirms camera is active)</span>
        </label>
      </div>

      <div className="setting-row">
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            checked={settings.batterySaverEnabled}
            onChange={(e) => onChange({ ...settings, batterySaverEnabled: e.target.checked })}
            style={{ width: 22, height: 22 }}
          />
          <span>Adaptive battery saver (slows scan rate when standing still)</span>
        </label>
      </div>

      <div className="setting-row">
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            checked={settings.voiceCommandsEnabled}
            onChange={(e) => onChange({ ...settings, voiceCommandsEnabled: e.target.checked })}
            style={{ width: 22, height: 22 }}
          />
          <span>Hands-free voice commands via Cactus Whistle (offline mic)</span>
        </label>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-muted-foreground)' }}>
          Supported commands: &ldquo;Start&rdquo;, &ldquo;Pause&rdquo;, &ldquo;Repeat&rdquo;,
          &ldquo;What is ahead&rdquo;, &ldquo;Faster&rdquo;, &ldquo;Slower&rdquo;.
        </div>
      </div>

      <div className="setting-row">
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            checked={settings.showCameraPreview}
            onChange={(e) => onChange({ ...settings, showCameraPreview: e.target.checked })}
            style={{ width: 22, height: 22 }}
          />
          <span>Show live camera preview on screen</span>
        </label>
      </div>

      <div className="setting-row">
        <span>
          Offline Model Cache: <strong>{modelCached ? 'Cached locally' : 'Not cached yet'}</strong>
        </span>
        <button type="button" className="secondary-btn" onClick={onClearModelCache}>
          <Trash size={20} weight="bold" aria-hidden="true" />
          <span>Clear Cached AI Model</span>
        </button>
      </div>
    </section>
  );
}
