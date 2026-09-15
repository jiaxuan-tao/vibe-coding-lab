import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class CodexMetadataTest(unittest.TestCase):
    def test_metadata_identifies_the_existing_skill(self):
        text = (ROOT / "agents/openai.yaml").read_text(encoding="utf-8")
        self.assertIn('display_name: "PM Workflow"', text)
        self.assertIn('short_description: "Create and maintain product management deliverables"', text)
        self.assertIn('$edu-pm-workflow', text)
        self.assertNotIn("allow_implicit_invocation: false", text)


if __name__ == "__main__":
    unittest.main()
