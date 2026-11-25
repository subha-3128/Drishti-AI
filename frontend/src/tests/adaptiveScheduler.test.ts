import { describe, it, expect } from 'vitest';
import { computeNextFrameDelayMs } from '../camera/adaptiveScheduler';

describe('Adaptive Frame Scheduler', () => {
  it('runs fast (~20 FPS cadence) when GPU Tier-1 inference is fast and moving', () => {
    expect(
      computeNextFrameDelayMs({
        inferenceMs: 35,
        isStationary: false,
        hasUrgentHazard: false,
        batterySaverEnabled: true,
      })
    ).toBe(45);
  });

  it('slows down when stationary with battery saver enabled and no urgent hazards', () => {
    expect(
      computeNextFrameDelayMs({
        inferenceMs: 35,
        isStationary: true,
        hasUrgentHazard: false,
        batterySaverEnabled: true,
      })
    ).toBeGreaterThanOrEqual(2000);
  });

  it('stays responsive when an urgent hazard is present even if stationary', () => {
    expect(
      computeNextFrameDelayMs({
        inferenceMs: 45,
        isStationary: true,
        hasUrgentHazard: true,
        batterySaverEnabled: true,
      })
    ).toBe(45);
  });
});
