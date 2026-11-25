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

  it('stays responsive when an urgent hazard is present even if stationary', () => {
    expect(
      computeNextFrameDelayMs({
        inferenceMs: 2500,
        isStationary: true,
        hasUrgentHazard: true,
        batterySaverEnabled: true,
      })
    ).toBe(60);
  });

  it('minimizes inter-frame idle wait when moving on slower mobile CPUs', () => {
    expect(
      computeNextFrameDelayMs({
        inferenceMs: 2500,
        isStationary: false,
        hasUrgentHazard: false,
        batterySaverEnabled: true,
      })
    ).toBe(60);
  });
});
