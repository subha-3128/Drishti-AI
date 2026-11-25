import { RawDetection } from '../detection/yoloxCodec';
import { loadManifest, loadVerifiedModelBytes } from './modelCache';

export interface InferenceResult {
  detections: RawDetection[];
  inferenceMs: number;
  timestamp: number;
}

export class DetectorClient {
  private worker: Worker | null = null;
  private ready = false;
  private busy = false;
  private modelName = 'YOLOX-Nano';

  isReady(): boolean {
    return this.ready;
  }

  isBusy(): boolean {
    return this.busy;
  }

  getModelName(): string {
    return this.modelName;
  }

  async initialize(): Promise<{ modelName: string; provider: string }> {
    if (this.ready && this.worker) {
      return { modelName: this.modelName, provider: 'cached' };
    }

    const manifest = await loadManifest();
    const entry = manifest.models[0];
    this.modelName = entry.name;

    const modelBytes = await loadVerifiedModelBytes(entry);
    this.terminate();

    const worker = new Worker(new URL('../../workers/inference.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker = worker;

    const provider = await new Promise<string>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.terminate();
        reject(new Error('AI worker initialization timed out.'));
      }, 20000);

      worker.onmessage = (event: MessageEvent<{ type: string; provider?: string; error?: string }>) => {
        if (event.data.type === 'INIT_OK') {
          window.clearTimeout(timer);
          resolve(event.data.provider ?? 'wasm');
        } else if (event.data.type === 'INIT_ERR') {
          window.clearTimeout(timer);
          reject(new Error(event.data.error ?? 'Worker initialization failed.'));
        }
      };
      worker.onerror = (err) => {
        window.clearTimeout(timer);
        reject(new Error(err.message || 'Worker crashed during init.'));
      };
      worker.postMessage({ type: 'INIT', modelBytes }, [modelBytes]);
    });

    this.ready = true;
    return { modelName: this.modelName, provider };
  }

  async detect(imageData: ImageData, minConfidence: number, timestamp: number): Promise<InferenceResult | null> {
    if (!this.worker || !this.ready || this.busy) {
      return null;
    }

    this.busy = true;
    try {
      return await new Promise<InferenceResult>((resolve, reject) => {
        if (!this.worker) {
          reject(new Error('Worker terminated.'));
          return;
        }
        const timer = window.setTimeout(() => {
          reject(new Error('Inference timed out after 5 seconds.'));
        }, 5000);

        this.worker.onmessage = (
          event: MessageEvent<{
            type: string;
            detections?: RawDetection[];
            inferenceMs?: number;
            timestamp?: number;
            error?: string;
          }>
        ) => {
          if (event.data.type === 'INFER_OK') {
            window.clearTimeout(timer);
            resolve({
              detections: event.data.detections ?? [],
              inferenceMs: event.data.inferenceMs ?? 0,
              timestamp: event.data.timestamp ?? timestamp,
            });
          } else if (event.data.type === 'INFER_ERR') {
            window.clearTimeout(timer);
            reject(new Error(event.data.error ?? 'Inference failed.'));
          }
        };
        this.worker.onerror = (err) => {
          window.clearTimeout(timer);
          reject(new Error(err.message || 'Inference worker error.'));
        };

        // Transfer the freshly captured ImageData buffer directly without an extra copy.
        const rgba = imageData.data;
        this.worker.postMessage(
          {
            type: 'INFER',
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

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.ready = false;
    this.busy = false;
  }
}
