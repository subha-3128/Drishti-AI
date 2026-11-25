import { Detection, FilesetResolver, ObjectDetector } from '@mediapipe/tasks-vision';
import { loadManifest, loadVerifiedModelBytes } from '../inference/modelCache';
import { MirageDetection } from '../mirage/mirageAdapter';
import { mapMirageLabel } from '../mirage/mirageRegistry';

export interface FastInferenceResult {
  detections: MirageDetection[];
  inferenceMs: number;
}

export function adaptFastDetections(
  detections: Detection[],
  frameWidth: number,
  frameHeight: number,
  minConfidence: number
): MirageDetection[] {
  if (frameWidth <= 0 || frameHeight <= 0) return [];

  const adapted: MirageDetection[] = [];
  for (let i = 0; i < detections.length; i++) {
    const det = detections[i];
    const box = det.boundingBox;
    const topCat = det.categories?.[0];
    if (!box || !topCat) continue;

    const score = topCat.score;
    if (!Number.isFinite(score) || score < minConfidence) continue;

    const mapped = mapMirageLabel(topCat.categoryName);
    if (!mapped) continue;

    const x1 = clamp01(box.originX / frameWidth);
    const y1 = clamp01(box.originY / frameHeight);
    const x2 = clamp01((box.originX + box.width) / frameWidth);
    const y2 = clamp01((box.originY + box.height) / frameHeight);
    if (x2 <= x1 || y2 <= y1) continue;

    adapted.push({
      id: i + 1,
      rawLabel: topCat.categoryName,
      classId: mapped.id,
      spokenName: mapped.spokenName,
      confidence: score,
      bbox: { x1, y1, x2, y2 },
    });
  }
  return adapted;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export class FastDetectorService {
  private detector: ObjectDetector | null = null;
  private delegate: 'GPU' | 'CPU' = 'GPU';
  private modelName = 'EfficientDet-Lite0';
  private lastTimestampMs = 0;
  private lastScoreThreshold = 0.35;

  isReady(): boolean {
    return this.detector !== null;
  }

  getStatusSummary(): string {
    return `${this.modelName} (${this.delegate})`;
  }

  async initialize(signal?: AbortSignal, minConfidence = 0.35): Promise<string> {
    if (signal?.aborted) throw new Error('Fast detector initialization cancelled.');
    if (this.detector) return this.getStatusSummary();

    const manifest = await loadManifest();
    if (signal?.aborted) throw new Error('Fast detector initialization cancelled.');

    const entry = manifest.models.find((m) => m.id === 'mediapipe-efficientdet-v1');
    if (!entry) {
      throw new Error('Fast detector entry missing from model manifest.');
    }
    this.modelName = entry.name;

    const modelBytes = await loadVerifiedModelBytes(entry);
    if (signal?.aborted) throw new Error('Fast detector initialization cancelled.');

    const vision = await FilesetResolver.forVisionTasks('/mediapipe');
    if (signal?.aborted) throw new Error('Fast detector initialization cancelled.');

    this.lastScoreThreshold = minConfidence;
    this.lastTimestampMs = 0;

    try {
      this.detector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetBuffer: new Uint8Array(modelBytes.slice(0)),
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        maxResults: 8,
        scoreThreshold: minConfidence,
      });
      this.delegate = 'GPU';
    } catch {
      if (signal?.aborted) throw new Error('Fast detector initialization cancelled.');
      this.detector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetBuffer: new Uint8Array(modelBytes.slice(0)),
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        maxResults: 8,
        scoreThreshold: minConfidence,
      });
      this.delegate = 'CPU';
    }

    if (signal?.aborted) {
      this.terminate();
      throw new Error('Fast detector initialization cancelled.');
    }
    return this.getStatusSummary();
  }

  async detectVideo(video: HTMLVideoElement, minConfidence: number): Promise<FastInferenceResult | null> {
    if (!this.detector || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return null;
    }
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width <= 0 || height <= 0) return null;

    if (Math.abs(minConfidence - this.lastScoreThreshold) >= 0.04) {
      this.lastScoreThreshold = minConfidence;
      await this.detector.setOptions({ scoreThreshold: minConfidence });
    }

    const t0 = performance.now();
    // MediaPipe VIDEO mode strictly requires monotonically increasing timestamps.
    const ts = Math.max(this.lastTimestampMs + 1, Math.round(t0));
    this.lastTimestampMs = ts;

    const result = this.detector.detectForVideo(video, ts);
    const inferenceMs = Math.max(1, Math.round(performance.now() - t0));
    return {
      detections: adaptFastDetections(result.detections, width, height, minConfidence),
      inferenceMs,
    };
  }

  terminate(): void {
    if (this.detector) {
      try {
        this.detector.close();
      } catch {
        // Ignore cleanup errors on already-closed graph.
      }
      this.detector = null;
    }
    this.lastTimestampMs = 0;
  }
}
