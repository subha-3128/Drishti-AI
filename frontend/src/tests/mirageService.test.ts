import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MirageInferenceError, MirageService } from '../ai/mirage/mirageService';

describe('MirageService Worker Protocol', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('ignores stale responses, drops frames while busy, and terminates worker on timeout', async () => {
    vi.useFakeTimers();
    const terminateSpy = vi.fn();

    class MockWorker {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: ((e: ErrorEvent) => void) | null = null;
      postMessage = vi.fn((msg: { type: string; requestId: number }) => {
        if (msg.type === 'INIT') {
          queueMicrotask(() => {
            // Stale response should be ignored; matching response resolves
            this.onmessage?.({ data: { type: 'INIT_OK', requestId: 9999, runtime: 'bad' } } as MessageEvent);
            this.onmessage?.({ data: { type: 'INIT_OK', requestId: msg.requestId, runtime: 'cactus-wasm' } } as MessageEvent);
          });
        }
      });
      terminate = terminateSpy;
    }

    vi.stubGlobal('Worker', MockWorker);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('model-manifest.json')) {
          return {
            ok: true,
            json: async () => ({
              manifestVersion: '2.0.0',
              models: [
                {
                  id: 'cactus-mirage-v1',
                  name: 'Cactus Mirage',
                  version: '4.1.4',
                  task: 'vision-object-detection',
                  url: '/models/mirage.cact',
                  fileSizeBytes: 4,
                  sha256: '9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a',
                },
              ],
            }),
          };
        }
        return { ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer };
      })
    );

    const service = new MirageService();
    const initRes = await service.initialize();
    expect(initRes.runtime).toBe('cactus-wasm');

    const img1 = { data: new Uint8ClampedArray(16), width: 2, height: 2 } as unknown as ImageData;
    const img2 = { data: new Uint8ClampedArray(16), width: 2, height: 2 } as unknown as ImageData;
    const p1 = service.detectFrame(img1, 0.4, 100);
    // Second call while busy returns null (drops stale frame)
    const p2 = await service.detectFrame(img2, 0.4, 200);
    expect(p2).toBeNull();

    const assertion = expect(p1).rejects.toBeInstanceOf(MirageInferenceError);
    await vi.advanceTimersByTimeAsync(10001);
    await assertion;
    expect(terminateSpy).toHaveBeenCalled();
    expect(service.isReady()).toBe(false);
    vi.useRealTimers();
  });
});
