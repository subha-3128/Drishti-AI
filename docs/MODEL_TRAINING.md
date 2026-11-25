# Drishti AI — Model Training & ONNX Export

## Overview
Training is decoupled from the runtime PWA (`ai-training/`). The PWA loads prebuilt, SHA-256-verified `.onnx` models listed in `ai-models/model-manifest.json`.

## Workflow
1. Prepare YOLO-format pedestrian hazard dataset and validate labels:
   ```bash
   python3 ai-training/scripts/validate_yolo_dataset.py --labels ai-training/annotations
   ```
2. Train a lightweight detector (e.g., YOLOX-Nano, Apache-2.0) on GPU/Colab with low-memory batch settings and checkpointing.
3. Evaluate per-class precision/recall (never aggregate accuracy alone), especially false negatives on `open_drain` and `pothole`.
4. Export to ONNX (416×416), compute `shasum -a 256`, update `frontend/public/models/model-manifest.json`, and enable the newly supported classes in `frontend/src/ai/detection/classRegistry.ts`.
