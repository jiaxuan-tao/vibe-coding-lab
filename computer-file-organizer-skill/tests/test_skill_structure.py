from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]


class SkillStructureTests(unittest.TestCase):
    def test_skill_has_valid_trigger_frontmatter(self):
        skill = (ROOT / "SKILL.md").read_text(encoding="utf-8")

        self.assertTrue(skill.startswith("---\nname: computer-file-organizer\n"))
        match = re.search(r"^description: (.+)$", skill, re.MULTILINE)
        self.assertIsNotNone(match)
        description = match.group(1)
        for phrase in ["下载", "桌面", "文件夹", "整理", "重复文件"]:
            self.assertIn(phrase, description)
        self.assertIn("不用于邮件", description)

    def test_skill_enforces_preview_confirmation_and_undo(self):
        skill = (ROOT / "SKILL.md").read_text(encoding="utf-8")

        for phrase in [
            "先计划，后执行",
            "明确确认",
            "--confirm",
            "不删除",
            "不覆盖",
            "撤销",
            "部分失败",
        ]:
            self.assertIn(phrase, skill)

    def test_required_resources_exist(self):
        for relative in [
            "agents/openai.yaml",
            "scripts/organize_files.py",
            "references/file-organization-policy.md",
        ]:
            self.assertTrue((ROOT / relative).is_file(), relative)

    def test_agent_metadata_matches_skill(self):
        metadata = (ROOT / "agents" / "openai.yaml").read_text(encoding="utf-8")

        self.assertIn('display_name: "电脑文件整理"', metadata)
        self.assertIn("$computer-file-organizer", metadata)
        match = re.search(r'short_description: "([^"]+)"', metadata)
        self.assertIsNotNone(match)
        self.assertGreaterEqual(len(match.group(1)), 25)
        self.assertLessEqual(len(match.group(1)), 64)


if __name__ == "__main__":
    unittest.main()
