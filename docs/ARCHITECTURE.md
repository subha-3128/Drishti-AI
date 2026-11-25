# Drishti AI — Architecture

## Two-Tier On-Device Vision Pipeline
Drishti AI runs a **two-tier on-device vision pipeline** so mobile devices get fast obstacle tracking without giving up open-vocabulary scene context:

1. **Tier 1 — Fast Real-Time Reflex Detector (`ai/fast/fastDetectorService.ts`):**
   - **Model:** **MediaPipe EfficientDet-Lite0** (`efficientdet_lite0.tflite`, 4.6 MB, INT8, Apache-2.0) running via `@mediapipe/tasks-vision` (WebGL GPU delegate with automatic CPU fallback).
   - **Cadence:** ~15–20+ FPS (`45 ms` yield via `adaptiveScheduler.ts`), reading live `<video>` frames directly on GPU without CPU canvas readback.
   - **Capability:** Drives real-time obstacle alerts (`person`, `vehicle`, `motorcycle`, `bicycle`, `bus`, `truck`, `dog`, `cow`, `obstacle`) and measures rapid consecutive bounding-box expansion (`>= 25%` across `>= 4` rapid frames) to flag **approaching** path hazards.

2. **Tier 2 — Rich Scene Reader & Voice Commands (`ai/mirage/mirageService.ts` + `workers/mirage.worker.ts`):**
   - **Models:** **Cactus Mirage** (`mirage.cact`, 20.6 MB, Apache-2.0) + opt-in **Cactus Whistle** (`whistle.cact`, 16.1 MB, Apache-2.0) co-hosted in a single Cactus Compute `4.1.4` WASM worker.
   - **Cadence:** Non-blocking background scan every 4.5s (enriches static/context hazards such as `stairs`, `barrier`, `tree` without blocking Tier-1 FPS) + on-demand voice command transcription.

## Audio, Haptics & Offline Caching
- **Audio & Haptics (`voice/voiceEngine.ts`):** Web Speech API (`speechSynthesis`) priority queue (`P0`–`P3`), Web Audio API `StereoPannerNode` left/center/right earcons, throttled heartbeat scan tick, and directional `navigator.vibrate` patterns.
- **Offline PWA & Android (`vite.config.ts`, `modelCache.ts`, `frontend/android/`):** Workbox precaches the app shell, MediaPipe WASM, Cactus WASM, `efficientdet_lite0.tflite`, `mirage.cact`, and `whistle.cact` with SHA-256 verification.
