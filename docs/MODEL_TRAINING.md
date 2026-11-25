# Drishti AI — Cactus Mirage Evaluation & Fine-Tuning

## Overview
Training and offline dataset evaluation live in `ai-training/`, decoupled from the runtime PWA. The PWA loads SHA-256-verified `.cact` models listed in `ai-models/model-manifest.json` (`frontend/public/models/model-manifest.json`).

## Workflow
1. Validate YOLO-format annotation labels before evaluation or fine-tuning:
   ```bash
   python3 ai-training/scripts/validate_yolo_dataset.py --labels ai-training/annotations
   ```
2. Evaluate the current `mirage.cact` WASM binary against labeled RGB `.bin` test scenes (measuring per-class precision, recall, and latency):
   ```bash
   node ai-training/scripts/evaluate_mirage.mjs --scenes frontend/src/tests
   ```
3. Fine-tune a custom `.cact` checkpoint (using `cactus-compute[train]`) only after collecting and sequence-splitting real pedestrian imagery.
4. Evaluate per-class precision and recall—especially false negatives on `open_drain`, `open_manhole`, and `pothole`—never aggregate accuracy alone.
5. Update `mirage.cact`, compute `shasum -a 256` and exact byte size, sync both `model-manifest.json` files, and enable validated classes in `frontend/src/ai/mirage/mirageRegistry.ts`.
