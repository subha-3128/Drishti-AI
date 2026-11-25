import { HazardPriority } from '../ai/detection/classRegistry';

export interface SpeechItem {
  text: string;
  priority: HazardPriority;
}

const PRIORITY_RANK: Record<HazardPriority, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

export class VoiceEngine {
  private queue: SpeechItem[] = [];
  private speakingPriority: HazardPriority | null = null;
  private rate = 1.05;
  private volume = 1.0;
  private hapticsEnabled = true;

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  getAvailability(): { supported: boolean; voiceCount: number; statusLabel: string } {
    if (!this.isSupported()) {
      return { supported: false, voiceCount: 0, statusLabel: 'Voice Unavailable' };
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      return {
        supported: true,
        voiceCount: 0,
        statusLabel: 'Web Speech (No OS voices loaded)',
      };
    }
    return {
      supported: true,
      voiceCount: voices.length,
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

    // Preempt lower-priority speech for critical/urgent hazards
    if (
      this.speakingPriority !== null &&
      PRIORITY_RANK[priority] < PRIORITY_RANK[this.speakingPriority] &&
      (priority === 'P0' || priority === 'P1')
    ) {
      window.speechSynthesis.cancel();
      this.speakingPriority = null;
      this.queue = this.queue.filter((item) => PRIORITY_RANK[item.priority] <= PRIORITY_RANK[priority]);
    }

    // Avoid duplicate queued text
    if (this.queue.some((item) => item.text === text)) return;

    // Keep queue bounded so alerts never lag far behind real time
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
    this.queue = [];
    this.speakingPriority = null;
    this.enqueue(text, 'P0');
  }

  stopAll(): void {
    this.queue = [];
    this.speakingPriority = null;
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
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

    this.speakingPriority = next.priority;
    utterance.onend = () => {
      this.speakingPriority = null;
      this.pump();
    };
    utterance.onerror = () => {
      this.speakingPriority = null;
      this.pump();
    };

    window.speechSynthesis.speak(utterance);
  }
}
