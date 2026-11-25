# Drishti AI — दृष्टि

> **See the path. Hear the world.**  
> Experimental AI-powered assistive navigation PWA for blind and low-vision pedestrians in India.

## Safety Disclaimer

**Drishti AI is an experimental assistive tool, NOT a replacement for a white cane, guide dog, orientation & mobility training, traffic awareness, or human assistance.**

- It will **never** tell you "the road is safe" or "you can cross now."
- Not all obstacles or Indian street hazards (such as open drains or potholes) can be detected by a generic pretrained model.
- Always use primary mobility aids and remain alert.

## Architecture (Option B — React + TypeScript + Vite PWA + ONNX Runtime Web)

- `frontend/` — Accessible React + TypeScript PWA, ONNX Runtime Web inference worker, Web Speech API priority queue, CameraX-inspired rear camera lifecycle manager, and pure TypeScript hazard/direction engine.
- `ai-models/` — Model manifest (`model-manifest.json`) and local model metadata.
- `ai-training/` — Python dataset preparation, validation, training config, and ONNX export workspace for future Indian pedestrian hazard models.
- `docs/` — `ARCHITECTURE.md`, `SAFETY.md`, `DATASET_GUIDE.md`, `MODEL_TRAINING.md`, and `BUILD_STATUS.md`.

## PWA Limitations

- **Background / Screen-Lock Suspension:** Mobile browsers suspend camera streams and Web Workers when locked or backgrounded. Keep the screen awake during use (Screen Wake Lock is requested when supported).
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
npm run build
npm test
```
