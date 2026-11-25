const TARGET_SAMPLE_RATE = 16000;
const VAD_RMS_THRESHOLD = 0.025;
const SILENCE_HANGOVER_MS = 450;
const MIN_UTTERANCE_SAMPLES = 5600; // 0.35s
const MAX_UTTERANCE_SAMPLES = TARGET_SAMPLE_RATE * 4;

export function resampleTo16k(input: Float32Array, srcRate: number): Float32Array {
  if (srcRate === TARGET_SAMPLE_RATE || input.length === 0) {
    return input;
  }
  const outLen = Math.max(1, Math.round((input.length * TARGET_SAMPLE_RATE) / srcRate));
  const out = new Float32Array(outLen);
  const ratio = input.length / outLen;
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const s0 = input[idx] ?? 0;
    const s1 = input[Math.min(input.length - 1, idx + 1)] ?? s0;
    out[i] = s0 + (s1 - s0) * frac;
  }
  return out;
}

/**
 * Captures microphone audio and emits 16 kHz mono speech segments using simple RMS VAD.
 */
export class MicrophoneVad {
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private chunks: Float32Array[] = [];
  private sampleCount = 0;
  private inSpeech = false;
  private lastSpeechAt = 0;

  async start(
    onSpeechSegment: (samples16k: Float32Array) => void,
    shouldIgnore: () => boolean
  ): Promise<void> {
    if (this.stream) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone API is unavailable in this browser.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    this.stream = stream;

    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) {
      this.stop();
      throw new Error('Web Audio API is unavailable for voice commands.');
    }

    const ctx = new Ctor();
    this.audioCtx = ctx;
    const source = ctx.createMediaStreamSource(stream);
    // ScriptProcessorNode provides broad WebView/Android Chrome compatibility without separate worklet files.
    const processor = ctx.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (ev) => {
      if (shouldIgnore()) {
        this.resetBuffer();
        return;
      }

      const input = ev.inputBuffer.getChannelData(0);
      let sumSq = 0;
      for (let i = 0; i < input.length; i++) {
        sumSq += input[i] * input[i];
      }
      const rms = Math.sqrt(sumSq / input.length);
      const now = performance.now();

      if (rms >= VAD_RMS_THRESHOLD) {
        this.inSpeech = true;
        this.lastSpeechAt = now;
      }

      if (!this.inSpeech) return;

      const chunk16k = resampleTo16k(new Float32Array(input), ctx.sampleRate);
      this.chunks.push(chunk16k);
      this.sampleCount += chunk16k.length;

      const silentLongEnough = now - this.lastSpeechAt >= SILENCE_HANGOVER_MS;
      if (silentLongEnough || this.sampleCount >= MAX_UTTERANCE_SAMPLES) {
        const merged = this.flushBuffer();
        if (merged && merged.length >= MIN_UTTERANCE_SAMPLES) {
          onSpeechSegment(merged);
        }
      }
    };

    const silentGain = ctx.createGain();
    silentGain.gain.value = 0;
    source.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(ctx.destination);
    this.source = source;
    this.processor = processor;
  }

  private resetBuffer(): void {
    this.chunks = [];
    this.sampleCount = 0;
    this.inSpeech = false;
  }

  private flushBuffer(): Float32Array | null {
    if (this.sampleCount === 0) {
      this.resetBuffer();
      return null;
    }
    const merged = new Float32Array(this.sampleCount);
    let offset = 0;
    for (const chunk of this.chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    this.resetBuffer();
    return merged;
  }

  stop(): void {
    this.resetBuffer();
    if (this.processor) {
      this.processor.onaudioprocess = null;
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
  }
}
