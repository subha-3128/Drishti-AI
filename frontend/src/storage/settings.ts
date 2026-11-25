export type ThemeMode = 'high-contrast-dark' | 'high-contrast-light';

export interface DrishtiSettings {
  speechRate: number;
  speechVolume: number;
  hapticsEnabled: boolean;
  minConfidence: number;
  cooldownMs: number;
  theme: ThemeMode;
  onboardingCompleted: boolean;
  showCameraPreview: boolean;
}

export const DEFAULT_SETTINGS: DrishtiSettings = {
  speechRate: 1.05,
  speechVolume: 1.0,
  hapticsEnabled: true,
  minConfidence: 0.45,
  cooldownMs: 4500,
  theme: 'high-contrast-dark',
  onboardingCompleted: false,
  showCameraPreview: true,
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
      hapticsEnabled: typeof parsed.hapticsEnabled === 'boolean' ? parsed.hapticsEnabled : DEFAULT_SETTINGS.hapticsEnabled,
      minConfidence: clampNumber(parsed.minConfidence, 0.25, 0.85, DEFAULT_SETTINGS.minConfidence),
      cooldownMs: clampNumber(parsed.cooldownMs, 2000, 10000, DEFAULT_SETTINGS.cooldownMs),
      theme: parsed.theme === 'high-contrast-light' ? 'high-contrast-light' : 'high-contrast-dark',
      onboardingCompleted: Boolean(parsed.onboardingCompleted),
      showCameraPreview: typeof parsed.showCameraPreview === 'boolean' ? parsed.showCameraPreview : DEFAULT_SETTINGS.showCameraPreview,
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

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
