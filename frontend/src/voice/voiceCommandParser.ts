export type VoiceCommand = 'repeat' | 'pause' | 'start' | 'ahead' | 'faster' | 'slower';

const COMMAND_PATTERNS: Array<[RegExp, VoiceCommand]> = [
  [/\b(pause|stop)\b/i, 'pause'],
  [/\b(start|resume|begin)\b/i, 'start'],
  [/\b(repeat|again)\b/i, 'repeat'],
  [/\b(ahead|scan|describe|front|around)\b/i, 'ahead'],
  [/\b(faster|speed up|quicker)\b/i, 'faster'],
  [/\b(slower|slow down)\b/i, 'slower'],
];

/**
 * Maps recognized offline speech transcripts from Cactus Whistle to safe Drishti UI actions.
 */
export function parseVoiceCommand(transcript: string): VoiceCommand | null {
  const cleaned = transcript.trim().toLowerCase();
  if (!cleaned) return null;
  for (const [pattern, cmd] of COMMAND_PATTERNS) {
    if (pattern.test(cleaned)) {
      return cmd;
    }
  }
  return null;
}
