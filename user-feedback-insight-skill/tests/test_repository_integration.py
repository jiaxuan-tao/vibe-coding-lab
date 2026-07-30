from pathlib import Path
import unittest


SKILL_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = SKILL_ROOT.parent


class RepositoryIntegrationTests(unittest.TestCase):
    def test_root_readme_indexes_the_skill(self):
        readme = (REPOSITORY_ROOT / "README.md").read_text(encoding="utf-8")

        self.assertIn(
            "[用户反馈洞察 Skill](user-feedback-insight-skill/README.md)",
            readme,
        )
        self.assertIn("`user-feedback-insight-skill/`", readme)

    def test_project_index_links_the_skill(self):
        project_index = (REPOSITORY_ROOT / "projects" / "README.md").read_text(
            encoding="utf-8"
        )

        self.assertIn(
            "../user-feedback-insight-skill/README.md",
            project_index,
        )

    def test_showcase_excludes_the_skill_card(self):
        site = (REPOSITORY_ROOT / "site" / "index.html").read_text(
            encoding="utf-8"
        )

        self.assertNotIn("user-feedback-insight-skill", site)
        self.assertNotIn("用户反馈洞察 Skill", site)


if __name__ == "__main__":
    unittest.main()
