export interface AdaptiveFrameParams {
  inferenceMs: number;
  isStationary: boolean;
  hasUrgentHazard: boolean;
  batterySaverEnabled: boolean;
}

const MIN_DELAY_MS = 60;
const BASE_DELAY_MS = 140;
const STATIONARY_DELAY_MS = 2200;

/**
 * Computes inter-frame delay to maximize walking responsiveness on slower mobile devices
 * while still dialing down cadence when standing still with battery saver enabled.
 */
export function computeNextFrameDelayMs(params: AdaptiveFrameParams): number {
  if (params.hasUrgentHazard) {
    return MIN_DELAY_MS;
  }
  if (params.batterySaverEnabled && params.isStationary) {
    return STATIONARY_DELAY_MS;
  }
  if (params.inferenceMs > 1200) {
    // Yield briefly for UI/TTS events without adding hundreds of ms of extra blind wait time.
    return MIN_DELAY_MS;
  }
  return BASE_DELAY_MS;
}

const STATIONARY_WINDOW_MS = 5000;
const MOTION_THRESHOLD_MS2 = 0.45;

/**
 * Tracks pedestrian motion using DeviceMotionEvent when available.
 * Defaults to moving (isStationary = false) if sensors are unavailable so hazard detection never stalls.
 */
export class MotionMonitor {
  private lastMotionAt = 0;
  private started = false;
  private listener: ((event: DeviceMotionEvent) => void) | null = null;

  start(): void {
    if (this.started || typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return;
    this.lastMotionAt = performance.now();
    this.started = true;
    this.listener = (event: DeviceMotionEvent) => {
      const acc = event.acceleration;
      if (!acc) return;
      const mag = Math.hypot(acc.x ?? 0, acc.y ?? 0, acc.z ?? 0);
      if (mag >= MOTION_THRESHOLD_MS2) {
        this.lastMotionAt = performance.now();
      }
    };
    window.addEventListener('devicemotion', this.listener);
  }

  isStationary(now = performance.now()): boolean {
    if (!this.started || !this.listener) return false;
    return now - this.lastMotionAt >= STATIONARY_WINDOW_MS;
  }

  stop(): void {
    if (this.listener && typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.listener);
    }
    this.listener = null;
    this.started = false;
  }
}
