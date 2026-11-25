# Drishti AI — Architecture

## Platform
**React + TypeScript + Vite PWA + ONNX Runtime Web** (`frontend/`).
Core perception, state machine, and hazard-analysis modules are written in pure TypeScript so they can be reused or migrated to Native Android (Kotlin / Jetpack Compose / CameraX / ONNX Runtime Mobile) in the future.

## Data Flow
1. **Camera (`camera/cameraManager.ts`):** Opens rear camera (`facingMode: { ideal: 'environment' }`, ~640×480), monitors track `ended`/`mute` and `video.currentTime` freeze detection, and captures the newest frame only when the AI worker is idle (dropping stale frames).
2. **AI Inference (`workers/inference.worker.ts` + `ai/inference/detectorClient.ts`):** Runs `onnxruntime-web` (WebGPU with WASM fallback, local `/ort/` WASM binaries) inside a Web Worker using `yolox_nano.onnx` (Apache-2.0, 416×416 BGR input).
3. **Hazard Engine (`safety/hazard-engine/hazardEngine.ts` + `safety/direction/directionEstimator.ts`):** Filters by confidence and active class registry, tracks objects via IoU, validates across frames, estimates `left` / `center` / `right` / `ahead`, assigns `P0`–`P3` priority, and applies per-track + per-(class, direction) cooldowns.
4. **Voice (`voice/voiceEngine.ts`):** Priority-aware `window.speechSynthesis` queue with `P0`/`P1` preemption and optional `navigator.vibrate` haptics.
5. **Offline Storage (`ai/inference/modelCache.ts` + `vite-plugin-pwa`):** Service Worker precaches app shell, `/ort/*.wasm`, and `/models/yolox_nano.onnx`; `modelCache.ts` verifies SHA-256 before caching or serving model bytes.

## Documented PWA Limitations
- **Screen Lock & Backgrounding:** Mobile browsers suspend `MediaStream` and Web Workers when locked or backgrounded. `App.tsx` listens to `visibilitychange`, pauses assistance, and announces `"Camera paused. Navigation assistance unavailable."`
- **Offline Speech:** `speechSynthesis` relies on OS-installed voices.
