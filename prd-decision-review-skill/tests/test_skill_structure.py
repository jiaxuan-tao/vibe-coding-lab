from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "SKILL.md"


class SkillStructureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = SKILL.read_text(encoding="utf-8")

    def test_frontmatter_has_only_required_fields(self):
        match = re.match(r"^---\n(.*?)\n---", self.text, re.S)
        self.assertIsNotNone(match)
        keys = [
            line.split(":", 1)[0].strip()
            for line in match.group(1).splitlines()
            if ":" in line
        ]
        self.assertEqual(keys, ["name", "description"])
        self.assertIn("name: prd-decision-review", match.group(1))
        self.assertIn("当用户要求评审 PRD", match.group(1))

    def test_frontmatter_trigger_is_limited_to_product_requirement_context(self):
        match = re.match(r"^---\n(.*?)\n---", self.text, re.S)
        self.assertIsNotNone(match)
        description = next(
            line.split(":", 1)[1].strip()
            for line in match.group(1).splitlines()
            if line.startswith("description:")
        )

        for marker in ["PRD", "产品需求文档", "需求立项语境"]:
            self.assertIn(marker, description)
        for adjacent_negative in [
            "纯文案润色",
            "技术架构设计",
            "实施任务拆解",
            "已完成 Web 产品的交付验收",
        ]:
            self.assertIn(adjacent_negative, description)

    def test_review_order_starts_with_problem_and_evidence(self):
        required = [
            "输入分类", "用户问题", "证据与假设", "目标与指标", "MVP 范围",
            "关键流程", "需求与验收", "依赖与风险", "一致性", "结论与下一步",
            "按需修订",
        ]
        body = self.text.split("---", 2)[2]
        positions = [body.index(item) for item in required]
        self.assertEqual(positions, sorted(positions))

    def test_gate_decisions_and_evidence_buckets_are_required(self):
        for value in ["可进入设计", "有条件进入", "暂不建议推进",
                      "已确认", "假设", "待确认"]:
            self.assertIn(value, self.text)

    def test_revision_is_opt_in_and_scoring_is_rejected(self):
        self.assertIn("仅在用户明确要求", self.text)
        self.assertIn("不输出总分", self.text)

    def test_output_contains_decision_reason_impact_evidence_and_action(self):
        for value in ["一句话理由", "影响", "依据", "最小动作"]:
            self.assertIn(value, self.text)

    def test_skill_wires_reference_and_read_only_structure_evidence(self):
        for value in [
            "references/prd-review-framework.md",
            "scripts/inspect_prd.py",
            "结构证据",
            "不修改原文件",
        ]:
            self.assertIn(value, self.text)

    def test_vague_idea_outputs_brief_before_full_prd(self):
        self.assertIn("可评审 Brief", self.text)
        self.assertIn("不直接扩写完整 PRD", self.text)

    def test_gate_decision_is_limited_to_exactly_three_options(self):
        body = self.text.split("---", 2)[2]
        match = re.search(
            r"结论只能从以下三项中选择，不得新增其他结论：(.+?)。",
            body,
        )
        self.assertIsNotNone(match)
        self.assertEqual(
            set(match.group(1).split("、")),
            {"可进入设计", "有条件进入", "暂不建议推进"},
        )


if __name__ == "__main__":
    unittest.main()
