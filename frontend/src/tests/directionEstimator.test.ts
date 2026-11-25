import { describe, it, expect } from 'vitest';
import { estimateDirection, formatDirectionPhrase } from '../safety/direction/directionEstimator';

describe('Direction Estimator', () => {
  it('classifies left, center, and right detections accurately', () => {
    expect(estimateDirection({ x1: 0.05, y1: 0.2, x2: 0.25, y2: 0.8 }, 0.85)).toBe('left');
    expect(estimateDirection({ x1: 0.4, y1: 0.2, x2: 0.6, y2: 0.8 }, 0.85)).toBe('center');
    expect(estimateDirection({ x1: 0.72, y1: 0.2, x2: 0.95, y2: 0.8 }, 0.85)).toBe('right');
  });

  it('falls back to ahead when confidence is low or object is very wide', () => {
    expect(estimateDirection({ x1: 0.05, y1: 0.2, x2: 0.25, y2: 0.8 }, 0.3)).toBe('ahead');
    expect(estimateDirection({ x1: 0.05, y1: 0.2, x2: 0.8, y2: 0.9 }, 0.9)).toBe('ahead');
  });

  it('formats crisp spoken direction phrases for fast walking alerts', () => {
    expect(formatDirectionPhrase('left')).toBe('left');
    expect(formatDirectionPhrase('right')).toBe('right');
    expect(formatDirectionPhrase('center')).toBe('center ahead');
    expect(formatDirectionPhrase('ahead')).toBe('ahead');
  });
});
