# Drishti AI — Build Status

> **Last Updated:** 2026-11-25  
> **Selected Platform:** Option B — React + TypeScript + Vite PWA + Cactus Compute WebAssembly (`4.1.4`)

## Environment Inspection
- **OS:** macOS 26.7.3 (`arm64`, 8 GB RAM)
- **Node.js:** `v22.17.0` | **npm:** `10.9.2`
- **Python:** `3.14.8`
- **Android Tooling:** Not installed (`gradle`, `adb`, `sdkmanager`, `ANDROID_HOME` absent)

## Vision AI Architecture (Cactus Mirage Only)
- **Sole Vision Model:** **Cactus Mirage** (`mirage.cact`, 21,611,043 bytes, SHA-256 `4249a0f7515272ff76b66c7fb4f17fce1e66f9f237`, Apache-2.0).
- **Runtime:** Official Cactus Compute `4.1.4` WebAssembly (`cactus.js` + `cactus.wasm`, commit `a224d3629bad90d1a0d7792183cea12cdd1fb75e`, Apache-2.0) running in `frontend/src/workers/mirage.worker.ts`.
- **YOLOX-Nano & ONNX Runtime Web:** Completely removed (package, `.onnx` model, `/ort/` WASM binaries, workers, codecs, and tests).
- **Planned Future Feature:** Cactus Whistle for offline voice commands.

## Milestone Tracker
- [x] **Milestone 1:** Project foundation & Mirage-only architecture
- [x] **Milestone 2:** UI & Accessibility (Onboarding, Home, Settings, Safety, high-contrast dark/light themes, `aria-live`, Phosphor SVG icons)
- [x] **Milestone 3:** Camera Subsystem (`CameraManager` rear camera, `AbortSignal` cancellation, `facingMode` check, freeze/interruption detection)
- [x] **Milestone 4:** Cactus Mirage WASM Worker (`mirage.worker.ts`, `mirageService.ts`, `mirageAdapter.ts`, `mirageRegistry.ts`, SHA-256 `modelCache.ts`)
- [x] **Milestone 5:** Hazard Engine & Voice Alerts (`hazardEngine.ts`, `directionEstimator.ts`, `voiceEngine.ts` with `voiceschanged` & watchdog)
- [x] **Milestone 6:** Offline PWA (`vite-plugin-pwa` precaching app shell + `cactus.js`/`cactus.wasm` + `mirage.cact`, 16 entries / ~22.7 MB)
- [x] **Milestone 7:** Automated Tests & CI (10 Vitest files / 23 tests passing, GitHub Actions CI)

## Model & Class Coverage
- **Enabled Classes (Mirage-mapped):** `person`, `crowd`, `vehicle`, `motorcycle`, `bicycle`, `bus`, `truck`, `dog`, `cow`, `stairs`, `barrier`, `obstacle`, `tree`.
- **Disabled Pending Indian Dataset Evaluation:** `pothole`, `open_drain`, `open_manhole`, `broken_footpath`, `auto_rickshaw`.

## Known Limitations & Unverified Items
- **Mirage Inference Latency:** Measured **987 ms median / 4,503 ms p95** (~1 FPS) in Node WASM; real mobile Chrome latency, battery, and thermal behavior remain unverified on physical Android hardware.
- **PWA Background/Screen-Lock:** Browser suspends camera and Web Workers when locked or backgrounded.
- **Offline TTS:** `window.speechSynthesis` relies on OS-installed voices.
- **Indian Hazards:** No Indian pedestrian hazard dataset evaluated yet; custom Indian hazard classes remain disabled.
- **Root `LICENSE` File:** Not yet created; awaiting user's license choice.
