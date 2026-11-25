import { describe, it, expect, vi, beforeEach } from 'vitest';
import { directionToPan, hapticPatternFor, VoiceEngine } from '../voice/voiceEngine';

describe('Voice Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
    delete (globalThis as unknown as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
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
    (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {};
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

  it('maps hazard direction to stereo pan and directional haptic cadence', () => {
    expect(directionToPan('left')).toBe(-0.85);
    expect(directionToPan('right')).toBe(0.85);
    expect(directionToPan('center')).toBe(0);
    expect(hapticPatternFor('P1', 'left')).toEqual([120, 60, 50]);
    expect(hapticPatternFor('P1', 'right')).toEqual([50, 60, 120]);
    expect(hapticPatternFor('P0', 'center')).toEqual([180, 60, 180, 60, 180]);
  });

  it('plays stereo-panned spatial earcon when AudioContext is supported', () => {
    const panSet = vi.fn();
    const connectSpy = vi.fn().mockImplementation(function (this: unknown) {
      return this;
    });
    const FakeAudioContext = vi.fn().mockImplementation(() => ({
      currentTime: 0,
      state: 'running',
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      createOscillator: () => ({
        type: 'sine',
        frequency: { setValueAtTime: vi.fn() },
        connect: connectSpy,
        start: vi.fn(),
        stop: vi.fn(),
      }),
      createGain: () => ({
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: connectSpy,
      }),
      createStereoPanner: () => ({
        pan: { setValueAtTime: panSet },
        connect: connectSpy,
      }),
    }));
    vi.stubGlobal('AudioContext', FakeAudioContext);

    const engine = new VoiceEngine();
    engine.enqueue('Vehicle on your left.', 'P1', 'left');
    expect(panSet).toHaveBeenCalledWith(-0.85, 0);
    engine.playScanningTick();
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
    (engine as unknown as { speakingPriority: string | null }).speakingPriority = 'P2';
    engine.enqueue('Vehicle on your left.', 'P0', 'left');
    expect(cancel).toHaveBeenCalled();
  });
});
