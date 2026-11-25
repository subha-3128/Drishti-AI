import { describe, it, expect } from 'vitest';
import { adaptFastDetections } from '../ai/fast/fastDetectorService';
import type { Detection } from '@mediapipe/tasks-vision';

describe('Fast Detector Adapter', () => {
  it('normalizes pixel bounding boxes and maps validated COCO categories', () => {
    const raw: Detection[] = [
      {
        categories: [{ index: 0, score: 0.82, categoryName: 'person', displayName: 'person' }],
        boundingBox: { originX: 64, originY: 48, width: 128, height: 240, angle: 0 },
        keypoints: [],
      },
      {
        categories: [{ index: 1, score: 0.71, categoryName: 'potted plant', displayName: 'potted plant' }],
        boundingBox: { originX: 300, originY: 100, width: 100, height: 150, angle: 0 },
        keypoints: [],
      },
      {
        categories: [{ index: 2, score: 0.9, categoryName: 'tv', displayName: 'tv' }],
        boundingBox: { originX: 10, originY: 10, width: 50, height: 50, angle: 0 },
        keypoints: [],
      },
    ];

    const adapted = adaptFastDetections(raw, 640, 480, 0.4);
    expect(adapted).toHaveLength(2);
    expect(adapted[0]).toMatchObject({
      classId: 'person',
      spokenName: 'Person',
      confidence: 0.82,
      bbox: { x1: 0.1, y1: 0.1, x2: 0.3, y2: 0.6 },
    });
    expect(adapted[1].classId).toBe('obstacle');
  });
});
