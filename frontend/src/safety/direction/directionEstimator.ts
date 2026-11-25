import { NormalizedBBox } from '../../ai/mirage/mirageAdapter';

export type HazardDirection = 'left' | 'center' | 'right' | 'ahead';

const CORRIDOR_LEFT = 0.34;
const CORRIDOR_RIGHT = 0.66;

/**
 * Estimates direction relative to the user's forward walking corridor.
 * Avoids guessing left/right when the object spans wide or confidence is low.
 */
export function estimateDirection(bbox: NormalizedBBox, confidence: number): HazardDirection {
  const width = bbox.x2 - bbox.x1;
  const centerX = (bbox.x1 + bbox.x2) / 2;

  if (confidence < 0.4 || width > 0.65) {
    return 'ahead';
  }

  const overlapsCorridor = bbox.x2 > CORRIDOR_LEFT && bbox.x1 < CORRIDOR_RIGHT;
  if (centerX >= CORRIDOR_LEFT && centerX <= CORRIDOR_RIGHT) {
    return 'center';
  }

  if (centerX < CORRIDOR_LEFT) {
    return overlapsCorridor && bbox.x2 > 0.5 ? 'ahead' : 'left';
  }

  return overlapsCorridor && bbox.x1 < 0.5 ? 'ahead' : 'right';
}

export function formatDirectionPhrase(direction: HazardDirection): string {
  switch (direction) {
    case 'left':
      return 'on your left';
    case 'right':
      return 'on your right';
    case 'center':
      return 'ahead, center';
    case 'ahead':
    default:
      return 'ahead';
  }
}
