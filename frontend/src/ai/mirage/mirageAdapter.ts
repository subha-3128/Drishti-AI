import { mapMirageLabel } from './mirageRegistry';

export interface NormalizedBBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface MirageDetection {
  id: number;
  rawLabel: string;
  classId: string;
  spokenName: string;
  confidence: number;
  bbox: NormalizedBBox;
}

interface RawMiragePayload {
  objects?: Array<{
    id?: unknown;
    name?: unknown;
    bbox?: unknown;
    score?: unknown;
  }>;
}

export function computeIoU(a: NormalizedBBox, b: NormalizedBBox): number {
  const ix1 = Math.max(a.x1, b.x1);
  const iy1 = Math.max(a.y1, b.y1);
  const ix2 = Math.min(a.x2, b.x2);
  const iy2 = Math.min(a.y2, b.y2);

  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  if (inter <= 0) return 0;

  const areaA = Math.max(0, a.x2 - a.x1) * Math.max(0, a.y2 - a.y1);
  const areaB = Math.max(0, b.x2 - b.x1) * Math.max(0, b.y2 - b.y1);
  const union = areaA + areaB - inter;
  return union > 0 ? inter / union : 0;
}

/**
 * Parses and validates Cactus Mirage JSON output (`cactus_describe`),
 * normalizes [0..1000] bounding boxes to [0..1], maps to enabled hazard categories,
 * and deduplicates overlapping detections of the same category (e.g. pickup truck + white pickup truck).
 */
export function adaptMirageOutput(rawJson: string, minConfidence: number): MirageDetection[] {
  const trimmed = rawJson.trim();
  if (!trimmed) return [];

  let parsed: RawMiragePayload;
  try {
    parsed = JSON.parse(trimmed) as RawMiragePayload;
  } catch {
    throw new Error('Malformed JSON returned by Cactus Mirage.');
  }

  if (!parsed || !Array.isArray(parsed.objects)) {
    throw new Error('Unexpected Cactus Mirage output structure: missing objects array.');
  }

  const candidates: MirageDetection[] = [];
  for (const item of parsed.objects) {
    if (!item || typeof item.name !== 'string' || !Array.isArray(item.bbox) || item.bbox.length !== 4) {
      continue;
    }
    const score = typeof item.score === 'number' && Number.isFinite(item.score) ? item.score : null;
    if (score === null || score < minConfidence || score > 1) {
      continue;
    }

    const cfg = mapMirageLabel(item.name);
    if (!cfg) continue;

    const coords = item.bbox;
    if (!coords.every((n): n is number => typeof n === 'number' && Number.isFinite(n))) {
      continue;
    }

    const x1 = clamp01(coords[0] / 1000);
    const y1 = clamp01(coords[1] / 1000);
    const x2 = clamp01(coords[2] / 1000);
    const y2 = clamp01(coords[3] / 1000);
    if (x2 <= x1 || y2 <= y1) continue;

    candidates.push({
      id: typeof item.id === 'number' ? item.id : candidates.length + 1,
      rawLabel: item.name.trim(),
      classId: cfg.id,
      spokenName: cfg.spokenName,
      confidence: score,
      bbox: { x1, y1, x2, y2 },
    });
  }

  // Class-aware NMS so duplicate descriptions of the same object (e.g., "pickup truck" & "white pickup truck") collapse.
  const sorted = candidates.sort((a, b) => b.confidence - a.confidence);
  const kept: MirageDetection[] = [];
  for (const det of sorted) {
    const duplicate = kept.some((existing) => existing.classId === det.classId && computeIoU(existing.bbox, det.bbox) > 0.5);
    if (!duplicate) {
      kept.push(det);
    }
  }
  return kept;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
