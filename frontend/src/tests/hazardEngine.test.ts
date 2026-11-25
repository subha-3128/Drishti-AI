import { describe, it, expect } from 'vitest';
import { HazardEngine } from '../safety/hazard-engine/hazardEngine';
import { RawDetection } from '../ai/detection/yoloxCodec';

describe('Hazard Engine', () => {
  const personLeft: RawDetection = {
    classId: 'person',
    spokenName: 'Person',
    confidence: 0.8,
    bbox: { x1: 0.05, y1: 0.3, x2: 0.25, y2: 0.8 },
  };

  it('requires temporal validation across frames for non-immediate hazards', () => {
    const engine = new HazardEngine({ minConfidence: 0.45, cooldownMs: 4000 });
    expect(engine.processDetections([personLeft], 1000)).toHaveLength(0);
    const second = engine.processDetections([personLeft], 1200);
    expect(second).toHaveLength(1);
    expect(second[0].message).toBe('Person on your left.');
  });

  it('suppresses repeated alerts within the cooldown window', () => {
    const engine = new HazardEngine({ minConfidence: 0.45, cooldownMs: 4000 });
    engine.processDetections([personLeft], 1000);
    expect(engine.processDetections([personLeft], 1200)).toHaveLength(1);
    expect(engine.processDetections([personLeft], 2000)).toHaveLength(0);
    expect(engine.processDetections([personLeft], 3200)).toHaveLength(0);
    expect(engine.processDetections([personLeft], 4400)).toHaveLength(0);
    expect(engine.processDetections([personLeft], 5500)).toHaveLength(1);
  });

  it('prioritizes P0 critical hazards and suppresses P2/P3 in the same frame', () => {
    const engine = new HazardEngine({ minConfidence: 0.45, cooldownMs: 4000 });
    const closeCar: RawDetection = {
      classId: 'car',
      spokenName: 'Vehicle',
      confidence: 0.85,
      bbox: { x1: 0.3, y1: 0.4, x2: 0.7, y2: 0.9 },
    };
    const bench: RawDetection = {
      classId: 'bench',
      spokenName: 'Obstacle',
      confidence: 0.75,
      bbox: { x1: 0.75, y1: 0.5, x2: 0.9, y2: 0.7 },
    };

    engine.processDetections([bench], 1000);
    const alerts = engine.processDetections([closeCar, bench], 1150);
    expect(alerts.some((a) => a.priority === 'P0')).toBe(true);
    expect(alerts.some((a) => a.priority === 'P2')).toBe(false);
  });

  it('suppresses tiny distant background detections to avoid alert fatigue', () => {
    const engine = new HazardEngine({ minConfidence: 0.45, cooldownMs: 4000 });
    const tinyPerson: RawDetection = {
      classId: 'person',
      spokenName: 'Person',
      confidence: 0.6,
      bbox: { x1: 0.45, y1: 0.4, x2: 0.5, y2: 0.5 }, // area = 0.005 < 0.012
    };
    engine.processDetections([tinyPerson], 1000);
    expect(engine.processDetections([tinyPerson], 1150)).toHaveLength(0);
  });
});
