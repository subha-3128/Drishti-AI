import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceEngine } from '../voice/voiceEngine';

describe('Voice Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('reports unavailable when speechSynthesis is absent', () => {
    const engine = new VoiceEngine();
    expect(engine.getAvailability()).toEqual({
      supported: false,
      voiceCount: 0,
      ready: false,
      statusLabel: 'Voice Unavailable',
    });
  });

  it('reports when Web Speech API exists but no OS voices are loaded', () => {
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [],
        speaking: false,
        cancel: vi.fn(),
        speak: vi.fn(),
      },
    });

    const engine = new VoiceEngine();
    const avail = engine.getAvailability();
    expect(avail.supported).toBe(true);
    expect(avail.voiceCount).toBe(0);
    expect(avail.statusLabel).toContain('No OS voices');
  });

  it('preempts lower-priority speech when a P0 critical alert arrives', () => {
    const cancel = vi.fn();
    const speak = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [{ name: 'English', lang: 'en-IN' }],
        speaking: true,
        cancel,
        speak,
      },
    });
    // Minimal SpeechSynthesisUtterance mock for jsdom
    (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
      text: string;
      lang = '';
      rate = 1;
      volume = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    };

    const engine = new VoiceEngine();
    engine.enqueue('Obstacle ahead.', 'P2');
    // Simulate speaking P2, then P0 arrives
    (engine as unknown as { speakingPriority: string | null }).speakingPriority = 'P2';
    engine.enqueue('Vehicle on your left.', 'P0');
    expect(cancel).toHaveBeenCalled();
  });
});
