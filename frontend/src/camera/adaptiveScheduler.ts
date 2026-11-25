export interface AdaptiveFrameParams {
  inferenceMs: number;
  isStationary: boolean;
  hasUrgentHazard: boolean;
  batterySaverEnabled: boolean;
}

const FAST_ACTIVE_DELAY_MS = 45;
const BASE_DELAY_MS = 70;
const YIELD_DELAY_MS = 60;
const STATIONARY_DELAY_MS = 2200;

/**
 * Computes inter-frame delay to deliver smooth tracking on mobile GPU/CPU,
 * minimize idle gaps on slower CPUs, and conserve battery when standing still.
 */
export function computeNextFrameDelayMs(params: AdaptiveFrameParams): number {
  if (params.hasUrgentHazard) {
    return FAST_ACTIVE_DELAY_MS;
  }
  if (params.batterySaverEnabled && params.isStationary) {
    return STATIONARY_DELAY_MS;
  }
  if (params.inferenceMs <= 250) {
    return FAST_ACTIVE_DELAY_MS;
  }
  if (params.inferenceMs > 1200) {
    return YIELD_DELAY_MS;
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
