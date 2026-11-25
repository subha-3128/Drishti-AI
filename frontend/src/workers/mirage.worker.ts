import { adaptMirageOutput, MirageDetection } from '../ai/mirage/mirageAdapter';

export type MirageWorkerRequest =
  | { type: 'INIT'; requestId: number; modelBytes: ArrayBuffer }
  | {
      type: 'DESCRIBE';
      requestId: number;
      rgba: Uint8ClampedArray;
      width: number;
      height: number;
      minConfidence: number;
      timestamp: number;
    };

export type MirageWorkerResponse =
  | { type: 'INIT_OK'; requestId: number; runtime: 'cactus-wasm' }
  | { type: 'INIT_ERR'; requestId: number; error: string }
  | {
      type: 'DESCRIBE_OK';
      requestId: number;
      detections: MirageDetection[];
      inferenceMs: number;
      timestamp: number;
    }
  | { type: 'DESCRIBE_ERR'; requestId: number; error: string };

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

let cactusMod: CactusModule | null = null;

async function loadCactusRuntime(): Promise<CactusModule> {
  const jsRes = await fetch('/cactus/cactus.js');
  if (!jsRes.ok) throw new Error(`Failed to fetch cactus.js (${jsRes.status})`);
  const jsText = await jsRes.text();

  const wasmRes = await fetch('/cactus/cactus.wasm');
  if (!wasmRes.ok) throw new Error(`Failed to fetch cactus.wasm (${wasmRes.status})`);
  const wasmBinary = await wasmRes.arrayBuffer();

  const factory = new Function(`${jsText}; return createCactus;`) as () => (arg: {
    wasmBinary: ArrayBuffer;
  }) => Promise<CactusModule>;
  const createCactus = factory();
  return createCactus({ wasmBinary });
}

function readLastError(mod: CactusModule): string {
  try {
    const ptr = mod._cactus_last_error();
    return ptr ? mod.UTF8ToString(ptr) : 'Unknown Cactus runtime error.';
  } catch {
    return 'Unknown Cactus runtime error.';
  }
}

self.onmessage = async (event: MessageEvent<MirageWorkerRequest>) => {
  const msg = event.data;

  if (msg.type === 'INIT') {
    try {
      const mod = await loadCactusRuntime();
      const bytes = new Uint8Array(msg.modelBytes);
      const ptr = mod._malloc(bytes.length);
      mod.HEAPU8.set(bytes, ptr);
      const rc = mod._cactus_load(ptr, BigInt(bytes.length));
      mod._free(ptr);

      if (rc < 0 || (mod._cactus_models() & 4) === 0) {
        throw new Error(`Cactus Mirage failed to load: ${readLastError(mod)}`);
      }

      cactusMod = mod;
      self.postMessage({
        type: 'INIT_OK',
        requestId: msg.requestId,
        runtime: 'cactus-wasm',
      } satisfies MirageWorkerResponse);
    } catch (err) {
      cactusMod = null;
      self.postMessage({
        type: 'INIT_ERR',
        requestId: msg.requestId,
        error: err instanceof Error ? err.message : 'Mirage initialization failed.',
      } satisfies MirageWorkerResponse);
    }
    return;
  }

  if (msg.type === 'DESCRIBE') {
    if (!cactusMod) {
      self.postMessage({
        type: 'DESCRIBE_ERR',
        requestId: msg.requestId,
        error: 'Cactus Mirage model is not initialized.',
      } satisfies MirageWorkerResponse);
      return;
    }

    const t0 = performance.now();
    const rgbLen = msg.width * msg.height * 3;
    const rgb = new Uint8Array(rgbLen);
    for (let i = 0, j = 0; i < msg.rgba.length; i += 4, j += 3) {
      rgb[j] = msg.rgba[i];
      rgb[j + 1] = msg.rgba[i + 1];
      rgb[j + 2] = msg.rgba[i + 2];
    }

    const rgbPtr = cactusMod._malloc(rgb.length);
    const outCap = 65536;
    const outPtr = cactusMod._malloc(outCap);

    try {
      cactusMod.HEAPU8.set(rgb, rgbPtr);
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
        [rgbPtr, msg.width, msg.height, optionsJson, 'en', '', outPtr, outCap]
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
    } finally {
      cactusMod._free(rgbPtr);
      cactusMod._free(outPtr);
    }
  }
};
