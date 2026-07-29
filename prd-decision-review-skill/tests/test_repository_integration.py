"""Contract tests for repository-level Skill discovery links."""

from pathlib import Path
import unittest


REPO = Path(__file__).resolve().parents[2]


class RepositoryIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.root_readme = (REPO / "README.md").read_text(encoding="utf-8")
        cls.projects = (REPO / "projects/README.md").read_text(encoding="utf-8")
        cls.site = (REPO / "site/index.html").read_text(encoding="utf-8")

    def test_root_readme_links_the_prd_review_skill(self) -> None:
        self.assertIn(
            "prd-decision-review-skill/README.md",
            self.root_readme,
        )
        self.assertIn("PRD 需求决策评审 Skill", self.root_readme)

    def test_project_index_links_the_prd_review_skill(self) -> None:
        self.assertIn(
            "../prd-decision-review-skill/README.md",
            self.projects,
        )

    def test_showcase_excludes_the_prd_review_skill_card(self) -> None:
        self.assertNotIn(
            "https://github.com/jiaxuan-tao/vibe-coding-lab/tree/main/"
            "prd-decision-review-skill",
            self.site,
        )
        self.assertNotIn("PRD 需求决策评审 Skill", self.site)


if __name__ == "__main__":
    unittest.main()
