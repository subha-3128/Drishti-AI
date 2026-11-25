# Drishti AI — Architecture

## Platform & Runtime
- **Frontend:** React 19 + TypeScript + Vite PWA (`frontend/`).
- **Sole Vision AI:** **Cactus Mirage** (`mirage.cact`, 21,611,043 bytes, Apache-2.0) running on **Cactus Compute WebAssembly 4.1.4** (`cactus.js` + `cactus.wasm`, commit `a224d3629bad90d1a0d7792183cea12cdd1fb75e`, Apache-2.0).
- **Audio Output:** Web Speech API (`window.speechSynthesis`) priority queue (`voiceEngine.ts`).
- **Planned Future Enhancement:** Cactus Whistle for offline voice commands.

## Data Flow
1. **Camera (`camera/cameraManager.ts`):** Opens rear camera (`facingMode: { ideal: 'environment' }`), checks `track.getSettings().facingMode`, monitors track `ended`/`mute` and 3s freeze detection, and provides newest-frame capture.
2. **Controlled Frame Queue (`ai/mirage/mirageService.ts` + `workers/mirage.worker.ts`):**
   - Allows only 1 active inference request at a time; callers drop stale frames while `isBusy()` is true.
   - Correlates requests/responses via unique `requestId` and terminates + recovers the worker on 10s timeouts.
   - Calls `cactus_describe` with `{"sections":["objects"],"fields":["bbox","score"],"conf":...,"max_objects":10}` and reads the null-terminated JSON C string.
3. **Output Adapter (`ai/mirage/mirageAdapter.ts` + `mirageRegistry.ts`):**
   - Validates finite `[0..1000]` bounding boxes and `score` in `[0..1]`.
   - Maps open-vocabulary Mirage labels (e.g., `"soccer player"`, `"pickup truck"`) to validated Drishti categories and runs class-aware IoU NMS.
   - Keeps unvalidated Indian hazards (`pothole`, `open_drain`, `open_manhole`, `broken_footpath`, `auto_rickshaw`) disabled (`enabled: false`).
4. **Hazard Engine (`safety/hazard-engine/hazardEngine.ts` + `directionEstimator.ts`):**
   - Performs IoU tracking, temporal validation (`>= 2` frames or large immediate close-path obstacle), direction estimation (`left`/`center`/`right`/`ahead`), `P0`–`P3` prioritization, and duplicate cooldown suppression without inventing distances or approaching motion.
5. **Offline Caching (`vite.config.ts` + `modelCache.ts`):**
   - Workbox precaches the app shell, `/cactus/cactus.{js,wasm}`, and `/models/mirage.cact` (16 entries, ~22.7 MB total).
   - `modelCache.ts` verifies `fileSizeBytes` and SHA-256 checksums against `model-manifest.json`.
