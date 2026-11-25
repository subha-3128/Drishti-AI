import { describe, it, expect } from 'vitest';
import { parseVoiceCommand } from '../voice/voiceCommandParser';
import { resampleTo16k } from '../voice/microphoneVad';

describe('Voice Command Parser & Audio Resampler', () => {
  it('parses supported offline commands reliably', () => {
    expect(parseVoiceCommand('Drishti, pause assistance.')).toBe('pause');
    expect(parseVoiceCommand('Please repeat')).toBe('repeat');
    expect(parseVoiceCommand('Resume scanning')).toBe('start');
    expect(parseVoiceCommand('What is ahead?')).toBe('ahead');
    expect(parseVoiceCommand('Speak faster')).toBe('faster');
    expect(parseVoiceCommand('Slow down please')).toBe('slower');
    expect(parseVoiceCommand('random background chatter')).toBeNull();
  });

  it('resamples 48 kHz mono float samples cleanly to 16 kHz', () => {
    const src = new Float32Array(4800).fill(0.25);
    const dst = resampleTo16k(src, 48000);
    expect(dst.length).toBe(1600);
    expect(dst[0]).toBeCloseTo(0.25, 4);
  });
});
