#!/usr/bin/env node
/**
 * Evaluates Cactus Mirage WASM against a local ROD-Dataset sample (/tmp/rod_eval/samples.json).
 * Reads 24-bit BMPs produced via `sips -z 240 320 -s format bmp` and reports per-class output.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

function readBmpAsRgb(bmpPath) {
  const buf = fs.readFileSync(bmpPath);
  const dataOffset = buf.readUInt32LE(10);
  const width = buf.readInt32LE(18);
  const rawHeight = buf.readInt32LE(22);
  const height = Math.abs(rawHeight);
  const bpp = buf.readUInt16LE(28);
  const rowStride = Math.floor((bpp * width + 31) / 32) * 4;
  const rgb = new Uint8Array(width * height * 3);
  const bottomUp = rawHeight > 0;
  const bytesPerPx = bpp / 8;

  for (let y = 0; y < height; y++) {
    const srcRow = bottomUp ? height - 1 - y : y;
    const rowOff = dataOffset + srcRow * rowStride;
    for (let x = 0; x < width; x++) {
      const si = rowOff + x * bytesPerPx;
      const di = (y * width + x) * 3;
      rgb[di] = buf[si + 2];     // R
      rgb[di + 1] = buf[si + 1]; // G
      rgb[di + 2] = buf[si];     // B
    }
  }
  return { width, height, rgb };
}

async function main() {
  const sampleFile = process.argv[2] || '/tmp/rod_eval/samples.json';
  if (!fs.existsSync(sampleFile)) {
    console.error('Sample file not found:', sampleFile);
    process.exit(1);
  }
  const samples = JSON.parse(fs.readFileSync(sampleFile, 'utf-8'));
  const sampleDir = path.dirname(sampleFile);

  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const cactusJsPath = path.join(root, 'frontend/public/cactus/cactus.js');
  const cactusWasmPath = path.join(root, 'frontend/public/cactus/cactus.wasm');
  const miragePath = path.join(root, 'frontend/public/models/mirage.cact');

  const ctx = {
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
  ctx.globalThis = ctx;
  vm.runInNewContext(`${fs.readFileSync(cactusJsPath, 'utf-8')}\nthis.createCactus = createCactus;`, ctx);

  const mod = await ctx.createCactus({ wasmBinary: fs.readFileSync(cactusWasmPath) });
  const modelBytes = fs.readFileSync(miragePath);
  const modelPtr = mod._malloc(modelBytes.length);
  mod.HEAPU8.set(modelBytes, modelPtr);
  if (mod._cactus_load(modelPtr, BigInt(modelBytes.length)) < 0) {
    throw new Error('Failed to load mirage.cact');
  }
  mod._free(modelPtr);

  const outPtr = mod._malloc(65536);
  const opts = JSON.stringify({ sections: ['objects'], fields: ['bbox', 'score'], conf: 0.3, max_objects: 6 });

  const stats = {};
  for (const s of samples) {
    const { width, height, rgb } = readBmpAsRgb(path.join(sampleDir, `${s.image}.bmp`));
    const rgbPtr = mod._malloc(rgb.length);
    mod.HEAPU8.set(rgb, rgbPtr);
    const t0 = performance.now();
    const rc = mod.ccall(
      'cactus_describe',
      'number',
      ['number', 'number', 'number', 'string', 'string', 'string', 'number', 'number'],
      [rgbPtr, width, height, opts, 'en', '', outPtr, 65536]
    );
    const ms = Math.round(performance.now() - t0);
    mod._free(rgbPtr);
    const objs = rc >= 0 ? JSON.parse(mod.UTF8ToString(outPtr)).objects || [] : [];
    const labels = objs.map((o) => `${o.name}(${o.score.toFixed(2)})`).join(', ') || 'none';
    console.log(`[${s.target}] ${s.image} (${ms}ms) -> ${labels}`);
    stats[s.target] = stats[s.target] || [];
    stats[s.target].push(objs.map((o) => o.name));
  }
  mod._free(outPtr);
  console.log('\n=== SUMMARY BY TARGET ===');
  for (const [k, lists] of Object.entries(stats)) {
    console.log(`${k}:`, lists.map((l) => l.join('/')).join(' | '));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
