import { HazardPriority } from '../ai/mirage/mirageRegistry';
import { HazardDirection } from '../safety/direction/directionEstimator';

export interface SpeechItem {
  text: string;
  priority: HazardPriority;
  direction?: HazardDirection;
}

export interface VoiceAvailability {
  supported: boolean;
  voiceCount: number;
  ready: boolean;
  statusLabel: string;
}

const PRIORITY_RANK: Record<HazardPriority, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

const UTTERANCE_WATCHDOG_MS = 8000;

export function directionToPan(direction?: HazardDirection): number {
  if (direction === 'left') return -0.85;
  if (direction === 'right') return 0.85;
  return 0;
}

export function hapticPatternFor(
  priority: HazardPriority,
  direction?: HazardDirection
): number | number[] | null {
  if (priority === 'P0') return [180, 60, 180, 60, 180];
  if (priority === 'P1') {
    if (direction === 'left') return [120, 60, 50];
    if (direction === 'right') return [50, 60, 120];
    return 110;
  }
  return null;
}

export class VoiceEngine {
  private queue: SpeechItem[] = [];
  private speakingPriority: HazardPriority | null = null;
  private watchdogTimer: number | null = null;
  private audioCtx: AudioContext | null = null;
  private rate = 1.05;
  private volume = 1.0;
  private hapticsEnabled = true;
  private spatialAudioEnabled = true;
  private availabilityListeners = new Set<(avail: VoiceAvailability) => void>();
  private boundOnVoicesChanged: (() => void) | null = null;

  constructor() {
    if (this.isSupported()) {
      // Trigger async voice list population in Chromium/WebKit.
      window.speechSynthesis.getVoices();
      if (typeof window.speechSynthesis.addEventListener === 'function') {
        this.boundOnVoicesChanged = () => {
          this.notifyAvailability();
        };
        window.speechSynthesis.addEventListener('voiceschanged', this.boundOnVoicesChanged);
      }
    }
  }

  private notifyAvailability(): void {
    const avail = this.getAvailability();
    for (const cb of this.availabilityListeners) cb(avail);
  }

  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof SpeechSynthesisUtterance !== 'undefined'
    );
  }

  isSpeaking(): boolean {
    if (this.speakingPriority !== null) return true;
    return this.isSupported() && Boolean(window.speechSynthesis.speaking);
  }

  subscribeAvailability(cb: (avail: VoiceAvailability) => void): () => void {
    this.availabilityListeners.add(cb);
    return () => {
      this.availabilityListeners.delete(cb);
    };
  }

  getAvailability(): VoiceAvailability {
    if (!this.isSupported()) {
      return {
        supported: false,
        voiceCount: 0,
        ready: false,
        statusLabel: 'Voice Unavailable',
      };
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      return {
        supported: true,
        voiceCount: 0,
        ready: false,
        statusLabel: 'Web Speech (No OS voices loaded)',
      };
    }
    return {
      supported: true,
      voiceCount: voices.length,
      ready: true,
      statusLabel: `Web Speech Ready (${voices.length} voices)`,
    };
  }

  configure(options: {
    rate?: number;
    volume?: number;
    hapticsEnabled?: boolean;
    spatialAudioEnabled?: boolean;
  }): void {
    if (typeof options.rate === 'number') this.rate = options.rate;
    if (typeof options.volume === 'number') this.volume = options.volume;
    if (typeof options.hapticsEnabled === 'boolean') this.hapticsEnabled = options.hapticsEnabled;
    if (typeof options.spatialAudioEnabled === 'boolean') {
      this.spatialAudioEnabled = options.spatialAudioEnabled;
    }
  }

  enqueue(text: string, priority: HazardPriority = 'P2', direction?: HazardDirection): void {
    if (!text.trim()) return;

    if (this.hapticsEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      const pattern = hapticPatternFor(priority, direction);
      if (pattern !== null) navigator.vibrate(pattern);
    }

    if (this.spatialAudioEnabled && direction && priority !== 'P3') {
      this.playSpatialCue(priority, direction);
    }

    if (!this.isSupported()) return;

    if (
      this.speakingPriority !== null &&
      PRIORITY_RANK[priority] < PRIORITY_RANK[this.speakingPriority] &&
      (priority === 'P0' || priority === 'P1')
    ) {
      window.speechSynthesis.cancel();
      this.clearWatchdog();
      this.speakingPriority = null;
      this.queue = this.queue.filter((item) => PRIORITY_RANK[item.priority] <= PRIORITY_RANK[priority]);
    }

    if (this.queue.some((item) => item.text === text)) return;

    if (this.queue.length >= 3) {
      this.queue.pop();
    }

    this.queue.push({ text, priority, direction });
    this.queue.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    this.pump();
  }

  speakImmediateSystem(text: string): void {
    if (!this.isSupported()) return;
    window.speechSynthesis.cancel();
    this.clearWatchdog();
    this.queue = [];
    this.speakingPriority = null;
    this.enqueue(text, 'P0');
  }

  stopAll(): void {
    this.clearWatchdog();
    this.queue = [];
    this.speakingPriority = null;
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }

  dispose(): void {
    this.stopAll();
    if (this.boundOnVoicesChanged && this.isSupported() && typeof window.speechSynthesis.removeEventListener === 'function') {
      window.speechSynthesis.removeEventListener('voiceschanged', this.boundOnVoicesChanged);
      this.boundOnVoicesChanged = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.availabilityListeners.clear();
  }

  private playSpatialCue(priority: HazardPriority, direction: HazardDirection): void {
    if (typeof window === 'undefined') return;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    try {
      if (!this.audioCtx) {
        this.audioCtx = new Ctor();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      const now = this.audioCtx.currentTime;
      const freq = priority === 'P0' ? 880 : priority === 'P1' ? 660 : 520;
      const duration = priority === 'P0' ? 0.16 : 0.1;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.05, this.volume * 0.22), now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      if (typeof this.audioCtx.createStereoPanner === 'function') {
        const panner = this.audioCtx.createStereoPanner();
        panner.pan.setValueAtTime(directionToPan(direction), now);
        osc.connect(gain).connect(panner).connect(this.audioCtx.destination);
      } else {
        osc.connect(gain).connect(this.audioCtx.destination);
      }

      osc.start(now);
      osc.stop(now + duration + 0.01);
    } catch {
      // AudioContext creation or playback failed (autoplay restriction); ignore cleanly.
    }
  }

  private clearWatchdog(): void {
    if (this.watchdogTimer !== null) {
      window.clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private pump(): void {
    if (!this.isSupported()) return;
    if (this.speakingPriority !== null || window.speechSynthesis.speaking) return;

    const next = this.queue.shift();
    if (!next) return;

    const utterance = new SpeechSynthesisUtterance(next.text);
    utterance.lang = 'en-IN';
    utterance.rate = this.rate;
    utterance.volume = this.volume;

    const finish = () => {
      this.clearWatchdog();
      this.speakingPriority = null;
      this.notifyAvailability();
      this.pump();
    };

    this.speakingPriority = next.priority;
    utterance.onend = finish;
    utterance.onerror = finish;

    // Prevent stuck queue if a mobile browser drops onend/onerror events.
    this.clearWatchdog();
    this.watchdogTimer = window.setTimeout(() => {
      window.speechSynthesis.cancel();
      finish();
    }, UTTERANCE_WATCHDOG_MS);

    window.speechSynthesis.speak(utterance);
  }
}
