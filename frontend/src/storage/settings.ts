export type ThemeMode = 'high-contrast-dark' | 'high-contrast-light';
export type TextSizeMode = 'default' | 'large' | 'extra';

export interface DrishtiSettings {
  speechRate: number;
  speechVolume: number;
  speechAlertsEnabled: boolean;
  hapticsEnabled: boolean;
  spatialAudioEnabled: boolean;
  scanningTickEnabled: boolean;
  batterySaverEnabled: boolean;
  voiceCommandsEnabled: boolean;
  reducedMotion: boolean;
  textSize: TextSizeMode;
  minConfidence: number;
  cooldownMs: number;
  theme: ThemeMode;
  onboardingCompleted: boolean;
  showCameraPreview: boolean;
}

export const DEFAULT_SETTINGS: DrishtiSettings = {
  speechRate: 1.05,
  speechVolume: 1.0,
  speechAlertsEnabled: true,
  hapticsEnabled: true,
  spatialAudioEnabled: true,
  scanningTickEnabled: true,
  batterySaverEnabled: true,
  voiceCommandsEnabled: false,
  reducedMotion: false,
  textSize: 'default',
  minConfidence: 0.4,
  cooldownMs: 4500,
  theme: 'high-contrast-light',
  onboardingCompleted: false,
  showCameraPreview: false,
};

const STORAGE_KEY = 'drishti_ai_settings_v1';

export function loadSettings(): DrishtiSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<DrishtiSettings>;
    return {
      speechRate: clampNumber(parsed.speechRate, 0.7, 1.6, DEFAULT_SETTINGS.speechRate),
      speechVolume: clampNumber(parsed.speechVolume, 0.2, 1.0, DEFAULT_SETTINGS.speechVolume),
      speechAlertsEnabled: boolOr(parsed.speechAlertsEnabled, DEFAULT_SETTINGS.speechAlertsEnabled),
      hapticsEnabled: boolOr(parsed.hapticsEnabled, DEFAULT_SETTINGS.hapticsEnabled),
      spatialAudioEnabled: boolOr(parsed.spatialAudioEnabled, DEFAULT_SETTINGS.spatialAudioEnabled),
      scanningTickEnabled: boolOr(parsed.scanningTickEnabled, DEFAULT_SETTINGS.scanningTickEnabled),
      batterySaverEnabled: boolOr(parsed.batterySaverEnabled, DEFAULT_SETTINGS.batterySaverEnabled),
      voiceCommandsEnabled: boolOr(parsed.voiceCommandsEnabled, DEFAULT_SETTINGS.voiceCommandsEnabled),
      reducedMotion: boolOr(parsed.reducedMotion, DEFAULT_SETTINGS.reducedMotion),
      textSize:
        parsed.textSize === 'large' || parsed.textSize === 'extra' ? parsed.textSize : 'default',
      minConfidence: clampNumber(parsed.minConfidence, 0.25, 0.85, DEFAULT_SETTINGS.minConfidence),
      cooldownMs: clampNumber(parsed.cooldownMs, 2000, 10000, DEFAULT_SETTINGS.cooldownMs),
      theme: parsed.theme === 'high-contrast-dark' ? 'high-contrast-dark' : 'high-contrast-light',
      onboardingCompleted: Boolean(parsed.onboardingCompleted),
      showCameraPreview: boolOr(parsed.showCameraPreview, DEFAULT_SETTINGS.showCameraPreview),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: DrishtiSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors cleanly; in-memory settings remain active.
  }
}

function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
