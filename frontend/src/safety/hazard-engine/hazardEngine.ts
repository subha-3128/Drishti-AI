import { getActiveHazardConfig, HazardPriority } from '../../ai/detection/classRegistry';
import { computeIoU, RawDetection } from '../../ai/detection/yoloxCodec';
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
  bbox: RawDetection['bbox'];
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

export class HazardEngine {
  private tracks: TrackedObject[] = [];
  private nextTrackId = 1;
  private recentClassDirectionAlerts = new Map<string, number>();
  private options: Required<HazardEngineOptions>;

  constructor(options: HazardEngineOptions) {
    this.options = {
      minConfidence: options.minConfidence,
      cooldownMs: options.cooldownMs,
      trackExpiryMs: options.trackExpiryMs ?? 1500,
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

  processDetections(detections: RawDetection[], now: number): HazardAlert[] {
    // Expire stale tracks and stale cooldown keys
    this.tracks = this.tracks.filter((t) => now - t.lastSeenAt <= this.options.trackExpiryMs);
    for (const [key, ts] of this.recentClassDirectionAlerts.entries()) {
      if (now - ts > this.options.cooldownMs * 2) {
        this.recentClassDirectionAlerts.delete(key);
      }
    }

    const alerts: HazardAlert[] = [];

    for (const det of detections) {
      if (det.confidence < this.options.minConfidence) continue;
      const cfg = getActiveHazardConfig(det.classId);
      if (!cfg) continue;

      const area = (det.bbox.x2 - det.bbox.x1) * (det.bbox.y2 - det.bbox.y1);
      // Suppress tiny distant background detections to reduce false-positive alert fatigue.
      if (area < 0.012 && !(cfg.basePriority === 'P0' && det.confidence >= 0.75)) {
        continue;
      }

      const track = this.matchOrCreateTrack(det, now);
      const direction = estimateDirection(det.bbox, det.confidence);
      const priority = this.computePriority(cfg.basePriority, det.bbox, direction);

      // Temporal validation: require >=2 frames unless high-confidence close P0 hazard.
      const immediateP0 = priority === 'P0' && det.confidence >= 0.65 && area >= 0.12;
      if (track.seenCount < 2 && !immediateP0) {
        continue;
      }

      // Per-track cooldown
      if (track.lastAlertedAt > 0 && now - track.lastAlertedAt < this.options.cooldownMs) {
        continue;
      }

      // Per-(class + direction) cooldown to prevent duplicate speech when tracks re-id
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

    // If a P0 critical alert is present, suppress lower-priority P2/P3 alerts in the same frame.
    if (alerts.some((a) => a.priority === 'P0')) {
      return alerts.filter((a) => a.priority === 'P0' || a.priority === 'P1');
    }

    return alerts.slice(0, 2);
  }

  private matchOrCreateTrack(det: RawDetection, now: number): TrackedObject {
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
    bbox: RawDetection['bbox'],
    direction: HazardDirection
  ): HazardPriority {
    const area = (bbox.x2 - bbox.x1) * (bbox.y2 - bbox.y1);
    const inPath = direction === 'center' || direction === 'ahead';

    // Large obstacle close to lower-center walking path escalates urgency.
    if (inPath && area >= 0.2 && bbox.y2 >= 0.75) {
      return 'P0';
    }
    if (base === 'P2' && inPath && area >= 0.1) {
      return 'P1';
    }
    return base;
  }
}
