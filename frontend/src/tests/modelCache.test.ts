import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadVerifiedModelBytes, sha256Hex, validateManifest } from '../ai/inference/modelCache';

describe('Model Cache & Integrity', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects model download when SHA-256 checksum mismatches', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]).buffer;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => bytes,
      })
    );

    await expect(
      loadVerifiedModelBytes({
        id: 'test-model',
        name: 'Test',
        version: '1.0',
        task: 'object-detection',
        url: '/models/test.onnx',
        fileSizeBytes: 4,
        sha256: '0'.repeat(64),
        source: 'local',
        license: 'Apache-2.0',
        inputSize: [416, 416],
        runtime: 'cactus-wasm',
        supportedClasses: ['person'],
        status: 'bundled',
      })
    ).rejects.toThrow(/checksum verification failed/i);
  });

  it('accepts model bytes when size and SHA-256 match', async () => {
    const bytes = new Uint8Array([10, 20, 30, 40]).buffer;
    const expectedHash = await sha256Hex(bytes);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => bytes,
      })
    );

    const loaded = await loadVerifiedModelBytes({
      id: 'test-model',
      name: 'Test',
      version: '1.0',
      task: 'object-detection',
      url: '/models/test.onnx',
      fileSizeBytes: 4,
      sha256: expectedHash,
      source: 'local',
      license: 'Apache-2.0',
      inputSize: [416, 416],
      runtime: 'cactus-wasm',
      supportedClasses: ['person'],
      status: 'bundled',
    });

    expect(loaded.byteLength).toBe(4);
  });

  it('keeps ai-models/model-manifest.json and frontend/public/models/model-manifest.json in sync', () => {
    const rootManifest = fs.readFileSync(
      path.resolve(__dirname, '../../../ai-models/model-manifest.json'),
      'utf-8'
    );
    const publicManifest = fs.readFileSync(
      path.resolve(__dirname, '../../public/models/model-manifest.json'),
      'utf-8'
    );
    const parsedPublic = JSON.parse(publicManifest);
    expect(parsedPublic).toEqual(JSON.parse(rootManifest));
    expect(validateManifest(parsedPublic)).toBe(true);
    expect(
      validateManifest({
        manifestVersion: '2.0.0',
        models: [{ id: 'x', name: 'x', url: '/x', fileSizeBytes: 1, sha256: 'z'.repeat(64) }],
      })
    ).toBe(false);
  });
});
