from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]


class DocumentationTests(unittest.TestCase):
    def test_readme_has_product_narrative(self):
        readme = (ROOT / "README.md").read_text(encoding="utf-8")

        required = [
            "它解决什么问题",
            "洞察模型",
            "使用方法",
            "输出示例",
            "核心能力",
            "本地验证",
            "技术实现",
            "能力边界",
            "AI 辅助开发说明",
            "参考与许可",
            "证据台账",
            "独立来源",
            "产品机会",
        ]
        for phrase in required:
            self.assertIn(phrase, readme)

    def test_readme_narrative_order_matches_product_reasoning(self):
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        sections = [
            "## 🎯 它解决什么问题",
            "## 🧭 洞察模型",
            "## 🛠️ 使用方法",
            "## 🧾 输出示例",
            "## ✨ 核心能力",
            "## 🧪 本地验证",
            "## 🔧 技术实现",
            "## ⚠️ 能力边界",
            "## 🤖 AI 辅助开发说明",
            "## 📚 参考与许可",
        ]

        positions = [readme.index(section) for section in sections]
        self.assertEqual(positions, sorted(positions))

    def test_readme_uses_primary_and_compatibility_install_paths(self):
        readme = (ROOT / "README.md").read_text(encoding="utf-8")

        self.assertIn("$HOME/.agents/skills/user-feedback-insight", readme)
        self.assertIn("$CODEX_HOME/skills/user-feedback-insight", readme)
        self.assertIn("兼容", readme)

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

        self.assertIn("aws-solutions-library-samples", upstream)
        self.assertIn("MIT-0", upstream)
        self.assertIn("Meituan-Dianping/asap", upstream)
        self.assertIn("Apache-2.0", upstream)
        self.assertIn("focused reimplementation", upstream)
        self.assertIn("MIT License", license_text)

    def test_reference_defines_evidence_and_action_contract(self):
        reference = (
            ROOT / "references" / "feedback-analysis-framework.md"
        ).read_text(encoding="utf-8")

        for phrase in [
            "证据原子",
            "来源多样性",
            "样本内频次",
            "反证",
            "立即处理",
            "进入验证",
            "持续观察",
            "暂不推进",
            "完整示例",
        ]:
            self.assertIn(phrase, reference)

    def test_agent_metadata_matches_skill(self):
        metadata = (ROOT / "agents" / "openai.yaml").read_text(encoding="utf-8")

        self.assertIn('display_name: "用户反馈洞察"', metadata)
        self.assertIn("$user-feedback-insight", metadata)
        description_match = re.search(
            r'short_description: "([^"]+)"',
            metadata,
        )
        self.assertIsNotNone(description_match)
        self.assertGreaterEqual(len(description_match.group(1)), 25)
        self.assertLessEqual(len(description_match.group(1)), 64)

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
        self.assertIn("改进矩阵", forward)


if __name__ == "__main__":
    unittest.main()
