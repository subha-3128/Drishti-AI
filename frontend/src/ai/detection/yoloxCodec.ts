import { COCO_80_LABELS, getActiveHazardConfig } from './classRegistry';

export const YOLOX_INPUT_SIZE = 416;
const STRIDES = [8, 16, 32] as const;

export interface RawDetection {
  classId: string;
  spokenName: string;
  confidence: number;
  /** Normalized [0..1] bounding box in source image coordinates */
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
}

export interface LetterboxMeta {
  scale: number;
  srcWidth: number;
  srcHeight: number;
}

/**
 * Letterboxes an RGBA ImageData buffer into YOLOX's [1, 3, 416, 416] BGR float32 tensor.
 * Uses top-left alignment with 114 padding, matching Megvii YOLOX ONNX export.
 */
export function preprocessForYolox(
  rgba: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number
): { tensorData: Float32Array; meta: LetterboxMeta } {
  const size = YOLOX_INPUT_SIZE;
  const scale = Math.min(size / srcWidth, size / srcHeight);
  const resizedW = Math.round(srcWidth * scale);
  const resizedH = Math.round(srcHeight * scale);

  const channelSize = size * size;
  const tensorData = new Float32Array(3 * channelSize);
  tensorData.fill(114);

  for (let y = 0; y < resizedH; y++) {
    const srcY = Math.min(srcHeight - 1, Math.floor(y / scale));
    const rowOffset = y * size;
    const srcRowOffset = srcY * srcWidth;

    for (let x = 0; x < resizedW; x++) {
      const srcX = Math.min(srcWidth - 1, Math.floor(x / scale));
      const rgbaIdx = (srcRowOffset + srcX) * 4;
      const dstIdx = rowOffset + x;

      // YOLOX expects BGR order in [0..255]
      tensorData[dstIdx] = rgba[rgbaIdx + 2];
      tensorData[channelSize + dstIdx] = rgba[rgbaIdx + 1];
      tensorData[2 * channelSize + dstIdx] = rgba[rgbaIdx];
    }
  }

  return {
    tensorData,
    meta: { scale, srcWidth, srcHeight },
  };
}

/**
 * Decodes YOLOX [1, 3549, 85] raw output, filters to active hazard classes, and applies NMS.
 */
export function decodeYoloxOutput(
  output: Float32Array,
  meta: LetterboxMeta,
  minConfidence: number,
  iouThreshold = 0.45
): RawDetection[] {
  const numClasses = 80;
  const strideEntrySize = 5 + numClasses;
  const candidates: RawDetection[] = [];

  let offset = 0;
  for (const stride of STRIDES) {
    const gridDim = YOLOX_INPUT_SIZE / stride;
    for (let gy = 0; gy < gridDim; gy++) {
      for (let gx = 0; gx < gridDim; gx++) {
        const base = offset * strideEntrySize;
        offset++;

        const objConf = output[base + 4];
        if (objConf < minConfidence) continue;

        let bestClassIdx = -1;
        let bestClassScore = 0;
        for (let c = 0; c < numClasses; c++) {
          const score = output[base + 5 + c];
          if (score > bestClassScore) {
            bestClassScore = score;
            bestClassIdx = c;
          }
        }

        const confidence = objConf * bestClassScore;
        if (confidence < minConfidence || bestClassIdx < 0) continue;

        const cocoLabel = COCO_80_LABELS[bestClassIdx];
        const hazardCfg = getActiveHazardConfig(cocoLabel);
        if (!hazardCfg) continue;

        const cx = (output[base] + gx) * stride;
        const cy = (output[base + 1] + gy) * stride;
        const w = Math.exp(output[base + 2]) * stride;
        const h = Math.exp(output[base + 3]) * stride;

        const x1 = clamp01((cx - w / 2) / meta.scale / meta.srcWidth);
        const y1 = clamp01((cy - h / 2) / meta.scale / meta.srcHeight);
        const x2 = clamp01((cx + w / 2) / meta.scale / meta.srcWidth);
        const y2 = clamp01((cy + h / 2) / meta.scale / meta.srcHeight);

        if (x2 <= x1 || y2 <= y1) continue;

        candidates.push({
          classId: hazardCfg.id,
          spokenName: hazardCfg.spokenName,
          confidence,
          bbox: { x1, y1, x2, y2 },
        });
      }
    }
  }

  return nonMaxSuppression(candidates, iouThreshold);
}

export function computeIoU(a: RawDetection['bbox'], b: RawDetection['bbox']): number {
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

function nonMaxSuppression(detections: RawDetection[], iouThreshold: number): RawDetection[] {
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const kept: RawDetection[] = [];

  for (const det of sorted) {
    let suppressed = false;
    for (const existing of kept) {
      const iou = computeIoU(existing.bbox, det.bbox);
      // Suppress same-class overlaps at iouThreshold, and cross-class overlaps (e.g. car+truck) at 0.65.
      const limit = existing.classId === det.classId ? iouThreshold : Math.max(iouThreshold, 0.65);
      if (iou > limit) {
        suppressed = true;
        break;
      }
    }
    if (!suppressed) {
      kept.push(det);
    }
  }
  return kept;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
