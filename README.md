# Drishti AI — दृष्टि

> **See the path. Hear the world.**  
> Experimental AI-powered assistive navigation app for blind and low-vision pedestrians in India.

## Safety Disclaimer

**Drishti AI is an experimental assistive tool, NOT a replacement for a white cane, guide dog, orientation & mobility training, traffic awareness, or human assistance.**

- It will **never** tell you "the road is safe" or "you can cross now."
- It will **never** announce unverified distances or approaching-motion claims.
- Indian street hazards (open drains, potholes, open manholes, broken footpaths, auto-rickshaws) are **not** enabled until evaluated on documented Indian pedestrian datasets.
- Always use primary mobility aids and remain alert.

## Architecture (React + TypeScript + Vite PWA + Capacitor Android + Cactus Compute WASM)

- **Sole Vision AI:** **Cactus Mirage** (`mirage.cact`, 20.6 MB, Apache-2.0) running locally on-device via **Cactus 4.1.4 WebAssembly** (`cactus.js` + `cactus.wasm`, Apache-2.0) inside `frontend/src/workers/mirage.worker.ts`.
- **Hands-Free Voice Commands (Opt-In):** **Cactus Whistle** (`whistle.cact`, 16.1 MB, Apache-2.0) co-loaded in the same WASM worker for offline speech commands (*"Start"*, *"Pause"*, *"Repeat"*, *"What is ahead"*, *"Faster"*, *"Slower"*).
- **Spatial Audio & Directional Haptics:** Web Audio API `StereoPannerNode` left/center/right audio cues paired with Web Speech (`speechSynthesis`) priority queue (`P0`–`P3`) and directional vibration cadences (`navigator.vibrate`).
- **Adaptive Power Management:** `MotionMonitor` (`DeviceMotionEvent`) + latency-aware backoff slows scan cadence when standing still with no urgent hazards.
- **Offline PWA & Android Packaging:** Workbox precaches the app shell, Cactus WASM runtime, `mirage.cact`, and `whistle.cact` (~39 MB total) with SHA-256 verification. Capacitor Android wrapper lives in `frontend/android/`.

## Development Setup

```bash
cd frontend
npm install
npm run dev
```

## Build, Test & Android Sync

```bash
cd frontend
npm test
npm run cap:sync   # builds dist/ and syncs Capacitor Android assets
```

To compile the Android APK (requires Android Studio / Android SDK & Gradle):

```bash
cd frontend/android
./gradlew assembleDebug
```

## License

Licensed under the **Apache License 2.0** — see [`LICENSE`](LICENSE).
