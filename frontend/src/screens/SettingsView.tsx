import { CaretRight, ShieldCheck } from '@phosphor-icons/react';
import { DrishtiSettings, TextSizeMode } from '../storage/settings';

interface SettingsViewProps {
  settings: DrishtiSettings;
  onChange: (next: DrishtiSettings) => void;
  onTestVoice: () => void;
  onOpenOfflineStatus: () => void;
  modelCached: boolean;
}

function ToggleSwitch({
  id,
  label,
  description,
  checked,
  onToggle,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="setting-switch-row">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontWeight: 600, fontSize: '1rem' }}>{label}</span>
        {description && (
          <span style={{ fontSize: '0.88rem', color: 'var(--color-muted-foreground)' }}>
            {description}
          </span>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onToggle(!checked)}
        className="switch-track"
      >
        <span className="switch-thumb" />
      </button>
    </label>
  );
}

export function SettingsView({
  settings,
  onChange,
  onTestVoice,
  onOpenOfflineStatus,
  modelCached,
}: SettingsViewProps) {
  const isDark = settings.theme === 'high-contrast-dark';

  const setTextSize = (size: TextSizeMode) => onChange({ ...settings, textSize: size });

  return (
    <main className="app-main" aria-labelledby="settings-title">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 id="settings-title" className="headline-page">
          Settings
        </h2>
        <span className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--color-muted-foreground)' }}>
          v1.0.0
        </span>
      </div>

      {/* Appearance */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-labelledby="sec-theme">
        <h3 id="sec-theme" className="section-heading">
          Appearance
        </h3>
        <div
          className="setting-card"
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>Theme</div>
            <div style={{ fontSize: '0.88rem', color: 'var(--color-muted-foreground)' }}>
              {isDark ? 'Dark (Royal Obsidian)' : 'Light (Royal Ivory)'}
            </div>
          </div>
          <div className="segmented-group" role="group" aria-label="Theme mode">
            <button
              type="button"
              className="segmented-btn"
              aria-pressed={!isDark}
              onClick={() => onChange({ ...settings, theme: 'high-contrast-light' })}
            >
              Ivory
            </button>
            <button
              type="button"
              className="segmented-btn"
              aria-pressed={isDark}
              onClick={() => onChange({ ...settings, theme: 'high-contrast-dark' })}
            >
              Obsidian
            </button>
          </div>
        </div>
      </section>

      {/* Audio Settings */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-labelledby="sec-audio">
        <h3 id="sec-audio" className="section-heading">
          Audio &amp; Feedback
        </h3>

        <ToggleSwitch
          id="speech-alerts-toggle"
          label="Speech alerts"
          description="Speak obstacle alerts aloud during assistance."
          checked={settings.speechAlertsEnabled}
          onToggle={(v) => onChange({ ...settings, speechAlertsEnabled: v })}
        />

        <div className="setting-card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <label htmlFor="speech-rate" style={{ fontWeight: 600 }}>
              Speech rate
            </label>
            <span className="font-mono" style={{ color: 'var(--color-tertiary)' }}>
              {settings.speechRate.toFixed(2)}×
            </span>
          </div>
          <input
            id="speech-rate"
            type="range"
            className="range-input"
            min={0.7}
            max={1.6}
            step={0.05}
            value={settings.speechRate}
            onChange={(e) => onChange({ ...settings, speechRate: Number(e.target.value) })}
          />
        </div>

        <div className="setting-card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <label htmlFor="speech-volume" style={{ fontWeight: 600 }}>
              Speech volume
            </label>
            <span className="font-mono" style={{ color: 'var(--color-tertiary)' }}>
              {Math.round(settings.speechVolume * 100)}%
            </span>
          </div>
          <input
            id="speech-volume"
            type="range"
            className="range-input"
            min={0.2}
            max={1.0}
            step={0.1}
            value={settings.speechVolume}
            onChange={(e) => onChange({ ...settings, speechVolume: Number(e.target.value) })}
          />
          <button type="button" className="btn-secondary-ivory" onClick={onTestVoice}>
            Test Voice Alert
          </button>
        </div>

        <ToggleSwitch
          id="spatial-audio-toggle"
          label="3D stereo directional chimes"
          description="Plays left/right earbud cues before spoken warnings."
          checked={settings.spatialAudioEnabled}
          onToggle={(v) => onChange({ ...settings, spatialAudioEnabled: v })}
        />

        <ToggleSwitch
          id="scan-tick-toggle"
          label="Scanning heartbeat pulse"
          description="Subtle tick every 2s while scanning to confirm app is active."
          checked={settings.scanningTickEnabled}
          onToggle={(v) => onChange({ ...settings, scanningTickEnabled: v })}
        />

        <ToggleSwitch
          id="haptics-toggle"
          label="Directional vibration alerts"
          description="Left/right/urgent haptic patterns where hardware supports it."
          checked={settings.hapticsEnabled}
          onToggle={(v) => onChange({ ...settings, hapticsEnabled: v })}
        />
      </section>

      {/* Accessibility */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-labelledby="sec-a11y">
        <h3 id="sec-a11y" className="section-heading">
          Accessibility
        </h3>

        <div className="setting-card">
          <span style={{ fontWeight: 600 }}>Text size</span>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}
            role="group"
            aria-label="Text size"
          >
            {(['default', 'large', 'extra'] as TextSizeMode[]).map((sz) => {
              const active = settings.textSize === sz;
              return (
                <button
                  key={sz}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTextSize(sz)}
                  style={{
                    minHeight: 46,
                    borderRadius: 12,
                    fontWeight: 600,
                    background: active ? 'var(--color-primary)' : 'var(--color-surface-high)',
                    color: active ? 'var(--color-on-primary)' : 'var(--color-foreground)',
                    border: active
                      ? '2px solid var(--color-tertiary)'
                      : '1px solid var(--color-border)',
                  }}
                >
                  {sz === 'default' ? 'Default' : sz === 'large' ? 'Large' : 'Extra'}
                </button>
              );
            })}
          </div>
        </div>

        <ToggleSwitch
          id="reduced-motion-toggle"
          label="Reduced motion"
          checked={settings.reducedMotion}
          onToggle={(v) => onChange({ ...settings, reducedMotion: v })}
        />
      </section>

      {/* Vision & Offline AI */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-labelledby="sec-vision">
        <h3 id="sec-vision" className="section-heading">
          Vision &amp; Voice AI
        </h3>

        <ToggleSwitch
          id="voice-commands-toggle"
          label="Cactus Whistle voice commands"
          description='Offline mic: say "Start", "Pause", "Repeat", "Ahead", "Faster", "Slower".'
          checked={settings.voiceCommandsEnabled}
          onToggle={(v) => onChange({ ...settings, voiceCommandsEnabled: v })}
        />

        <ToggleSwitch
          id="battery-saver-toggle"
          label="Adaptive battery saver"
          description="Reduces scan cadence when standing still with no urgent hazards."
          checked={settings.batterySaverEnabled}
          onToggle={(v) => onChange({ ...settings, batterySaverEnabled: v })}
        />

        <ToggleSwitch
          id="preview-toggle-setting"
          label="Show live camera preview"
          description="Recommended off when walking eyes-free to save battery."
          checked={settings.showCameraPreview}
          onToggle={(v) => onChange({ ...settings, showCameraPreview: v })}
        />

        <div className="setting-card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <label htmlFor="min-confidence" style={{ fontWeight: 600 }}>
              Detection confidence
            </label>
            <span className="font-mono" style={{ color: 'var(--color-tertiary)' }}>
              {Math.round(settings.minConfidence * 100)}%
            </span>
          </div>
          <input
            id="min-confidence"
            type="range"
            className="range-input"
            min={0.25}
            max={0.85}
            step={0.05}
            value={settings.minConfidence}
            onChange={(e) => onChange({ ...settings, minConfidence: Number(e.target.value) })}
          />
        </div>

        <div className="setting-card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <label htmlFor="cooldown-ms" style={{ fontWeight: 600 }}>
              Repeat alert cooldown
            </label>
            <span className="font-mono" style={{ color: 'var(--color-tertiary)' }}>
              {(settings.cooldownMs / 1000).toFixed(1)}s
            </span>
          </div>
          <input
            id="cooldown-ms"
            type="range"
            className="range-input"
            min={2000}
            max={10000}
            step={500}
            value={settings.cooldownMs}
            onChange={(e) => onChange({ ...settings, cooldownMs: Number(e.target.value) })}
          />
        </div>

        <button type="button" className="status-row" onClick={onOpenOfflineStatus}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontWeight: 600 }}>Offline Models &amp; Cache</span>
            <span style={{ fontSize: '0.88rem', color: 'var(--color-secondary)' }}>
              {modelCached ? 'Verified locally (~43 MB)' : 'Ready to cache on first run'}
            </span>
          </div>
          <CaretRight size={20} weight="bold" color="var(--color-muted-foreground)" aria-hidden="true" />
        </button>
      </section>

      {/* Privacy & About */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-labelledby="sec-privacy">
        <h3 id="sec-privacy" className="section-heading">
          Privacy &amp; About
        </h3>
        <div className="setting-card" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <ShieldCheck
            size={24}
            weight="bold"
            color="var(--color-secondary)"
            style={{ flexShrink: 0, marginTop: 2 }}
            aria-hidden="true"
          />
          <div>
            <div style={{ fontWeight: 600 }}>On-device processing only</div>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--color-muted-foreground)' }}>
              Camera frames and microphone audio run locally in WebAssembly/WebGL. Nothing is
              uploaded to cloud servers.
            </p>
          </div>
        </div>
        <div className="setting-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem' }}>
            <span style={{ color: 'var(--color-muted-foreground)' }}>Tier 1 Reflex</span>
            <span className="font-mono">efficientdet_lite0.tflite</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem' }}>
            <span style={{ color: 'var(--color-muted-foreground)' }}>Tier 2 Scene</span>
            <span className="font-mono">mirage.cact</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem' }}>
            <span style={{ color: 'var(--color-muted-foreground)' }}>Voice Commands</span>
            <span className="font-mono">whistle.cact</span>
          </div>
        </div>
      </section>
    </main>
  );
}
