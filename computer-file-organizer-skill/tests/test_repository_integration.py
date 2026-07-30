from pathlib import Path
import unittest


SKILL_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = SKILL_ROOT.parent


class RepositoryIntegrationTests(unittest.TestCase):
    def test_root_readme_indexes_the_skill(self):
        readme = (REPOSITORY_ROOT / "README.md").read_text(encoding="utf-8")

        self.assertIn(
            "[电脑文件整理 Skill](computer-file-organizer-skill/README.md)",
            readme,
        )
        self.assertIn("`computer-file-organizer-skill/`", readme)

    def test_project_index_links_the_skill(self):
        project_index = (REPOSITORY_ROOT / "projects" / "README.md").read_text(
            encoding="utf-8"
        )

        self.assertIn("../computer-file-organizer-skill/README.md", project_index)

    def test_showcase_excludes_the_skill_card(self):
        site = (REPOSITORY_ROOT / "site" / "index.html").read_text(encoding="utf-8")

        self.assertNotIn("computer-file-organizer-skill", site)
        self.assertNotIn("电脑文件整理 Skill", site)


if __name__ == "__main__":
    unittest.main()
