import { adaptMirageOutput, MirageDetection } from '../ai/mirage/mirageAdapter';

export type MirageWorkerRequest =
  | { type: 'INIT'; requestId: number; modelBytes: ArrayBuffer }
  | { type: 'INIT_WHISTLE'; requestId: number; modelBytes: ArrayBuffer }
  | {
      type: 'DESCRIBE';
      requestId: number;
      rgba: Uint8ClampedArray;
      width: number;
      height: number;
      minConfidence: number;
      timestamp: number;
    }
  | {
      type: 'TRANSCRIBE';
      requestId: number;
      samples: Float32Array;
    };

export type MirageWorkerResponse =
  | { type: 'INIT_OK'; requestId: number; runtime: 'cactus-wasm' }
  | { type: 'INIT_ERR'; requestId: number; error: string }
  | { type: 'INIT_WHISTLE_OK'; requestId: number }
  | { type: 'INIT_WHISTLE_ERR'; requestId: number; error: string }
  | {
      type: 'DESCRIBE_OK';
      requestId: number;
      detections: MirageDetection[];
      inferenceMs: number;
      timestamp: number;
    }
  | { type: 'DESCRIBE_ERR'; requestId: number; error: string }
  | { type: 'TRANSCRIBE_OK'; requestId: number; text: string; inferenceMs: number }
  | { type: 'TRANSCRIBE_ERR'; requestId: number; error: string };

interface CactusModule {
  _malloc(size: number): number;
  _free(ptr: number): void;
  _cactus_load(ptr: number, len: bigint): number;
  _cactus_models(): number;
  _cactus_last_error(): number;
  HEAPU8: Uint8Array;
  UTF8ToString(ptr: number): string;
  ccall(ident: string, returnType: string, argTypes: string[], args: unknown[]): number;
}

const OUT_BUFFER_CAPACITY = 65536;
const WHISTLE_KEYWORDS = 'drishti\nrepeat\npause\nstop\nresume\nstart\nahead\nscan\nfaster\nslower';

let cactusMod: CactusModule | null = null;
let outPtr = 0;
let rgbPtr = 0;
let rgbCap = 0;
let pcmPtr = 0;
let pcmCap = 0;

function freeScratchBuffers(mod: CactusModule | null): void {
  if (!mod) return;
  if (outPtr) {
    mod._free(outPtr);
    outPtr = 0;
  }
  if (rgbPtr) {
    mod._free(rgbPtr);
    rgbPtr = 0;
    rgbCap = 0;
  }
  if (pcmPtr) {
    mod._free(pcmPtr);
    pcmPtr = 0;
    pcmCap = 0;
  }
}

async function ensureCactusRuntime(): Promise<CactusModule> {
  if (cactusMod && outPtr) return cactusMod;

  const jsRes = await fetch('/cactus/cactus.js');
  if (!jsRes.ok) throw new Error(`Failed to fetch cactus.js (${jsRes.status})`);
  const jsText = await jsRes.text();

  const wasmRes = await fetch('/cactus/cactus.wasm');
  if (!wasmRes.ok) throw new Error(`Failed to fetch cactus.wasm (${wasmRes.status})`);
  const wasmBinary = await wasmRes.arrayBuffer();

  // cactus.js is a classic UMD bundle; evaluated in worker scope because ES module workers lack importScripts.
  const factory = new Function(`${jsText}; return createCactus;`) as () => (arg: {
    wasmBinary: ArrayBuffer;
  }) => Promise<CactusModule>;
  const createCactus = factory();
  const mod = await createCactus({ wasmBinary });
  outPtr = mod._malloc(OUT_BUFFER_CAPACITY);
  cactusMod = mod;
  return mod;
}

function readLastError(mod: CactusModule): string {
  try {
    const ptr = mod._cactus_last_error();
    return ptr ? mod.UTF8ToString(ptr) : 'Unknown Cactus runtime error.';
  } catch {
    return 'Unknown Cactus runtime error.';
  }
}

function loadModelIntoRuntime(mod: CactusModule, modelBytes: ArrayBuffer): number {
  const bytes = new Uint8Array(modelBytes);
  const ptr = mod._malloc(bytes.length);
  mod.HEAPU8.set(bytes, ptr);
  const rc = mod._cactus_load(ptr, BigInt(bytes.length));
  mod._free(ptr);
  return rc;
}

self.onmessage = async (event: MessageEvent<MirageWorkerRequest>) => {
  const msg = event.data;

  if (msg.type === 'INIT') {
    try {
      const mod = await ensureCactusRuntime();
      const rc = loadModelIntoRuntime(mod, msg.modelBytes);
      if (rc < 0 || (mod._cactus_models() & 4) === 0) {
        throw new Error(`Cactus Mirage failed to load: ${readLastError(mod)}`);
      }
      self.postMessage({
        type: 'INIT_OK',
        requestId: msg.requestId,
        runtime: 'cactus-wasm',
      } satisfies MirageWorkerResponse);
    } catch (err) {
      freeScratchBuffers(cactusMod);
      cactusMod = null;
      self.postMessage({
        type: 'INIT_ERR',
        requestId: msg.requestId,
        error: err instanceof Error ? err.message : 'Mirage initialization failed.',
      } satisfies MirageWorkerResponse);
    }
    return;
  }

  if (msg.type === 'INIT_WHISTLE') {
    try {
      const mod = await ensureCactusRuntime();
      const rc = loadModelIntoRuntime(mod, msg.modelBytes);
      if (rc < 0 || (mod._cactus_models() & 2) === 0) {
        throw new Error(`Cactus Whistle failed to load: ${readLastError(mod)}`);
      }
      self.postMessage({
        type: 'INIT_WHISTLE_OK',
        requestId: msg.requestId,
      } satisfies MirageWorkerResponse);
    } catch (err) {
      self.postMessage({
        type: 'INIT_WHISTLE_ERR',
        requestId: msg.requestId,
        error: err instanceof Error ? err.message : 'Whistle initialization failed.',
      } satisfies MirageWorkerResponse);
    }
    return;
  }

  if (msg.type === 'DESCRIBE') {
    if (!cactusMod || !outPtr || (cactusMod._cactus_models() & 4) === 0) {
      self.postMessage({
        type: 'DESCRIBE_ERR',
        requestId: msg.requestId,
        error: 'Cactus Mirage model is not initialized.',
      } satisfies MirageWorkerResponse);
      return;
    }

    const t0 = performance.now();
    const rgbLen = msg.width * msg.height * 3;
    if (rgbLen > rgbCap) {
      if (rgbPtr) cactusMod._free(rgbPtr);
      rgbPtr = cactusMod._malloc(rgbLen);
      rgbCap = rgbLen;
    }

    // Write RGB bytes directly into WASM heap to avoid per-frame JS array allocations.
    const heap = cactusMod.HEAPU8;
    const rgba = msg.rgba;
    for (let i = 0, j = rgbPtr; i < rgba.length; i += 4, j += 3) {
      heap[j] = rgba[i];
      heap[j + 1] = rgba[i + 1];
      heap[j + 2] = rgba[i + 2];
    }

    try {
      const optionsJson = JSON.stringify({
        sections: ['objects'],
        fields: ['bbox', 'score'],
        conf: msg.minConfidence,
        max_objects: 10,
      });

      const code = cactusMod.ccall(
        'cactus_describe',
        'number',
        ['number', 'number', 'number', 'string', 'string', 'string', 'number', 'number'],
        [rgbPtr, msg.width, msg.height, optionsJson, 'en', '', outPtr, OUT_BUFFER_CAPACITY]
      );

      if (code < 0) {
        throw new Error(`Mirage inference failed: ${readLastError(cactusMod)}`);
      }

      // cactus_describe writes a null-terminated JSON C string into outPtr.
      const rawJson = cactusMod.UTF8ToString(outPtr);
      const detections = adaptMirageOutput(rawJson, msg.minConfidence);
      const inferenceMs = Math.round(performance.now() - t0);

      self.postMessage({
        type: 'DESCRIBE_OK',
        requestId: msg.requestId,
        detections,
        inferenceMs,
        timestamp: msg.timestamp,
      } satisfies MirageWorkerResponse);
    } catch (err) {
      self.postMessage({
        type: 'DESCRIBE_ERR',
        requestId: msg.requestId,
        error: err instanceof Error ? err.message : 'Mirage inference failed.',
      } satisfies MirageWorkerResponse);
    }
    return;
  }

  if (msg.type === 'TRANSCRIBE') {
    if (!cactusMod || !outPtr || (cactusMod._cactus_models() & 2) === 0) {
      self.postMessage({
        type: 'TRANSCRIBE_ERR',
        requestId: msg.requestId,
        error: 'Cactus Whistle model is not initialized.',
      } satisfies MirageWorkerResponse);
      return;
    }

    const t0 = performance.now();
    const byteLen = msg.samples.byteLength;
    if (byteLen > pcmCap) {
      if (pcmPtr) cactusMod._free(pcmPtr);
      pcmPtr = cactusMod._malloc(byteLen);
      pcmCap = byteLen;
    }

    new Float32Array(cactusMod.HEAPU8.buffer, pcmPtr, msg.samples.length).set(msg.samples);

    try {
      const code = cactusMod.ccall(
        'cactus_transcribe',
        'number',
        ['number', 'number', 'string', 'string', 'number', 'number', 'number'],
        [pcmPtr, msg.samples.length, 'en', WHISTLE_KEYWORDS, 0, outPtr, OUT_BUFFER_CAPACITY]
      );

      if (code < 0) {
        throw new Error(`Whistle inference failed: ${readLastError(cactusMod)}`);
      }

      const rawJson = cactusMod.UTF8ToString(outPtr);
      const parsed = JSON.parse(rawJson) as { text?: string };
      self.postMessage({
        type: 'TRANSCRIBE_OK',
        requestId: msg.requestId,
        text: typeof parsed.text === 'string' ? parsed.text.trim() : '',
        inferenceMs: Math.round(performance.now() - t0),
      } satisfies MirageWorkerResponse);
    } catch (err) {
      self.postMessage({
        type: 'TRANSCRIBE_ERR',
        requestId: msg.requestId,
        error: err instanceof Error ? err.message : 'Whistle transcription failed.',
      } satisfies MirageWorkerResponse);
    }
  }
};
