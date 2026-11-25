# Drishti AI — Architecture

## Platform & Runtime
- **Frontend & Mobile Wrapper:** React 19 + TypeScript + Vite PWA (`frontend/`) wrapped with Capacitor Android (`frontend/android/`).
- **Sole Vision AI:** **Cactus Mirage** (`mirage.cact`, 21,611,043 bytes, Apache-2.0) running on **Cactus Compute WebAssembly 4.1.4** (`cactus.js` + `cactus.wasm`, commit `a224d3629bad90d1a0d7792183cea12cdd1fb75e`, Apache-2.0).
- **Voice Commands (Opt-In):** **Cactus Whistle** (`whistle.cact`, 16,919,407 bytes, Apache-2.0) co-loaded in the same WASM worker (`models & 6`).
- **Audio & Haptic Output:** Web Speech API (`window.speechSynthesis`) priority queue + Web Audio `StereoPannerNode` earcons + directional `navigator.vibrate` cadences (`voiceEngine.ts`).

## Data Flow
1. **Camera (`camera/cameraManager.ts`):** Opens rear camera (`facingMode: { ideal: 'environment' }`), downscales capture width to max 320 px, checks `track.getSettings().facingMode`, monitors track `ended`/`mute` and 3s freeze detection, and provides newest-frame capture.
2. **Adaptive Scheduling (`camera/adaptiveScheduler.ts`):** Adjusts inter-frame delay based on inference latency and `MotionMonitor` (`DeviceMotionEvent`), reducing capture cadence when stationary with no urgent hazards.
3. **Controlled Worker Pipeline (`ai/mirage/mirageService.ts` + `workers/mirage.worker.ts`):**
   - Allows 1 active `DESCRIBE` frame at a time; callers drop stale frames while `isBusy()` is true.
   - Co-hosts `cactus_describe` (Mirage) and `cactus_transcribe` (Whistle) in a single WASM instance with reused heap scratch buffers and request-ID correlation.
4. **Output Adapter (`ai/mirage/mirageAdapter.ts` + `mirageRegistry.ts`):**
   - Validates finite `[0..1000]` bounding boxes and `score` in `[0..1]`, maps open-vocabulary Mirage labels to enabled Drishti categories, and runs class-aware IoU NMS.
   - Keeps unvalidated Indian hazards (`pothole`, `open_drain`, `open_manhole`, `broken_footpath`, `auto_rickshaw`) disabled (`enabled: false`).
5. **Hazard Engine (`safety/hazard-engine/hazardEngine.ts` + `directionEstimator.ts`):**
   - Performs IoU tracking, temporal validation, direction estimation (`left`/`center`/`right`/`ahead`), `P0`–`P3` prioritization, and duplicate cooldown suppression without inventing distances or approaching motion.
6. **Offline Voice Commands (`voice/microphoneVad.ts` + `voice/voiceCommandParser.ts`):**
   - Captures microphone speech using RMS VAD (paused while Drishti speaks), resamples to 16 kHz mono float32, transcribes offline via `cactus_transcribe`, and executes safe UI commands.
7. **Offline Caching (`vite.config.ts` + `modelCache.ts`):**
   - Workbox precaches the app shell, `/cactus/cactus.{js,wasm}`, `/models/mirage.cact`, and `/models/whistle.cact` (18 entries, ~39 MB total).
   - `modelCache.ts` verifies `fileSizeBytes` and SHA-256 checksums against `model-manifest.json`.
