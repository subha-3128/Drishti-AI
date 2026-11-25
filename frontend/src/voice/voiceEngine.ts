import { HazardPriority } from '../ai/mirage/mirageRegistry';

export interface SpeechItem {
  text: string;
  priority: HazardPriority;
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

export class VoiceEngine {
  private queue: SpeechItem[] = [];
  private speakingPriority: HazardPriority | null = null;
  private watchdogTimer: number | null = null;
  private rate = 1.05;
  private volume = 1.0;
  private hapticsEnabled = true;
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
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
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

  configure(options: { rate?: number; volume?: number; hapticsEnabled?: boolean }): void {
    if (typeof options.rate === 'number') this.rate = options.rate;
    if (typeof options.volume === 'number') this.volume = options.volume;
    if (typeof options.hapticsEnabled === 'boolean') this.hapticsEnabled = options.hapticsEnabled;
  }

  enqueue(text: string, priority: HazardPriority = 'P2'): void {
    if (!text.trim()) return;

    if (this.hapticsEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (priority === 'P0') navigator.vibrate([120, 60, 120]);
      else if (priority === 'P1') navigator.vibrate(90);
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

    this.queue.push({ text, priority });
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
    this.availabilityListeners.clear();
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
