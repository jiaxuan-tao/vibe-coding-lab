"""Tests for the read-only PRD structure inspector."""

from __future__ import annotations

import json
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
import sys
import tempfile
import unittest


SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

from inspect_prd import inspect_document, main  # noqa: E402


class InspectDocumentTests(unittest.TestCase):
    def test_reports_present_and_missing_review_areas(self) -> None:
        report = inspect_document(
            "# 用户问题\n内容\n# 成功指标\n内容\n# MVP 范围\n内容\n"
            "# 用户流程\n内容\n# 验收标准\n内容\n"
        )

        self.assertEqual(
            report["sections"],
            {
                "user_problem": {"present": True, "matches": ["用户问题"]},
                "target_user": {"present": False, "matches": []},
                "goal_metrics": {"present": True, "matches": ["成功指标"]},
                "scope": {"present": True, "matches": ["MVP 范围"]},
                "user_flow": {"present": True, "matches": ["用户流程"]},
                "acceptance": {"present": True, "matches": ["验收标准"]},
                "dependencies_risks": {"present": False, "matches": []},
            },
        )
        self.assertEqual(
            report["notes"], ["结构检查不能替代产品判断，也不生成质量分数。"]
        )

    def test_reports_placeholders_with_line_numbers(self) -> None:
        report = inspect_document("# 用户问题\n内容\n\nTODO\n待确认\n")

        self.assertEqual(
            report["placeholders"],
            [{"line": 4, "text": "TODO"}, {"line": 5, "text": "待确认"}],
        )

    def test_reports_vague_language_as_evidence_not_score(self) -> None:
        report = inspect_document("# 用户问题\n希望提升体验，尽快上线。\n")

        self.assertEqual(
            report["vague_terms"],
            [{"line": 2, "term": "提升"}, {"line": 2, "term": "尽快"}],
        )
        self.assertNotIn("score", report)
        self.assertNotIn("verdict", report)

    def test_recognizes_given_when_then_acceptance_scenarios(self) -> None:
        report = inspect_document(
            "Given a signed-in user\nWhen they submit the form\nThen they see a confirmation\n"
            "GIVEN an admin\nWHEN access is denied\nTHEN show an error\n"
        )

        self.assertEqual(report["acceptance_scenarios"], 2)

    def test_json_output_is_machine_readable(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "prd.md"
            source.write_text("# 用户问题\n内容\n", encoding="utf-8")
            output = StringIO()
            with redirect_stdout(output):
                exit_code = main([str(source), "--json"])

        self.assertEqual(exit_code, 0)
        report = json.loads(output.getvalue())
        self.assertEqual(report["path"], str(source))
        self.assertTrue(report["sections"]["user_problem"]["present"])

    def test_missing_file_returns_two(self) -> None:
        output = StringIO()
        with redirect_stdout(output):
            exit_code = main(["does-not-exist.md"])

        self.assertEqual(exit_code, 2)

    def test_inspection_does_not_modify_source(self) -> None:
        original = "# 用户问题\nTODO\n"
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "prd.md"
            source.write_text(original, encoding="utf-8")
            before = source.read_bytes()
            with redirect_stdout(StringIO()):
                exit_code = main([str(source)])

            self.assertEqual(exit_code, 0)
            self.assertEqual(source.read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
