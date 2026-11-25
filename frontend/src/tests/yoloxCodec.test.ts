import { describe, it, expect } from 'vitest';
import { decodeYoloxOutput, preprocessForYolox, YOLOX_INPUT_SIZE } from '../ai/detection/yoloxCodec';
import { getActiveHazardConfig } from '../ai/detection/classRegistry';
import { validateManifest } from '../ai/inference/modelCache';

describe('YOLOX Codec & Registry', () => {
  it('preprocesses RGBA frame into BGR [1, 3, 416, 416] tensor with 114 padding', () => {
    const rgba = new Uint8ClampedArray(4 * 2 * 2);
    // Pixel (0,0): R=10, G=20, B=30, A=255
    rgba[0] = 10;
    rgba[1] = 20;
    rgba[2] = 30;
    rgba[3] = 255;

    const { tensorData, meta } = preprocessForYolox(rgba, 2, 2);
    expect(tensorData.length).toBe(3 * YOLOX_INPUT_SIZE * YOLOX_INPUT_SIZE);
    expect(meta.scale).toBe(YOLOX_INPUT_SIZE / 2);
    // BGR order at (0,0)
    expect(tensorData[0]).toBe(30);
    expect(tensorData[YOLOX_INPUT_SIZE * YOLOX_INPUT_SIZE]).toBe(20);
    expect(tensorData[2 * YOLOX_INPUT_SIZE * YOLOX_INPUT_SIZE]).toBe(10);
  });

  it('decodes a synthetic person detection from YOLOX grid output', () => {
    const output = new Float32Array(3549 * 85);
    // Put a high-confidence person (class 0) at grid cell (0,0) stride 8
    output[0] = 10; // dx -> (10+0)*8 = 80
    output[1] = 10; // dy -> (10+0)*8 = 80
    output[2] = Math.log(10); // w -> exp(ln(10))*8 = 80
    output[3] = Math.log(20); // h -> exp(ln(20))*8 = 160
    output[4] = 0.9; // obj_conf
    output[5] = 0.9; // class 0 (person)

    const detections = decodeYoloxOutput(output, { scale: 1, srcWidth: 416, srcHeight: 416 }, 0.45);
    expect(detections).toHaveLength(1);
    expect(detections[0].classId).toBe('person');
    expect(detections[0].confidence).toBeCloseTo(0.81, 2);
  });

  it('keeps unsupported custom Indian hazards disabled until trained', () => {
    expect(getActiveHazardConfig('person')?.enabled).toBe(true);
    expect(getActiveHazardConfig('pothole')).toBeNull();
    expect(getActiveHazardConfig('open_drain')).toBeNull();
  });

  it('validates model manifest schema', () => {
    expect(
      validateManifest({
        manifestVersion: '1.0.0',
        models: [
          {
            id: 'yolox-nano-coco',
            url: '/models/yolox_nano.onnx',
            sha256: 'c789161ed43c8269fcd4e67c67eeeb4e80c622da2eb296a20bc6007bd18a0b7d',
            fileSizeBytes: 3659407,
          },
        ],
      })
    ).toBe(true);
    expect(validateManifest({ manifestVersion: '1.0.0', models: [] })).toBe(false);
  });
});
