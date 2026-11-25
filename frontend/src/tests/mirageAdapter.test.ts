import { describe, it, expect } from 'vitest';
import { adaptMirageOutput } from '../ai/mirage/mirageAdapter';
import { mapMirageLabel } from '../ai/mirage/mirageRegistry';

describe('Mirage Adapter & Registry', () => {
  it('maps open-vocabulary Mirage labels, normalizes bboxes, and deduplicates overlapping vehicles', () => {
    const raw = JSON.stringify({
      objects: [
        { id: 1, name: 'pickup truck', bbox: [599, 144, 916, 287], score: 0.513 },
        { id: 2, name: 'white pickup truck', bbox: [620, 147, 957, 290], score: 0.521 },
        { id: 3, name: 'soccer player', bbox: [162, 222, 821, 962], score: 0.817 },
        { id: 4, name: 'pothole', bbox: [100, 500, 300, 700], score: 0.9 }, // disabled until validated
        { id: 5, name: 'wooden deck', bbox: [9, 254, 997, 725], score: 0.385 }, // background scenery
      ],
    });

    const dets = adaptMirageOutput(raw, 0.35);
    expect(dets).toHaveLength(2);
    expect(dets[0].classId).toBe('person');
    expect(dets[0].confidence).toBeCloseTo(0.817, 3);
    expect(dets[1].classId).toBe('truck');
    expect(dets[1].confidence).toBeCloseTo(0.521, 3);
    expect(dets[1].bbox.x1).toBeCloseTo(0.62, 2);
  });

  it('keeps unvalidated Indian road hazards disabled and handles plural labels', () => {
    expect(mapMirageLabel('pothole')).toBeNull();
    expect(mapMirageLabel('open drain')).toBeNull();
    expect(mapMirageLabel('broken footpath')).toBeNull();
    expect(mapMirageLabel('stairs')?.id).toBe('stairs');
    expect(mapMirageLabel('cars')?.id).toBe('vehicle');
    expect(mapMirageLabel('dogs')?.id).toBe('dog');
    expect(mapMirageLabel('trees')?.id).toBe('tree');
  });

  it('throws on malformed Mirage JSON or missing objects array', () => {
    expect(() => adaptMirageOutput('{bad json', 0.35)).toThrow(/Malformed JSON/i);
    expect(() => adaptMirageOutput('{"foo":1}', 0.35)).toThrow(/missing objects/i);
    expect(adaptMirageOutput('', 0.35)).toEqual([]);
  });
});
