"""Unit tests for validate_yolo_dataset.py."""

import tempfile
import unittest
from pathlib import Path

from validate_yolo_dataset import validate_label_file


class TestValidateYoloDataset(unittest.TestCase):
    def test_valid_and_invalid_annotations(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            valid = Path(tmp) / "valid.txt"
            valid.write_text("0 0.5 0.5 0.25 0.4\n15 0.1 0.9 0.1 0.1\n", encoding="utf-8")
            self.assertEqual(validate_label_file(valid, num_classes=16), [])

            invalid = Path(tmp) / "invalid.txt"
            invalid.write_text("16 0.5 0.5 0.2 0.2\n0 1.2 0.5 0.0 0.2\n", encoding="utf-8")
            errors = validate_label_file(invalid, num_classes=16)
            self.assertEqual(len(errors), 2)


if __name__ == "__main__":
    unittest.main()
