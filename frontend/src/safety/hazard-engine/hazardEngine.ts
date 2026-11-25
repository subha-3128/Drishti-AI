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
  baselineArea: number;
  firstSeenAt: number;
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
 * Interprets validated detections into prioritized spoken alerts.
 * Approaching motion is only reported when rapid high-FPS tracking observes >=25% bbox growth.
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

      const prevLastSeen = this.findMatchingTrackLastSeen(det);
      const track = this.matchOrCreateTrack(det, area, now);
      const direction = estimateDirection(det.bbox, det.confidence);

      const inPath = direction === 'center' || direction === 'ahead';
      const frameGapOk = prevLastSeen > 0 && now - prevLastSeen <= 600;
      const isApproaching =
        cfg.category === 'dynamic' &&
        inPath &&
        det.confidence >= 0.55 &&
        track.seenCount >= 4 &&
        frameGapOk &&
        now - track.firstSeenAt >= 200 &&
        area >= track.baselineArea * 1.25;

      const priority = this.computePriority(cfg.basePriority, det.bbox, direction, area, isApproaching);
      const immediateClosePath = inPath && area >= 0.25 && det.bbox.y2 >= 0.8 && det.confidence >= 0.65;
      const singleFrameHighConf =
        det.confidence >= 0.65 &&
        area >= 0.045 &&
        (cfg.category === 'dynamic' || det.classId === 'stairs' || (cfg.category === 'static' && inPath));

      if (track.seenCount < 2 && !immediateClosePath && !singleFrameHighConf) {
        continue;
      }

      const urgentOverride = isApproaching && priority === 'P0' && now - track.lastAlertedAt >= 1500;
      if (!urgentOverride && track.lastAlertedAt > 0 && now - track.lastAlertedAt < this.options.cooldownMs) {
        continue;
      }

      const classDirKey = `${det.classId}:${direction}`;
      const lastClassAlert = this.recentClassDirectionAlerts.get(classDirKey) ?? 0;
      if (!urgentOverride && lastClassAlert > 0 && now - lastClassAlert < this.options.cooldownMs) {
        continue;
      }

      track.lastAlertedAt = now;
      this.recentClassDirectionAlerts.set(classDirKey, now);

      const verb = isApproaching ? 'approaching ' : '';
      alerts.push({
        id: `${track.trackId}-${now}`,
        classId: det.classId,
        priority,
        direction,
        message: `${cfg.spokenName} ${verb}${formatDirectionPhrase(direction)}.`,
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

  private findMatchingTrackLastSeen(det: MirageDetection): number {
    let bestIoU = 0.25;
    let lastSeen = 0;
    for (const track of this.tracks) {
      if (track.classId !== det.classId) continue;
      const iou = computeIoU(track.bbox, det.bbox);
      if (iou > bestIoU) {
        bestIoU = iou;
        lastSeen = track.lastSeenAt;
      }
    }
    return lastSeen;
  }

  private matchOrCreateTrack(det: MirageDetection, area: number, now: number): TrackedObject {
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
      if (area < bestTrack.baselineArea) {
        bestTrack.baselineArea = area;
      }
      return bestTrack;
    }

    const created: TrackedObject = {
      trackId: this.nextTrackId++,
      classId: det.classId,
      bbox: det.bbox,
      baselineArea: area,
      firstSeenAt: now,
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
    area: number,
    isApproaching: boolean
  ): HazardPriority {
    const inPath = direction === 'center' || direction === 'ahead';

    // P0 reserved for large immediate lower-center obstacles or rapidly approaching path hazards.
    if (inPath && ((area >= 0.25 && bbox.y2 >= 0.8) || (isApproaching && area >= 0.14))) {
      return 'P0';
    }
    if ((base === 'P2' && inPath && area >= 0.1) || isApproaching) {
      return base === 'P0' ? 'P0' : 'P1';
    }
    return base;
  }
}
