"""Contract tests for user-facing documentation and attribution."""

from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"
UPSTREAM = ROOT / "UPSTREAM.md"
LICENSE = ROOT / "LICENSE.txt"

REQUIRED_HEADINGS = [
    "它解决什么问题",
    "决策模型",
    "使用方法",
    "输出示例",
    "核心能力",
    "技术实现",
    "能力边界",
    "AI 辅助开发说明",
    "参考与许可",
]


class DocumentationTests(unittest.TestCase):
    def read_required(self, path: Path) -> str:
        self.assertTrue(path.is_file(), f"missing documentation file: {path.name}")
        return path.read_text(encoding="utf-8")

    def test_readme_has_required_product_narrative(self) -> None:
        readme = self.read_required(README)

        for heading in REQUIRED_HEADINGS:
            self.assertRegex(readme, rf"(?m)^## .*{re.escape(heading)}$")

    def test_readme_has_working_install_location_and_no_originality_claim(self) -> None:
        readme = self.read_required(README)

        self.assertIn("~/.codex/skills/prd-decision-review", readme)
        self.assertNotIn("完全原创", readme)

    def test_upstream_names_both_mit_sources(self) -> None:
        upstream = self.read_required(UPSTREAM)

        self.assertIn("github/spec-kit", upstream)
        self.assertIn("Fission-AI/OpenSpec", upstream)
        self.assertGreaterEqual(upstream.count("MIT"), 2)

    def test_license_contains_mit_text(self) -> None:
        license_text = self.read_required(LICENSE)

        self.assertIn("MIT License", license_text)

    def test_readme_local_links_resolve(self) -> None:
        readme = self.read_required(README)
        local_links = re.findall(r"\[[^\]]+\]\((?!https?://|#)([^)]+)\)", readme)

        self.assertTrue(local_links, "README should link to local project documentation")
        for target in local_links:
            self.assertTrue((ROOT / target).is_file(), f"broken local link: {target}")


if __name__ == "__main__":
    unittest.main()
