"""
Download and fine-tune a 25-class YOLO11n obstacle detector on ROD-Dataset
(Abtinzandi/Obstacle-Detection-Dataset-YOLO) for Google Colab / GPU training,
then export quantized INT8 TFLite + ONNX weights for Drishti AI.

Usage (on Colab/Linux GPU):
  pip install ultralytics huggingface_hub
  python3 ai-training/scripts/train_rod_detector.py --epochs 50 --imgsz 320
"""

from __future__ import annotations

import argparse
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Train YOLO11n on ROD-Dataset.")
    parser.add_argument("--dest", type=Path, default=Path("ai-training/rod_dataset"))
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--imgsz", type=int, default=320)
    args = parser.parse_args()

    from huggingface_hub import snapshot_download
    from ultralytics import YOLO

    snapshot_download(
        repo_id="Abtinzandi/Obstacle-Detection-Dataset-YOLO",
        repo_type="dataset",
        local_dir=str(args.dest),
    )

    data_yaml = Path("ai-training/rod_dataset.yaml").resolve()
    model = YOLO("yolo11n.pt")
    model.train(data=str(data_yaml), epochs=args.epochs, imgsz=args.imgsz)
    model.export(format="tflite", int8=True, imgsz=args.imgsz)
    model.export(format="onnx", imgsz=args.imgsz)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
