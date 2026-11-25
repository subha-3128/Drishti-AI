import * as ort from 'onnxruntime-web';
import { decodeYoloxOutput, preprocessForYolox, RawDetection, YOLOX_INPUT_SIZE } from '../ai/detection/yoloxCodec';

type WorkerRequest =
  | { type: 'INIT'; modelBytes: ArrayBuffer }
  | { type: 'INFER'; rgba: Uint8ClampedArray; width: number; height: number; minConfidence: number; timestamp: number };

type WorkerResponse =
  | { type: 'INIT_OK'; provider: string }
  | { type: 'INIT_ERR'; error: string }
  | { type: 'INFER_OK'; detections: RawDetection[]; inferenceMs: number; timestamp: number }
  | { type: 'INFER_ERR'; error: string };

let session: ort.InferenceSession | null = null;
let inputName = 'images';
let outputName = 'output';

ort.env.wasm.wasmPaths = '/ort/';
ort.env.wasm.numThreads = 1;

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;

  if (msg.type === 'INIT') {
    try {
      const hasWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
      const providers: ort.InferenceSession.ExecutionProviderConfig[] = hasWebGpu
        ? ['webgpu', 'wasm']
        : ['wasm'];

      try {
        session = await ort.InferenceSession.create(msg.modelBytes, {
          executionProviders: providers,
        });
      } catch {
        // Fallback to pure WASM if WebGPU initialization fails on the device.
        session = await ort.InferenceSession.create(msg.modelBytes, {
          executionProviders: ['wasm'],
        });
      }

      inputName = session.inputNames[0] ?? 'images';
      outputName = session.outputNames[0] ?? 'output';

      const reply: WorkerResponse = {
        type: 'INIT_OK',
        provider: hasWebGpu ? 'webgpu/wasm' : 'wasm',
      };
      self.postMessage(reply);
    } catch (err) {
      const reply: WorkerResponse = {
        type: 'INIT_ERR',
        error: err instanceof Error ? err.message : 'Failed to initialize ONNX session.',
      };
      self.postMessage(reply);
    }
    return;
  }

  if (msg.type === 'INFER') {
    if (!session) {
      const reply: WorkerResponse = { type: 'INFER_ERR', error: 'AI model not initialized.' };
      self.postMessage(reply);
      return;
    }

    const t0 = performance.now();
    try {
      const { tensorData, meta } = preprocessForYolox(msg.rgba, msg.width, msg.height);
      const inputTensor = new ort.Tensor('float32', tensorData, [1, 3, YOLOX_INPUT_SIZE, YOLOX_INPUT_SIZE]);
      const results = await session.run({ [inputName]: inputTensor });
      const outputTensor = results[outputName];
      const outputData = outputTensor.data as Float32Array;
      const detections = decodeYoloxOutput(outputData, meta, msg.minConfidence);
      const inferenceMs = Math.round(performance.now() - t0);

      const reply: WorkerResponse = {
        type: 'INFER_OK',
        detections,
        inferenceMs,
        timestamp: msg.timestamp,
      };
      self.postMessage(reply);
    } catch (err) {
      const reply: WorkerResponse = {
        type: 'INFER_ERR',
        error: err instanceof Error ? err.message : 'Inference error.',
      };
      self.postMessage(reply);
    }
  }
};
