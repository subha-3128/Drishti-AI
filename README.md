# Drishti AI — दृष्टि

> **See the path. Hear the world.**  
> Experimental AI-powered assistive navigation PWA for blind and low-vision pedestrians in India.

## Safety Disclaimer

**Drishti AI is an experimental assistive tool, NOT a replacement for a white cane, guide dog, orientation & mobility training, traffic awareness, or human assistance.**

- It will **never** tell you "the road is safe" or "you can cross now."
- It will **never** announce unverified distances or approaching-motion claims.
- Indian street hazards (open drains, potholes, open manholes, broken footpaths, auto-rickshaws) are **not** enabled until evaluated on documented Indian pedestrian datasets.
- Always use primary mobility aids and remain alert.

## Architecture (React + TypeScript + Vite PWA + Cactus Mirage WASM)

- **Sole Vision AI:** **Cactus Mirage** (`mirage.cact`, 20.6 MB, Apache-2.0) running locally on-device via the official **Cactus 4.1.4 WebAssembly** runtime (`cactus.js` + `cactus.wasm`, Apache-2.0) inside `frontend/src/workers/mirage.worker.ts`.
- **Voice Alerts:** Browser Web Speech API (`speechSynthesis`) priority queue (`P0`–`P3`) + haptic feedback (`navigator.vibrate`). Offline voice output depends on OS-installed TTS voices.
- **Future Voice Commands:** **Cactus Whistle** is planned for optional offline voice-command recognition.
- **Offline PWA:** Service Worker (`vite-plugin-pwa`) precaches the app shell, Cactus WASM runtime, and `mirage.cact` (~22.7 MB total), with SHA-256 + byte-size verification in `modelCache.ts`.

## PWA Limitations

- **Background / Screen-Lock Suspension:** Mobile browsers suspend camera streams and Web Workers when locked or backgrounded. Keep the screen awake during use.
- **Offline Voice:** `window.speechSynthesis` depends on OS-installed offline TTS voices.

## Development Setup

```bash
cd frontend
npm install
npm run dev
```

## Build & Test

```bash
cd frontend
npm test
npm run build
```
