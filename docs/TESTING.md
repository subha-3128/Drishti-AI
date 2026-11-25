# Drishti AI — Testing Report

## Automated Test Suite (`npm test`)
All automated tests run via Vitest in `frontend/src/tests/`:
- `stateMachine.test.ts` — Verifies invalid transitions are blocked and `active` requires camera, model, and AI initialization.
- `directionEstimator.test.ts` — Verifies `left`, `center`, `right`, and `ahead` fallback on wide/low-confidence boxes.
- `hazardEngine.test.ts` — Verifies temporal validation, per-track cooldowns, `P0` preemption of `P2`/`P3`, and tiny-background suppression.
- `yoloxCodec.test.ts` — Verifies BGR `[1, 3, 416, 416]` letterboxing, YOLOX grid decoding, disabled Indian classes, and manifest validation.
- `realInference.test.ts` — Runs **actual** `onnxruntime-web` inference using `yolox_nano.onnx` on `fixtures_dog_320x240.bin` (derived from Megvii YOLOX `dog.jpg`).
- `voiceEngine.test.ts` — Verifies speech availability reporting (`No OS voices loaded` vs `Voice Unavailable`) and `P0` preemption.
- `modelCache.test.ts` — Verifies SHA-256 integrity rejection and acceptance.
- `appUi.test.tsx` — Verifies onboarding safety disclaimer gate and accessible `Start Navigation Assistance` controls.

## Real Inference Verification (`dog.jpg` 320×240)
- **Runtime:** `onnxruntime-web` (Node WASM/CPU)
- **Measured Inference Latency:** ~86 ms (preprocessing + ONNX run + decode + NMS)
- **Observed Detections:** `dog` (0.86), `bicycle` (0.85), `car` (0.69), `truck` (0.59).
- **Fix Applied:** Added cross-class overlap NMS (`IoU > 0.65`) in `yoloxCodec.ts` to prevent duplicate alerts when a single vehicle triggers both `car` and `truck`.

## Hardware-Dependent Tests Still Pending
- Physical Android rear-camera `getUserMedia` lifecycle, airplane-mode PWA cold start, and offline OS `speechSynthesis` voices (see `docs/DEVICE_VALIDATION.md`).
