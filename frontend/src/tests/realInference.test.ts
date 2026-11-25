// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as ort from 'onnxruntime-web';
import { decodeYoloxOutput, preprocessForYolox, YOLOX_INPUT_SIZE } from '../ai/detection/yoloxCodec';

describe('Real YOLOX-Nano ONNX Inference', () => {
  it('detects dog, bicycle, and truck/car on the official YOLOX dog.jpg fixture', async () => {
    const fixturePath = path.resolve(__dirname, 'fixtures_dog_320x240.bin');
    const modelPath = path.resolve(__dirname, '../../public/models/yolox_nano.onnx');

    const raw = fs.readFileSync(fixturePath);
    const width = raw.readUInt32LE(0);
    const height = raw.readUInt32LE(4);
    const rgba = new Uint8ClampedArray(raw.subarray(8));

    const modelBytes = fs.readFileSync(modelPath);
    const session = await ort.InferenceSession.create(modelBytes);

    const t0 = performance.now();
    const { tensorData, meta } = preprocessForYolox(rgba, width, height);
    const tensor = new ort.Tensor('float32', tensorData, [1, 3, YOLOX_INPUT_SIZE, YOLOX_INPUT_SIZE]);
    const outputs = await session.run({ [session.inputNames[0]]: tensor });
    const outputData = outputs[session.outputNames[0]].data as Float32Array;
    const detections = decodeYoloxOutput(outputData, meta, 0.35);
    const inferenceMs = Math.round(performance.now() - t0);

    console.info('[Real Inference]', { inferenceMs, count: detections.length, detections });

    const classes = detections.map((d) => d.classId);
    expect(classes).toContain('dog');
    expect(classes).toContain('bicycle');
    expect(classes.some((c) => c === 'truck' || c === 'car')).toBe(true);
  }, 30000);
});
