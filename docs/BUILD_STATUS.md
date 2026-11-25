# Drishti AI — Build Status

> **Last Updated:** 2026-11-25  
> **Platform:** React 19 + TypeScript + Vite PWA + Capacitor Android + Cactus Compute WebAssembly (`4.1.4`)

## Environment Inspection
- **OS:** macOS 26.7.3 (`arm64`, 8 GB RAM)
- **Node.js:** `v22.17.0` | **npm:** `10.9.2`
- **Python:** `3.14.8` | **Java:** OpenJDK 26
- **Android SDK / Gradle:** Not installed locally (`adb`, `sdkmanager`, `gradle` absent); Capacitor Android project (`frontend/android/`) is scaffolded, synced, and ready to build APK in Android Studio.

## AI Architecture (Two-Tier On-Device Pipeline)
- **Tier 1 Fast Reflex Model:** **MediaPipe EfficientDet-Lite0** (`efficientdet_lite0.tflite`, 4,602,795 bytes, SHA-256 `0720bf247bd76e6594ea28fa9c6f7c5242be774818997dbbeffc4da460c723bb`, Apache-2.0) via `@mediapipe/tasks-vision` GPU delegate.
- **Tier 2 Scene Model:** **Cactus Mirage** (`mirage.cact`, 21,611,043 bytes, SHA-256 `4249a0f7515272ff76b66c7fb4f17fce1e66f9f237`, Apache-2.0).
- **Voice Command Model (Opt-In):** **Cactus Whistle** (`whistle.cact`, 16,919,407 bytes, SHA-256 `b6e02f048568ac5d01a2042556c658061e699acbc0aa2a1439f52f3d461dffeb`, Apache-2.0), co-loaded in the same WASM worker (`~86 MB` WASM heap combined; `69 ms` measured speech transcription latency in Node WASM).
- **Runtime:** Official Cactus Compute `4.1.4` WebAssembly (`cactus.js` + `cactus.wasm`, commit `a224d3629bad90d1a0d7792183cea12cdd1fb75e`, Apache-2.0).

## Milestone Tracker
- [x] **Milestone 1:** Project foundation, Apache-2.0 `LICENSE`, & Mirage-only vision architecture
- [x] **Milestone 2:** UI & Accessibility (Onboarding, Home, Settings, Safety, high-contrast themes, `aria-live`, Phosphor icons)
- [x] **Milestone 3:** Camera Subsystem + Adaptive Battery/Thermal Frame Scheduler (`adaptiveScheduler.ts`)
- [x] **Milestone 4:** Cactus Mirage + Cactus Whistle WASM Worker (`mirage.worker.ts`, `mirageService.ts`, `modelCache.ts`)
- [x] **Milestone 5:** Hazard Engine + 3D Stereo Audio Earcons + Directional Haptics (`voiceEngine.ts`)
- [x] **Milestone 6:** Offline PWA (`vite-plugin-pwa`, 18 entries / ~39 MB precache) + Capacitor Android project (`frontend/android/`)
- [x] **Milestone 7:** Dataset evaluation harness (`evaluate_mirage.mjs`), Python validator tests, Vitest suite, and GitHub Actions CI

## Known Limitations & Verified Device Metrics
- **Tier 1 Real-Time Latency (`I2127`):** Measured **150–200 ms/frame (~5–6 FPS)** live on `I2127` (Qualcomm Snapdragon 4 Gen 1 `holi`, Android 14 Chrome) via `MediaPipe EfficientDet-Lite0` — a >12× speedup from the previous Mirage-only `2,500+ ms/frame` WASM baseline.
- **Tier 2 Mirage Latency:** Measured **~979 ms median** in Node WASM (Apple Silicon) and **2,500+ ms/frame** on `I2127` CPU WASM; now offloaded to background scene-enrichment (`6s` interval) so it never blocks Tier 1.
- **ROD-Dataset Mirage Evaluation (32 test images, MIT):** Measured **4/4** `Motorcycle`, **3/4** `Electrical Pole` (`pole`/`post`), **3/4** `Traffic Cone`, **3/4** `Dog`, **2/4** `Stairs` (`staircase`, plus 1 `metal railing`), **1/4** `Dustbin` (`trash can`), **0/4** `Manhole` (reported as `metal plate` / `circular object`), confirming `open_manhole`/`pothole`/`open_drain` must stay disabled until custom `YOLO11n` training ([`train_rod_detector.py`](../ai-training/scripts/train_rod_detector.py)).
- **APK Compilation:** Requires Android SDK / Android Studio locally (`./gradlew assembleDebug`) because Android SDK tools are not installed on this machine.
- **PWA Background/Screen-Lock:** Browser PWA mode pauses camera when backgrounded or screen-locked; native foreground background-camera mode requires a Capacitor Foreground Service plugin when compiling on Android.
- **Indian Hazards:** No Indian pedestrian hazard dataset evaluated yet; custom Indian hazard classes (`pothole`, `open_drain`, `open_manhole`, `broken_footpath`, `auto_rickshaw`) remain disabled (`enabled: false`).
