"""Validate YOLO-format bounding box annotations for Drishti AI training datasets."""

from __future__ import annotations

import argparse
from pathlib import Path


def validate_label_file(path: Path, num_classes: int) -> list[str]:
    errors: list[str] = []
    for line_no, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) != 5:
            errors.append(f"{path.name}:{line_no}: expected 5 columns, got {len(parts)}")
            continue
        try:
            cls_id = int(parts[0])
            cx, cy, w, h = (float(v) for v in parts[1:])
        except ValueError:
            errors.append(f"{path.name}:{line_no}: non-numeric value")
            continue
        if not (0 <= cls_id < num_classes):
            errors.append(f"{path.name}:{line_no}: class id {cls_id} out of range [0, {num_classes})")
        if not all(0.0 <= val <= 1.0 for val in (cx, cy, w, h)) or w <= 0.0 or h <= 0.0:
            errors.append(f"{path.name}:{line_no}: invalid normalized bbox ({cx}, {cy}, {w}, {h})")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate YOLO annotation files.")
    parser.add_argument("--labels", type=Path, required=True, help="Directory of .txt label files")
    parser.add_argument("--num-classes", type=int, default=16, help="Number of configured hazard classes")
    args = parser.parse_args()

    if not args.labels.exists():
        print(f"Labels directory does not exist yet: {args.labels}")
        return 1

    all_errors: list[str] = []
    txt_files = sorted(args.labels.rglob("*.txt"))
    for txt in txt_files:
        all_errors.extend(validate_label_file(txt, args.num_classes))

    print(f"Checked {len(txt_files)} label files; found {len(all_errors)} errors.")
    for err in all_errors[:25]:
        print(" -", err)
    return 1 if all_errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
