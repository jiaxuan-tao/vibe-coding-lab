import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class DocumentationTest(unittest.TestCase):
    def test_readme_matches_repository_style_and_explains_safe_operation(self):
        text = (ROOT / "README.md").read_text(encoding="utf-8")

        for expected in (
            "# 产品经理 AI 工作流 Skill",
            "🎯 它解决什么问题",
            "🧭 四阶段工作流",
            "✨ 核心能力",
            "🛠️ 安装与使用",
            "📁 项目结构",
            "⚠️ 能力边界",
            "$edu-pm-workflow",
            "--no-launcher",
            "LaunchAgent",
            "卸载",
            "python3 -m unittest",
            "TA说",
        ):
            self.assertIn(expected, text)

        for private_wording in ("面试", "讲述稿", "INTERVIEW-GUIDE.md"):
            self.assertNotIn(private_wording, text)

    def test_public_descriptions_omit_author_attribution(self):
        for relative in ("README.md", "agents/openai.yaml"):
            text = (ROOT / relative).read_text(encoding="utf-8")
            for attribution in (
                "产品我不会", "beautfulmt", "PM-K12--skills", "原作者",
                "上游作者", "UPSTREAM.md", "UPSTREAM-PERMISSION.md",
            ):
                self.assertNotIn(attribution, text, relative)
        self.assertFalse((ROOT / "UPSTREAM.md").exists())
        self.assertFalse((ROOT / "UPSTREAM-PERMISSION.md").exists())

    def test_private_talking_script_is_not_published(self):
        self.assertFalse((ROOT / "INTERVIEW-GUIDE.md").exists())

    def test_runtime_validation_record_is_reproducible_and_honest(self):
        text = (ROOT / "tests/behavior/runtime-validation.md").read_text(encoding="utf-8")

        for expected in (
            "initialize.py --project",
            "--no-launcher",
            "只读健康检查",
            "项目身份与路径校验",
            "复制与保存降级",
            "hash 与跨页面 message 同步",
            "Node Playwright",
            "已执行：`/api/screenshot`",
            "临时 Python playwright 1.60.0",
            "没有下载浏览器",
            "PM_PYTHON",
            "PM_PY_PLAYWRIGHT",
            "PM_NODE_PLAYWRIGHT",
            "PM_TEST_BROWSER_CHANNEL",
            "不覆盖 HOME",
        ):
            self.assertIn(expected, text)

        portable = text.split("### 便携命令", 1)[1].split("### 本机执行记录", 1)[0]
        self.assertNotIn("/Users/taojiaxuan", portable)
        self.assertNotIn("/tmp/pm-workflow-python-playwright", portable)

        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn("🧪 本地验证", readme)
        self.assertIn("tests/behavior/runtime-validation.md", readme)


if __name__ == "__main__":
    unittest.main()
