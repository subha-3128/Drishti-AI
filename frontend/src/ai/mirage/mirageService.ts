import { MirageDetection } from './mirageAdapter';
import { loadManifest, loadVerifiedModelBytes } from '../inference/modelCache';
import type { MirageWorkerResponse } from '../../workers/mirage.worker';

export interface MirageInferenceResult {
  detections: MirageDetection[];
  inferenceMs: number;
  timestamp: number;
}

export class MirageInitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MirageInitError';
  }
}

export class MirageInferenceError extends Error {
  readonly timedOut: boolean;
  constructor(message: string, timedOut = false) {
    super(message);
    this.name = 'MirageInferenceError';
    this.timedOut = timedOut;
  }
}

interface PendingRequest<T> {
  requestId: number;
  timer: number;
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
}

export class MirageService {
  private worker: Worker | null = null;
  private ready = false;
  private busy = false;
  private modelName = 'Cactus Mirage';
  private runtime = 'cactus-wasm';
  private nextRequestId = 1;
  private pendingInit: PendingRequest<{ runtime: 'cactus-wasm' }> | null = null;
  private pendingDescribe: PendingRequest<MirageInferenceResult> | null = null;

  isReady(): boolean {
    return this.ready;
  }

  isBusy(): boolean {
    return this.busy;
  }

  getModelName(): string {
    return this.modelName;
  }

  async initialize(signal?: AbortSignal): Promise<{ modelName: string; runtime: string }> {
    if (signal?.aborted) {
      throw new MirageInitError('Mirage initialization cancelled.');
    }
    if (this.ready && this.worker) {
      return { modelName: this.modelName, runtime: this.runtime };
    }

    const manifest = await loadManifest();
    if (signal?.aborted) {
      throw new MirageInitError('Mirage initialization cancelled.');
    }

    const entry = manifest.models.find((m) => m.id === 'cactus-mirage-v1');
    if (!entry) {
      throw new MirageInitError('Cactus Mirage entry missing from model manifest.');
    }
    this.modelName = entry.name;

    const modelBytes = await loadVerifiedModelBytes(entry);
    if (signal?.aborted) {
      throw new MirageInitError('Mirage initialization cancelled.');
    }

    this.terminate();

    const worker = new Worker(new URL('../../workers/mirage.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.attachListeners(worker);
    this.worker = worker;

    const requestId = this.nextRequestId++;
    const res = await new Promise<{ runtime: 'cactus-wasm' }>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        if (this.pendingInit?.requestId === requestId) {
          this.pendingInit = null;
          this.terminate();
          reject(new MirageInitError('Cactus Mirage worker initialization timed out.'));
        }
      }, 25000);

      this.pendingInit = { requestId, timer, resolve, reject };

      if (signal) {
        const onAbort = () => {
          if (this.pendingInit?.requestId === requestId) {
            window.clearTimeout(timer);
            this.pendingInit = null;
            this.terminate();
            reject(new MirageInitError('Mirage initialization cancelled.'));
          }
        };
        signal.addEventListener('abort', onAbort, { once: true });
      }

      worker.postMessage({ type: 'INIT', requestId, modelBytes }, [modelBytes]);
    });

    this.runtime = res.runtime;
    this.ready = true;
    return { modelName: this.modelName, runtime: res.runtime };
  }

  /**
   * Processes one frame at a time. Returns null if the worker is busy so callers drop stale frames.
   */
  async detectFrame(
    imageData: ImageData,
    minConfidence: number,
    timestamp: number
  ): Promise<MirageInferenceResult | null> {
    if (!this.worker || !this.ready || this.busy || this.pendingDescribe) {
      return null;
    }

    this.busy = true;
    const requestId = this.nextRequestId++;

    try {
      return await new Promise<MirageInferenceResult>((resolve, reject) => {
        if (!this.worker) {
          reject(new MirageInferenceError('Mirage worker terminated.'));
          return;
        }

        const timer = window.setTimeout(() => {
          if (this.pendingDescribe?.requestId === requestId) {
            this.pendingDescribe = null;
            this.terminate();
            reject(new MirageInferenceError('Cactus Mirage inference timed out after 10 seconds.', true));
          }
        }, 10000);

        this.pendingDescribe = { requestId, timer, resolve, reject };

        const rgba = imageData.data;
        this.worker.postMessage(
          {
            type: 'DESCRIBE',
            requestId,
            rgba,
            width: imageData.width,
            height: imageData.height,
            minConfidence,
            timestamp,
          },
          [rgba.buffer]
        );
      });
    } finally {
      this.busy = false;
    }
  }

  private attachListeners(worker: Worker): void {
    worker.onmessage = (event: MessageEvent<MirageWorkerResponse>) => {
      const msg = event.data;
      if (!msg || typeof msg.requestId !== 'number') return;

      if (msg.type === 'INIT_OK' || msg.type === 'INIT_ERR') {
        const p = this.pendingInit;
        if (!p || p.requestId !== msg.requestId) return;
        window.clearTimeout(p.timer);
        this.pendingInit = null;
        if (msg.type === 'INIT_OK') {
          p.resolve({ runtime: msg.runtime });
        } else {
          p.reject(new MirageInitError(msg.error));
        }
        return;
      }

      if (msg.type === 'DESCRIBE_OK' || msg.type === 'DESCRIBE_ERR') {
        const p = this.pendingDescribe;
        if (!p || p.requestId !== msg.requestId) return;
        window.clearTimeout(p.timer);
        this.pendingDescribe = null;
        if (msg.type === 'DESCRIBE_OK') {
          p.resolve({
            detections: msg.detections,
            inferenceMs: msg.inferenceMs,
            timestamp: msg.timestamp,
          });
        } else {
          p.reject(new MirageInferenceError(msg.error));
        }
      }
    };

    worker.onerror = (err) => {
      const message = err.message || 'Cactus Mirage worker crashed.';
      if (this.pendingInit) {
        window.clearTimeout(this.pendingInit.timer);
        const p = this.pendingInit;
        this.pendingInit = null;
        p.reject(new MirageInitError(message));
      }
      if (this.pendingDescribe) {
        window.clearTimeout(this.pendingDescribe.timer);
        const p = this.pendingDescribe;
        this.pendingDescribe = null;
        p.reject(new MirageInferenceError(message));
      }
      this.terminate();
    };
  }

  terminate(): void {
    if (this.pendingInit) {
      window.clearTimeout(this.pendingInit.timer);
      this.pendingInit = null;
    }
    if (this.pendingDescribe) {
      window.clearTimeout(this.pendingDescribe.timer);
      this.pendingDescribe = null;
    }
    if (this.worker) {
      this.worker.onmessage = null;
      this.worker.onerror = null;
      this.worker.terminate();
      this.worker = null;
    }
    this.ready = false;
    this.busy = false;
  }
}
