from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]


class DocumentationTests(unittest.TestCase):
    def test_readme_explains_product_value_and_safety_model(self):
        readme = (ROOT / "README.md").read_text(encoding="utf-8")

        for phrase in [
            "电脑文件整理",
            "先预览，再执行",
            "只读计划",
            "明确确认",
            "精确重复",
            "不覆盖",
            "撤销",
            "部分完成",
            "能力边界",
            "本地验证",
            "产品设计",
        ]:
            self.assertIn(phrase, readme)

    def test_readme_documents_installation_and_all_commands(self):
        readme = (ROOT / "README.md").read_text(encoding="utf-8")

        for phrase in [
            "$HOME/.agents/skills/computer-file-organizer",
            "$CODEX_HOME/skills/computer-file-organizer",
            "scripts/organize_files.py plan",
            "scripts/organize_files.py apply",
            "scripts/organize_files.py undo",
            "--confirm",
            "--include-duplicates",
        ]:
            self.assertIn(phrase, readme)

    def test_readme_local_links_resolve(self):
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        links = re.findall(r"\[[^\]]+\]\(([^)]+)\)", readme)
        local_links = [
            link.split("#", 1)[0]
            for link in links
            if link
            and not link.startswith(("http://", "https://", "#", "mailto:"))
        ]

        self.assertTrue(local_links)
        for link in local_links:
            self.assertTrue((ROOT / link).exists(), link)

    def test_upstream_and_license_are_explicit(self):
        upstream = (ROOT / "UPSTREAM.md").read_text(encoding="utf-8")
        license_text = (ROOT / "LICENSE.txt").read_text(encoding="utf-8")

        self.assertIn("CommandCodeAI/agent-skills", upstream)
        self.assertIn("file-organizer", upstream)
        self.assertIn("MIT", upstream)
        self.assertIn("focused reimplementation", upstream)
        self.assertIn("没有复制", upstream)
        self.assertIn("MIT License", license_text)

    def test_evaluation_documents_are_present_and_honest(self):
        baseline = (ROOT / "tests" / "baseline-evaluation.md").read_text(
            encoding="utf-8"
        )
        trigger = (ROOT / "tests" / "trigger-evaluation.md").read_text(
            encoding="utf-8"
        )
        forward = (ROOT / "tests" / "forward-evaluation.md").read_text(
            encoding="utf-8"
        )

        self.assertIn("Verbatim output", baseline)
        self.assertIn("失败矩阵", baseline)
        self.assertIn("应触发", trigger)
        self.assertIn("不应触发", trigger)
        self.assertIn("真实执行", forward)
        self.assertIn("临时目录", forward)


if __name__ == "__main__":
    unittest.main()
