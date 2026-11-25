import { computeIoU, MirageDetection, NormalizedBBox } from '../../ai/mirage/mirageAdapter';
import { HazardPriority, MIRAGE_HAZARD_CATEGORIES } from '../../ai/mirage/mirageRegistry';
import { estimateDirection, formatDirectionPhrase, HazardDirection } from '../direction/directionEstimator';

export interface HazardAlert {
  id: string;
  classId: string;
  priority: HazardPriority;
  direction: HazardDirection;
  message: string;
  confidence: number;
  timestamp: number;
}

interface TrackedObject {
  trackId: number;
  classId: string;
  bbox: NormalizedBBox;
  seenCount: number;
  lastSeenAt: number;
  lastAlertedAt: number;
}

export interface HazardEngineOptions {
  minConfidence: number;
  cooldownMs: number;
  trackExpiryMs?: number;
}

const PRIORITY_RANK: Record<HazardPriority, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

/**
 * Interprets validated Cactus Mirage detections into prioritized spoken alerts.
 * Strictly avoids inventing distances or approaching-motion claims.
 */
export class HazardEngine {
  private tracks: TrackedObject[] = [];
  private nextTrackId = 1;
  private recentClassDirectionAlerts = new Map<string, number>();
  private options: Required<HazardEngineOptions>;

  constructor(options: HazardEngineOptions) {
    this.options = {
      minConfidence: options.minConfidence,
      cooldownMs: options.cooldownMs,
      trackExpiryMs: options.trackExpiryMs ?? 7500,
    };
  }

  updateOptions(options: Partial<HazardEngineOptions>): void {
    if (typeof options.minConfidence === 'number') this.options.minConfidence = options.minConfidence;
    if (typeof options.cooldownMs === 'number') this.options.cooldownMs = options.cooldownMs;
  }

  reset(): void {
    this.tracks = [];
    this.recentClassDirectionAlerts.clear();
  }

  processDetections(detections: MirageDetection[], now: number): HazardAlert[] {
    this.tracks = this.tracks.filter((t) => now - t.lastSeenAt <= this.options.trackExpiryMs);
    for (const [key, ts] of this.recentClassDirectionAlerts.entries()) {
      if (now - ts > this.options.cooldownMs * 2) {
        this.recentClassDirectionAlerts.delete(key);
      }
    }

    const alerts: HazardAlert[] = [];

    for (const det of detections) {
      if (det.confidence < this.options.minConfidence) continue;
      const cfg = MIRAGE_HAZARD_CATEGORIES[det.classId];
      if (!cfg || !cfg.enabled) continue;

      const area = (det.bbox.x2 - det.bbox.x1) * (det.bbox.y2 - det.bbox.y1);
      if (area < 0.012 && !(cfg.category === 'dynamic' && det.confidence >= 0.78)) {
        continue;
      }

      const track = this.matchOrCreateTrack(det, now);
      const direction = estimateDirection(det.bbox, det.confidence);
      const priority = this.computePriority(cfg.basePriority, det.bbox, direction, area);

      const inPath = direction === 'center' || direction === 'ahead';
      const immediateClosePath = inPath && area >= 0.25 && det.bbox.y2 >= 0.8 && det.confidence >= 0.65;
      // Avoid 2.5s+ mobile blind spots by alerting immediately on high-confidence dynamic/path obstacles.
      const singleFrameHighConf =
        det.confidence >= 0.65 &&
        area >= 0.045 &&
        (cfg.category === 'dynamic' || det.classId === 'stairs' || (cfg.category === 'static' && inPath));

      if (track.seenCount < 2 && !immediateClosePath && !singleFrameHighConf) {
        continue;
      }

      if (track.lastAlertedAt > 0 && now - track.lastAlertedAt < this.options.cooldownMs) {
        continue;
      }

      const classDirKey = `${det.classId}:${direction}`;
      const lastClassAlert = this.recentClassDirectionAlerts.get(classDirKey) ?? 0;
      if (lastClassAlert > 0 && now - lastClassAlert < this.options.cooldownMs) {
        continue;
      }

      track.lastAlertedAt = now;
      this.recentClassDirectionAlerts.set(classDirKey, now);

      alerts.push({
        id: `${track.trackId}-${now}`,
        classId: det.classId,
        priority,
        direction,
        message: `${cfg.spokenName} ${formatDirectionPhrase(direction)}.`,
        confidence: det.confidence,
        timestamp: now,
      });
    }

    alerts.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);

    if (alerts.some((a) => a.priority === 'P0')) {
      return alerts.filter((a) => a.priority === 'P0' || a.priority === 'P1');
    }

    return alerts.slice(0, 2);
  }

  private matchOrCreateTrack(det: MirageDetection, now: number): TrackedObject {
    let bestTrack: TrackedObject | null = null;
    let bestIoU = 0.25;

    for (const track of this.tracks) {
      if (track.classId !== det.classId) continue;
      const iou = computeIoU(track.bbox, det.bbox);
      if (iou > bestIoU) {
        bestIoU = iou;
        bestTrack = track;
      }
    }

    if (bestTrack) {
      bestTrack.bbox = det.bbox;
      bestTrack.seenCount += 1;
      bestTrack.lastSeenAt = now;
      return bestTrack;
    }

    const created: TrackedObject = {
      trackId: this.nextTrackId++,
      classId: det.classId,
      bbox: det.bbox,
      seenCount: 1,
      lastSeenAt: now,
      lastAlertedAt: 0,
    };
    this.tracks.push(created);
    return created;
  }

  private computePriority(
    base: HazardPriority,
    bbox: NormalizedBBox,
    direction: HazardDirection,
    area: number
  ): HazardPriority {
    const inPath = direction === 'center' || direction === 'ahead';

    // P0 reserved for large obstacles filling the immediate lower-center walking path.
    if (inPath && area >= 0.25 && bbox.y2 >= 0.8) {
      return 'P0';
    }
    if (base === 'P2' && inPath && area >= 0.1) {
      return 'P1';
    }
    return base;
  }
}
