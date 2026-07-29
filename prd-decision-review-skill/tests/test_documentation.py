"""Contract tests for user-facing documentation and attribution."""

from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"
UPSTREAM = ROOT / "UPSTREAM.md"
LICENSE = ROOT / "LICENSE.txt"
FORWARD_EVALUATION = ROOT / "tests" / "forward-evaluation.md"
TRIGGER_EVALUATION = ROOT / "tests" / "trigger-evaluation.md"
SPEC_KIT_TEMPLATE_URL = (
    "https://github.com/github/spec-kit/blob/main/templates/spec-template.md"
)
OPENSPEC_SCHEMA_URL = (
    "https://github.com/Fission-AI/OpenSpec/blob/main/"
    "schemas/spec-driven/schema.yaml"
)

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
NARRATIVE_ORDER = [
    "它解决什么问题",
    "决策模型",
    "使用方法",
    "输出示例",
    "核心能力",
    "本地验证",
    "技术实现",
    "能力边界",
    "AI 辅助开发说明",
    "参考与许可",
]
GATE_VALUES = {"可进入设计", "有条件进入", "暂不建议推进"}
MIT_MARKERS = [
    "MIT License",
    "Permission is hereby granted, free of charge",
    "The above copyright notice and this permission notice shall be included",
    'THE SOFTWARE IS PROVIDED "AS IS"',
    "OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS",
]


class DocumentationTests(unittest.TestCase):
    def read_required(self, path: Path) -> str:
        self.assertTrue(path.is_file(), f"missing documentation file: {path.name}")
        return path.read_text(encoding="utf-8")

    def test_readme_has_required_product_narrative(self) -> None:
        readme = self.read_required(README)

        for heading in REQUIRED_HEADINGS:
            self.assertRegex(readme, rf"(?m)^## .*{re.escape(heading)}$")

    def test_readme_narrative_follows_the_approved_product_sequence(self) -> None:
        readme = self.read_required(README)
        level_two_headings = re.findall(r"(?m)^## (.+)$", readme)
        positions = [
            next(
                index
                for index, actual_heading in enumerate(level_two_headings)
                if expected_heading in actual_heading
            )
            for expected_heading in NARRATIVE_ORDER
        ]

        self.assertEqual(positions, sorted(positions))
        self.assertIn("参考与许可", level_two_headings[-1])

    def test_readme_has_primary_agents_install_and_labeled_compatibility_path(self) -> None:
        readme = self.read_required(README)

        self.assertIn("$HOME/.agents/skills/prd-decision-review", readme)
        self.assertIn("mkdir -p \"$HOME/.agents/skills/prd-decision-review\"", readme)
        self.assertRegex(
            readme,
            r"cp -R vibe-coding-lab/prd-decision-review-skill/\."
            r" \\\n  \"\$HOME/\.agents/skills/prd-decision-review/\"",
        )
        self.assertIn("当前 Codex 构建的兼容路径", readme)
        self.assertIn("$CODEX_HOME/skills", readme)
        self.assertNotIn("mkdir -p ~/.codex/skills/prd-decision-review", readme)
        for relative_path in [
            "SKILL.md",
            "references/prd-review-framework.md",
            "scripts/inspect_prd.py",
        ]:
            self.assertTrue((ROOT / relative_path).is_file())
        self.assertNotIn("完全原创", readme)

    def test_inspector_contract_accepts_utf8_text_with_markdown_recommended(self) -> None:
        readme = self.read_required(README)
        skill = self.read_required(ROOT / "SKILL.md")

        for text in (readme, skill):
            self.assertIn("UTF-8 文本", text)
            self.assertIn("推荐使用 Markdown", text)
        self.assertNotIn("仅当存在本地 Markdown PRD", skill)
        self.assertNotIn("检查器接受 UTF-8 Markdown 文件", readme)

    def test_forward_evaluation_discloses_missing_original_run_metadata(self) -> None:
        evaluation = self.read_required(FORWARD_EVALUATION)

        self.assertIn("原始运行 ID", evaluation)
        self.assertIn("未捕获", evaluation)
        self.assertIn("无法追溯补录", evaluation)

    def test_trigger_evaluation_records_blocker_without_fabricated_runs(self) -> None:
        evaluation = self.read_required(TRIGGER_EVALUATION)

        for marker in [
            "Codex CLI",
            "候选提交",
            "调用方式",
            "执行状态：阻塞",
            "运行 ID：未生成",
            "模型：不可观察",
            "安全审查拒绝",
        ]:
            self.assertIn(marker, evaluation)
        self.assertGreaterEqual(evaluation.count("### Case "), 4)
        self.assertNotIn("$prd-decision-review", evaluation)
        self.assertNotIn("选择结果：通过", evaluation)

    def test_trigger_evaluation_labels_description_only_fallback(self) -> None:
        evaluation = self.read_required(TRIGGER_EVALUATION)

        for marker in [
            "/root/trigger_eval_positive",
            "/root/trigger_eval_negative",
            "gpt-5.6-terra",
            "reasoning high",
            "独立描述选择评估",
            "不等于运行时自动发现",
        ]:
            self.assertIn(marker, evaluation)
        self.assertIn('"selected": true', evaluation)
        self.assertGreaterEqual(evaluation.count('"selected": false'), 4)

    def test_readme_gate_table_has_exactly_three_supported_decisions(self) -> None:
        readme = self.read_required(README)
        gate_rows = re.findall(r"(?m)^\| \*\*(.+?)\*\* \|", readme)

        self.assertEqual(len(gate_rows), 3)
        self.assertEqual(set(gate_rows), GATE_VALUES)

    def test_output_example_separates_evidence_assumption_and_to_confirm(self) -> None:
        readme = self.read_required(README)
        example = readme[
            readme.index("## 🧾 输出示例") : readme.index("## ✨ 核心能力")
        ]
        positions = [
            example.index("- 已确认："),
            example.index("- 假设："),
            example.index("- 待确认："),
        ]

        self.assertEqual(positions, sorted(positions))

    def test_upstream_attributes_scenario_formats_to_current_official_sources(self) -> None:
        upstream = self.read_required(UPSTREAM)
        spec_kit = upstream[
            upstream.index("## GitHub Spec Kit") : upstream.index("## OpenSpec")
        ]
        openspec = upstream[
            upstream.index("## OpenSpec") : upstream.index("## 本项目的实现策略")
        ]

        self.assertIn("github/spec-kit", upstream)
        self.assertIn("Fission-AI/OpenSpec", upstream)
        self.assertGreaterEqual(upstream.count("MIT"), 2)
        self.assertIn(SPEC_KIT_TEMPLATE_URL, spec_kit)
        self.assertIn("GIVEN / WHEN / THEN", spec_kit)
        self.assertIn(OPENSPEC_SCHEMA_URL, openspec)
        self.assertIn("WHEN / THEN", openspec)
        self.assertNotIn("GIVEN", openspec)

    def test_readme_links_sources_and_calls_strategy_focused_reimplementation(self) -> None:
        readme = self.read_required(README)
        upstream = self.read_required(UPSTREAM)

        for text in (readme, upstream):
            for marker in [
                SPEC_KIT_TEMPLATE_URL,
                OPENSPEC_SCHEMA_URL,
                "focused reimplementation",
            ]:
                self.assertTrue(marker in text, f"missing documentation marker: {marker}")

    def test_readme_explains_inspector_keyword_false_positive_boundary(self) -> None:
        readme = self.read_required(README)

        for marker in ["全文", "关键词信号", "可能误报", "人工解读"]:
            self.assertTrue(marker in readme, f"missing inspector boundary: {marker}")
        self.assertNotIn("脚本读取标题", readme)
        self.assertNotIn("只读检查章节", readme)

    def test_readme_distinguishes_executable_tests_from_forward_evaluation(self) -> None:
        readme = self.read_required(README)

        for marker in ["静态契约", "前向评估", "文档化的行为证据"]:
            self.assertTrue(marker in readme, f"missing test boundary: {marker}")
        self.assertNotRegex(readme, r"unittest.{0,50}典型评审行为")

    def test_license_contains_mit_text(self) -> None:
        license_text = self.read_required(LICENSE)

        for marker in MIT_MARKERS:
            self.assertIn(marker, license_text)

    def test_readme_local_links_resolve(self) -> None:
        readme = self.read_required(README)
        local_links = re.findall(r"\[[^\]]+\]\((?!https?://|#)([^)]+)\)", readme)

        self.assertTrue(local_links, "README should link to local project documentation")
        for target in local_links:
            self.assertTrue((ROOT / target).is_file(), f"broken local link: {target}")


if __name__ == "__main__":
    unittest.main()
