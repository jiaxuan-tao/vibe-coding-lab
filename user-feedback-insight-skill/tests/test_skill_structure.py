from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]


class SkillStructureTests(unittest.TestCase):
    def test_required_files_and_trigger_contract_exist(self):
        skill = (ROOT / "SKILL.md").read_text(encoding="utf-8")

        self.assertTrue(skill.startswith("---\nname: user-feedback-insight\n"))
        for phrase in [
            "访谈记录",
            "客服工单",
            "问卷开放题",
            "应用商店评论",
            "分析范围与限制",
            "证据台账",
            "主题与矛盾",
            "产品机会",
            "行动建议",
            "待补证据",
        ]:
            self.assertIn(phrase, skill)

        self.assertTrue((ROOT / "agents" / "openai.yaml").is_file())

    def test_frontmatter_contains_only_name_and_description(self):
        skill = (ROOT / "SKILL.md").read_text(encoding="utf-8")
        match = re.match(r"^---\n(.*?)\n---\n", skill, re.DOTALL)

        self.assertIsNotNone(match)
        keys = [
            line.split(":", 1)[0]
            for line in match.group(1).splitlines()
            if ":" in line
        ]
        self.assertEqual(keys, ["name", "description"])

    def test_skill_separates_evidence_dimensions_and_actions(self):
        skill = (ROOT / "SKILL.md").read_text(encoding="utf-8")

        for phrase in [
            "样本内频次",
            "独立来源",
            "严重度",
            "证据置信度",
            "战略匹配",
            "立即处理",
            "进入验证",
            "持续观察",
            "暂不推进",
        ]:
            self.assertIn(phrase, skill)

        self.assertNotIn("总分", skill)

    def test_skill_keeps_product_opportunity_before_feature_solution(self):
        skill = (ROOT / "SKILL.md").read_text(encoding="utf-8")

        opportunity_position = skill.index("## 5. 产品机会")
        solution_position = skill.index("用户提出的功能方案")
        self.assertLess(opportunity_position, solution_position)

    def test_skill_requires_evidence_ids_and_sample_boundaries(self):
        skill = (ROOT / "SKILL.md").read_text(encoding="utf-8")

        self.assertIn("相关证据 ID", skill)
        self.assertIn("不能外推", skill)
        self.assertIn("同一来源", skill)
        self.assertIn("不等于独立佐证", skill)

    def test_action_output_uses_exact_values_per_opportunity(self):
        skill = (ROOT / "SKILL.md").read_text(encoding="utf-8")

        self.assertIn("每个产品机会占一行", skill)
        self.assertIn("建议列完整填写以下四个值之一", skill)
        self.assertIn(
            "| 产品机会 | 建议 | 理由 | 依据 | 下一步 |",
            skill,
        )


if __name__ == "__main__":
    unittest.main()
