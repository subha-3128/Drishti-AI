import { describe, it, expect } from 'vitest';
import { computeNextFrameDelayMs } from '../camera/adaptiveScheduler';

describe('Adaptive Frame Scheduler', () => {
  it('slows down when stationary with battery saver enabled and no urgent hazards', () => {
    expect(
      computeNextFrameDelayMs({
        inferenceMs: 900,
        isStationary: true,
        hasUrgentHazard: false,
        batterySaverEnabled: true,
      })
    ).toBeGreaterThanOrEqual(2000);
  });

  it('stays fast when an urgent hazard is present even if stationary', () => {
    expect(
      computeNextFrameDelayMs({
        inferenceMs: 1800,
        isStationary: true,
        hasUrgentHazard: true,
        batterySaverEnabled: true,
      })
    ).toBe(120);
  });

  it('applies thermal backoff when Mirage inference latency spikes', () => {
    expect(
      computeNextFrameDelayMs({
        inferenceMs: 1800,
        isStationary: false,
        hasUrgentHazard: false,
        batterySaverEnabled: true,
      })
    ).toBe(650);
  });
});
