import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VALIDATOR = ROOT / "assets/scripts/validate_prd.py"
FIXTURES = ROOT / "tests/fixtures"


class ValidatePrdTest(unittest.TestCase):
    def run_validator(self, fixture):
        return subprocess.run(
            [sys.executable, str(VALIDATOR), str(FIXTURES / fixture)],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )

    def test_valid_prd_exits_zero_and_reports_pass(self):
        result = self.run_validator("valid-PRD.html")

        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("PASS", result.stdout)

    def test_invalid_prd_exits_one_and_reports_both_validation_errors(self):
        result = self.run_validator("invalid-PRD.html")

        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("data-preview", result.stdout)
        self.assertIn("【交互说明】", result.stdout)


if __name__ == "__main__":
    unittest.main()
