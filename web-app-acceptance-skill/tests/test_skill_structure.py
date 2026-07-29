import unittest
from pathlib import Path


SKILL_DIR = Path(__file__).parents[1]
REPOSITORY_ROOT = SKILL_DIR.parent


class SkillStructureTests(unittest.TestCase):
    def test_skill_has_required_frontmatter_and_phase_order(self):
        skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")

        self.assertTrue(skill.startswith("---\nname: web-app-acceptance\n"))
        self.assertIn("description:", skill)
        self.assertLess(skill.index("## 1. 范围与关键路径"), skill.index("## 2. 证据采集"))
        self.assertLess(skill.index("## 2. 证据采集"), skill.index("## 3. 风险分级"))
        self.assertLess(skill.index("## 3. 风险分级"), skill.index("## 5. 发布建议"))
        self.assertIn("阻塞", skill)
        self.assertIn("有条件发布", skill)
        self.assertIn("未覆盖范围", skill)

    def test_skill_documents_attribution_and_resources(self):
        readme = (SKILL_DIR / "README.md").read_text(encoding="utf-8")
        upstream = (SKILL_DIR / "UPSTREAM.md").read_text(encoding="utf-8")

        self.assertTrue((SKILL_DIR / "LICENSE.txt").is_file())
        self.assertTrue((SKILL_DIR / "references" / "browser-acceptance-checklist.md").is_file())
        self.assertIn("Apache-2.0", readme)
        self.assertIn("anthropics/skills", upstream)

    def test_readme_explains_product_decision_mechanism(self):
        readme = (SKILL_DIR / "README.md").read_text(encoding="utf-8")

        for heading in [
            "它解决什么问题",
            "决策模型",
            "风险等级",
            "输出示例",
            "能力边界",
            "AI 辅助开发说明",
            "参考与许可",
        ]:
            self.assertIn(heading, readme)
        self.assertIn("有条件发布", readme)
        self.assertLess(readme.index("参考与许可"), len(readme))

    def test_repository_readme_links_to_skill(self):
        root_readme = (REPOSITORY_ROOT / "README.md").read_text(encoding="utf-8")

        self.assertIn("web-app-acceptance-skill/README.md", root_readme)


if __name__ == "__main__":
    unittest.main()
