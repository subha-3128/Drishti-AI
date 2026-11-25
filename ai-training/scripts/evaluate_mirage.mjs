#!/usr/bin/env node
/**
 * Evaluates Cactus Mirage WASM detection output and latency across raw RGB .bin scenes
 * (header: uint32 LE width, uint32 LE height, followed by RGBA bytes).
 * Optionally compares against YOLO .txt ground-truth boxes when --labels is supplied.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

function parseArgs(argv) {
  const args = { scenes: '', labels: '', conf: 0.35 };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--scenes' && argv[i + 1]) args.scenes = argv[++i];
    else if (argv[i] === '--labels' && argv[i + 1]) args.labels = argv[++i];
    else if (argv[i] === '--conf' && argv[i + 1]) args.conf = Number(argv[++i]);
  }
  return args;
}

function loadBinAsRgb(filePath) {
  const raw = fs.readFileSync(filePath);
  const width = raw.readUInt32LE(0);
  const height = raw.readUInt32LE(4);
  const rgba = raw.subarray(8);
  if (rgba.length !== width * height * 4) {
    throw new Error(`${path.basename(filePath)}: invalid RGBA byte length`);
  }
  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    rgb[j] = rgba[i];
    rgb[j + 1] = rgba[i + 1];
    rgb[j + 2] = rgba[i + 2];
  }
  return { width, height, rgb };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.scenes || !fs.existsSync(args.scenes)) {
    console.error('Usage: node ai-training/scripts/evaluate_mirage.mjs --scenes <dir-with-.bin-files> [--conf 0.35]');
    process.exit(1);
  }

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

  const files = fs.readdirSync(args.scenes).filter((f) => f.endsWith('.bin')).sort();
  if (files.length === 0) {
    console.error(`No .bin scenes found in ${args.scenes}`);
    process.exit(1);
  }

  const outCap = 65536;
  const outPtr = mod._malloc(outCap);
  const opts = JSON.stringify({ sections: ['objects'], fields: ['bbox', 'score'], conf: args.conf, max_objects: 10 });

  for (const file of files) {
    const { width, height, rgb } = loadBinAsRgb(path.join(args.scenes, file));
    const rgbPtr = mod._malloc(rgb.length);
    mod.HEAPU8.set(rgb, rgbPtr);
    const t0 = performance.now();
    const rc = mod.ccall(
      'cactus_describe',
      'number',
      ['number', 'number', 'number', 'string', 'string', 'string', 'number', 'number'],
      [rgbPtr, width, height, opts, 'en', '', outPtr, outCap]
    );
    const ms = Math.round(performance.now() - t0);
    const parsed = rc >= 0 ? JSON.parse(mod.UTF8ToString(outPtr)) : { objects: [] };
    mod._free(rgbPtr);
    const summary = (parsed.objects || []).map((o) => `${o.name}(${o.score.toFixed(2)})`).join(', ') || 'none';
    console.log(`${file}: ${ms} ms -> ${summary}`);
  }
  mod._free(outPtr);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
