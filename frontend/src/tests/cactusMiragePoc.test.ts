// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { adaptMirageOutput } from '../ai/mirage/mirageAdapter';

function loadBinAsRgb(name: string): { width: number; height: number; rgb: Uint8Array } {
  const raw = fs.readFileSync(path.resolve(__dirname, name));
  const width = raw.readUInt32LE(0);
  const height = raw.readUInt32LE(4);
  const rgba = raw.subarray(8);
  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    rgb[j] = rgba[i];
    rgb[j + 1] = rgba[i + 1];
    rgb[j + 2] = rgba[i + 2];
  }
  return { width, height, rgb };
}

describe('Cactus Mirage WASM Validation & Benchmark', () => {
  it('verifies mirage.cact loading, output schema, latency, and memory across real scenes', async () => {
    const cactusJsPath = path.resolve(__dirname, '../../public/cactus/cactus.js');
    const cactusWasmPath = path.resolve(__dirname, '../../public/cactus/cactus.wasm');
    const miragePath = path.resolve(__dirname, '../../public/models/mirage.cact');

    const cactusJsCode = fs.readFileSync(cactusJsPath, 'utf-8');
    const modCtx: Record<string, unknown> = {
      require: createRequire(cactusJsPath),
      __filename: cactusJsPath,
      __dirname: path.dirname(cactusJsPath),
      process,
      console,
      URL,
      WebAssembly,
      TextDecoder,
      TextEncoder,
      Uint8Array,
      Int8Array,
      Int16Array,
      Uint16Array,
      Int32Array,
      Uint32Array,
      Float32Array,
      Float64Array,
      BigInt64Array,
      BigUint64Array,
      fetch,
      performance,
    };
    modCtx.globalThis = modCtx;
    vm.runInNewContext(`${cactusJsCode}\nthis.createCactus = createCactus;`, modCtx);
    const createCactus = modCtx.createCactus as (arg: { wasmBinary: Buffer }) => Promise<any>;

    const wasmBinary = fs.readFileSync(cactusWasmPath);
    const rssBeforeMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
    const tInit0 = performance.now();
    const mod = await createCactus({ wasmBinary });

    const mirageBytes = fs.readFileSync(miragePath);
    const modelPtr = mod._malloc(mirageBytes.length);
    mod.HEAPU8.set(mirageBytes, modelPtr);
    const loadRc = mod._cactus_load(modelPtr, BigInt(mirageBytes.length));
    mod._free(modelPtr);
    const initMs = Math.round(performance.now() - tInit0);

    expect(loadRc).toBe(0);
    expect(mod._cactus_models() & 4).toBe(4);

    const runDescribeRaw = (rgb: Uint8Array, width: number, height: number, optionsJson: string, keywords = '') => {
      const rgbPtr = mod._malloc(rgb.length);
      mod.HEAPU8.set(rgb, rgbPtr);
      const outCap = 65536;
      const outPtr = mod._malloc(outCap);

      const t0 = performance.now();
      const written = mod.ccall(
        'cactus_describe',
        'number',
        ['number', 'number', 'number', 'string', 'string', 'string', 'number', 'number'],
        [rgbPtr, width, height, optionsJson, 'en', keywords, outPtr, outCap]
      );
      const ms = Math.round(performance.now() - t0);
      const text = written >= 0 ? mod.UTF8ToString(outPtr) : '';
      mod._free(rgbPtr);
      mod._free(outPtr);
      return { written, ms, text };
    };

    const opts = JSON.stringify({
      sections: ['objects'],
      fields: ['bbox', 'score'],
      conf: 0.35,
      max_objects: 8,
    });

    const dog = loadBinAsRgb('fixtures_dog_320x240.bin');
    const person = loadBinAsRgb('fixtures_person_320x240.bin');
    const street = loadBinAsRgb('fixtures_street_320x240.bin');
    const blankRgb = new Uint8Array(320 * 240 * 3).fill(128);

    // Warm-up run
    runDescribeRaw(person.rgb, person.width, person.height, opts);

    // Repeated benchmark runs on street & person scenes
    const timings: number[] = [];
    let dogRes = runDescribeRaw(dog.rgb, dog.width, dog.height, opts);
    timings.push(dogRes.ms);
    const personRes = runDescribeRaw(person.rgb, person.width, person.height, opts);
    timings.push(personRes.ms);
    const streetRes = runDescribeRaw(street.rgb, street.width, street.height, opts);
    timings.push(streetRes.ms);
    const blankRes = runDescribeRaw(blankRgb, 320, 240, opts);
    timings.push(blankRes.ms);
    dogRes = runDescribeRaw(dog.rgb, dog.width, dog.height, opts);
    timings.push(dogRes.ms);

    const sorted = [...timings].sort((a, b) => a - b);
    const medianMs = sorted[Math.floor(sorted.length / 2)];
    const p95Ms = sorted[sorted.length - 1];
    const wasmHeapMb = Math.round(mod.HEAPU8.byteLength / (1024 * 1024));
    const rssAfterMb = Math.round(process.memoryUsage().rss / (1024 * 1024));

    console.info('[Cactus Mirage Benchmark (Node WASM)]', {
      initMs,
      medianMs,
      p95Ms,
      wasmHeapMb,
      rssDeltaMb: rssAfterMb - rssBeforeMb,
      dogOut: dogRes.text,
      personOut: personRes.text,
      streetOut: streetRes.text,
      blankOut: blankRes.text,
    });

    const dogAdapted = adaptMirageOutput(dogRes.text, 0.35);
    const personAdapted = adaptMirageOutput(personRes.text, 0.35);
    const blankAdapted = adaptMirageOutput(blankRes.text, 0.35);

    expect(dogAdapted.some((d) => d.classId === 'dog')).toBe(true);
    expect(dogAdapted.some((d) => d.classId === 'truck')).toBe(true);
    expect(personAdapted.some((d) => d.classId === 'person')).toBe(true);
    expect(JSON.parse(streetRes.text).objects.length).toBeGreaterThan(0);
    expect(blankAdapted).toHaveLength(0);
  }, 60000);
});
