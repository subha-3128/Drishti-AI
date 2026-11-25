# Drishti AI — Testing Report

## Automated Test Suite (`npm test`)
All tests run via Vitest in `frontend/src/tests/`:
- `stateMachine.test.ts` — Verifies invalid transitions are blocked and `active` requires camera, model, and AI initialization.
- `cameraManager.test.ts` — Verifies `AbortSignal` cancellation during `getUserMedia` stops acquired tracks and keeps state `idle`.
- `mirageService.test.ts` — Verifies unique `requestId` matching, stale-frame dropping while busy, and 10s timeout worker termination.
- `mirageAdapter.test.ts` — Verifies open-vocabulary Mirage label mapping, `[0..1000]` bbox normalization, class-aware deduplication, malformed JSON errors, and disabled Indian hazards.
- `directionEstimator.test.ts` — Verifies `left`, `center`, `right`, and `ahead` fallback on wide/low-confidence boxes.
- `hazardEngine.test.ts` — Verifies temporal validation, per-track cooldowns, `P0` preemption of `P2`/`P3`, tiny-background suppression, and absence of approaching-motion claims.
- `cactusMiragePoc.test.ts` — Runs **actual** Cactus `4.1.4` WASM (`cactus.wasm`) + `mirage.cact` across 4 real scenes (320×240 RGB):
  - `dog.jpg`: `tree` (0.411), `pickup truck` (0.513), `white pickup truck` (0.521), `wooden deck` (0.385), `wooden fence` (0.397), `dog` (0.594) -> adapted to `dog` + `truck` + `barrier` + `tree`.
  - `messi5.jpg`: `crowd` (0.380), `soccer player` (0.817), `soccer ball` (0.697) -> adapted to `person` + `crowd`.
  - `leuvenA.jpg` (street/buildings): `window`s (0.555–0.671), `house`s (0.550–0.583).
  - Uniform gray negative scene: `{"objects":[]}` -> `0` detections.
  - **Node WASM Measurements:** Init **103 ms**, inference **987 ms median / 4,503 ms p95**, WASM heap **103 MB**, RSS delta **+64 MB** (desktop Node measurement, not a mobile benchmark).
- `voiceEngine.test.ts` — Verifies speech availability reporting (`Voice Unavailable` / `No OS voices loaded`) and `P0` preemption.
- `modelCache.test.ts` — Verifies SHA-256 integrity checks and single-source-of-truth sync between `ai-models/model-manifest.json` and `frontend/public/models/model-manifest.json`.
- `appUi.test.tsx` — Verifies onboarding safety disclaimer gate and accessible `Start Navigation Assistance` controls.

## Indian Hazard Evaluation
- **Status:** Not yet evaluated on an Indian pedestrian hazard dataset (no licensed Indian pothole/open-drain dataset is present in the workspace). All Indian-specific hazard classes remain disabled (`enabled: false`) in `mirageRegistry.ts`.

## Verification Separation
- **Automated Tests (`npm test`):** Verified in Node/jsdom.
- **Desktop Build (`tsc -b && vite build`):** Verified production bundle & Service Worker (`22717.45 KiB`, 16 entries).
- **Physical Android Verification:** Pending (see `docs/DEVICE_VALIDATION.md`).
