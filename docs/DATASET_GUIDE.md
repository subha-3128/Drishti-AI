# Drishti AI — Indian Pedestrian Dataset Guide

## Purpose
The bundled `yolox_nano.onnx` model is pretrained on COCO and detects general obstacles (`person`, `car`, `motorcycle`, `bicycle`, `bus`, `truck`, `dog`, `cow`, `bench`, `chair`, `suitcase`). It does **not** detect Indian street hazards such as open drains, potholes, broken footpaths, or auto-rickshaws.

## Candidate Public Datasets (Verify License Before Use)
- **IDD (India Driving Dataset):** https://idd.insaan.iiit.ac.in/dataset/details/
- **RDD2022 (Road Damage Dataset):** https://crddc2022.sekilab.global/data/

## Collection & Privacy Rules
- Capture pedestrian-height (~1.2–1.5 m) walking imagery across Chennai/Indian streets, footpaths, construction zones, and varied lighting.
- Never split frames from the same recording sequence across train/val/test.
- Blur faces and vehicle license plates before publishing any dataset.
- Validate annotations with `ai-training/scripts/validate_yolo_dataset.py` before training.
