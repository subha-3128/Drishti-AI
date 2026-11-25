# Drishti AI — Indian Pedestrian Dataset Guide

## Purpose
The bundled `mirage.cact` vision model supports general obstacles (`person`, `crowd`, `vehicle`, `motorcycle`, `bicycle`, `bus`, `truck`, `dog`, `cow`, `stairs`, `barrier`, `obstacle`, `tree`). Custom Indian street hazards (`pothole`, `open_drain`, `open_manhole`, `broken_footpath`, `auto_rickshaw`) remain **disabled** (`enabled: false` in `frontend/src/ai/mirage/mirageRegistry.ts`) until demonstrated and evaluated on documented pedestrian-perspective datasets.

## Candidate Public Datasets (Verify License Before Use)
- **IDD (India Driving Dataset):** https://idd.insaan.iiit.ac.in/dataset/details/ (auto-rickshaws, two-wheelers, roadside animals, unpaved shoulders)
- **RDD2022 (Road Damage Dataset):** https://crddc2022.sekilab.global/data/ (potholes, surface cracks)

## Collection & Privacy Rules
- Capture pedestrian-height (~1.2–1.5 m) walking imagery across Indian streets, footpaths, construction zones, and varied lighting (bright sun, deep shadow, dusk).
- Never split frames from the same recording sequence across train/val/test.
- Blur faces and vehicle license plates before publishing any dataset.
- Validate annotations with `ai-training/scripts/validate_yolo_dataset.py` before training or evaluation.
