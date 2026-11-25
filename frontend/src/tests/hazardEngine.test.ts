import { describe, it, expect } from 'vitest';
import { HazardEngine } from '../safety/hazard-engine/hazardEngine';
import { MirageDetection } from '../ai/mirage/mirageAdapter';

describe('Hazard Engine', () => {
  const personLeft: MirageDetection = {
    id: 1,
    rawLabel: 'person',
    classId: 'person',
    spokenName: 'Person',
    confidence: 0.8,
    bbox: { x1: 0.05, y1: 0.3, x2: 0.25, y2: 0.8 },
  };

  it('requires temporal validation across frames for non-immediate hazards', () => {
    const engine = new HazardEngine({ minConfidence: 0.4, cooldownMs: 4000 });
    expect(engine.processDetections([personLeft], 1000)).toHaveLength(0);
    const second = engine.processDetections([personLeft], 1400);
    expect(second).toHaveLength(1);
    expect(second[0].message).toBe('Person on your left.');
  });

  it('suppresses repeated alerts within the cooldown window', () => {
    const engine = new HazardEngine({ minConfidence: 0.4, cooldownMs: 4000 });
    engine.processDetections([personLeft], 1000);
    expect(engine.processDetections([personLeft], 1400)).toHaveLength(1);
    expect(engine.processDetections([personLeft], 2500)).toHaveLength(0);
    expect(engine.processDetections([personLeft], 3800)).toHaveLength(0);
    expect(engine.processDetections([personLeft], 5600)).toHaveLength(1);
  });

  it('prioritizes P0 critical immediate path hazards and suppresses P2/P3 in the same frame', () => {
    const engine = new HazardEngine({ minConfidence: 0.4, cooldownMs: 4000 });
    const closeVehicle: MirageDetection = {
      id: 2,
      rawLabel: 'car',
      classId: 'vehicle',
      spokenName: 'Vehicle',
      confidence: 0.85,
      bbox: { x1: 0.25, y1: 0.35, x2: 0.75, y2: 0.9 },
    };
    const barrier: MirageDetection = {
      id: 3,
      rawLabel: 'barrier',
      classId: 'barrier',
      spokenName: 'Barrier',
      confidence: 0.75,
      bbox: { x1: 0.75, y1: 0.5, x2: 0.9, y2: 0.7 },
    };

    engine.processDetections([barrier], 1000);
    const alerts = engine.processDetections([closeVehicle, barrier], 1200);
    expect(alerts.some((a) => a.priority === 'P0')).toBe(true);
    expect(alerts.some((a) => a.priority === 'P2')).toBe(false);
    expect(alerts[0].message).not.toContain('approaching');
  });

  it('suppresses tiny distant background detections to avoid alert fatigue', () => {
    const engine = new HazardEngine({ minConfidence: 0.4, cooldownMs: 4000 });
    const tinyPerson: MirageDetection = {
      id: 4,
      rawLabel: 'person',
      classId: 'person',
      spokenName: 'Person',
      confidence: 0.6,
      bbox: { x1: 0.45, y1: 0.4, x2: 0.5, y2: 0.5 },
    };
    engine.processDetections([tinyPerson], 1000);
    expect(engine.processDetections([tinyPerson], 1300)).toHaveLength(0);
  });
});
