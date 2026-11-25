# Drishti AI — Build Status

> **Last Updated:** 2026-11-25  
> **Selected Platform:** Option B — React + TypeScript + Vite PWA + ONNX Runtime Web

## Environment Inspection
- **OS:** macOS 26.7.3 (`arm64`, 8 GB RAM)
- **Node.js:** `v22.17.0` | **npm:** `10.9.2`
- **Python:** `3.14.8`
- **Android Tooling:** Not installed (`gradle`, `adb`, `sdkmanager`, `ANDROID_HOME` absent)

## Milestone Tracker
- [x] **Milestone 1:** Project foundation (`frontend/`, `ai-models/`, `ai-training/`, `docs/`, Vite + TypeScript + PWA build)
- [x] **Milestone 2:** UI & Accessibility (Onboarding, Home, Settings, Safety, high-contrast dark/light themes, `aria-live`, Phosphor SVG icons, 48px+ touch targets)
- [x] **Milestone 3:** Camera Subsystem (`CameraManager` rear camera, newest-frame capture, freeze & interruption detection, `visibilitychange` pause)
- [x] **Milestone 4:** AI Infrastructure (`model-manifest.json`, SHA-256 `modelCache.ts`, `inference.worker.ts` with ONNX Runtime Web WebGPU/WASM, local `/ort/` WASM binaries)
- [x] **Milestone 5:** First Real Detector (`yolox_nano.onnx` Apache-2.0 COCO model, `yoloxCodec.ts` letterbox + decode + NMS, `classRegistry.ts`)
- [x] **Milestone 6:** Hazard Engine (`directionEstimator.ts`, `hazardEngine.ts` with IoU tracking, temporal validation, P0–P3 priority, cooldowns)
- [x] **Milestone 7:** Voice Alerts (`voiceEngine.ts` Web Speech API priority queue with P0/P1 preemption & haptics)
- [x] **Milestone 8:** Offline Operation (`vite-plugin-pwa` precache + Cache API SHA-256 model storage)
- [x] **Milestone 9:** Hazard-Specific Training Workspace (`ai-training/scripts/validate_yolo_dataset.py`, `DATASET_GUIDE.md`, `MODEL_TRAINING.md`)
- [x] **Milestone 10:** Extensibility (Modular `ai/` and `safety/` boundaries ready for future segmentation/depth)
- [x] **Milestone 11:** Unit & UI Tests (Vitest suite covering state machine, direction, hazard engine, YOLOX codec, manifest validation, and accessible UI)
- [x] **Milestone 12:** Finalization (`tsc -b && vite build`, documentation complete)

## Model Availability
- **Active Model:** `yolox_nano.onnx` (Megvii YOLOX-Nano, Apache-2.0, 3.66 MB, SHA-256 `c789161ed43c8269fcd4e67c67eeeb4e80c622da2eb296a20bc6007bd18a0b7d`)
- **Active Classes:** `person`, `bicycle`, `car`, `motorcycle`, `bus`, `truck`, `dog`, `cow`, `bench`, `chair`, `suitcase`
- **Disabled Pending Custom Training:** `pothole`, `open_drain`, `open_manhole`, `broken_footpath`, `auto_rickshaw`

## Milestone 2 Validation & Hardening (2026-11-25)
- **Real ONNX Inference Verified:** Tested `yolox_nano.onnx` via `onnxruntime-web` on `dog.jpg` (320×240 RGBA fixture); detected `dog` (0.86), `bicycle` (0.85), `car` (0.69), `truck` (0.59) in ~86 ms. Added cross-class overlap NMS (`IoU > 0.65`) to prevent duplicate vehicle alerts.
- **Worker & Camera Hardening:** Added 5s inference / 20s init timeouts in `detectorClient.ts`, zero-copy `ArrayBuffer` transfer, and `loadedmetadata` zero-dimension frame guard in `cameraManager.ts`.
- **Cache & Voice Hardening:** Added `fileSizeBytes` + offline error handling in `modelCache.ts`, and `getAvailability()` voice-count check in `voiceEngine.ts`.
- **Hazard Engine Hardening:** Added tiny distant background suppression (`area < 0.012`) and cooldown-map pruning.
- **Device Validation:** Step-by-step Android checklist added in `docs/DEVICE_VALIDATION.md`.

## Known Limitations & Unverified Items
- **PWA Background/Screen-Lock:** Browser suspends camera and Web Workers when locked or backgrounded.
- **Offline TTS:** `window.speechSynthesis` relies on OS-installed voices.
- **Unverified on Physical Mobile Device:** Live rear-camera + offline airplane-mode browser test on an Android phone has not yet been executed in this desktop session.
