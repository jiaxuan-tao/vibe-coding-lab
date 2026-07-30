import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "prepare_feedback.py"


class PrepareFeedbackTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.base = Path(self.temp_dir.name)

    def tearDown(self):
        self.temp_dir.cleanup()

    def write_bytes(self, name, content):
        path = self.base / name
        path.write_bytes(content)
        return path

    def write_text(self, name, content):
        path = self.base / name
        path.write_text(content, encoding="utf-8")
        return path

    def run_script(self, path):
        return subprocess.run(
            [sys.executable, str(SCRIPT), str(path)],
            capture_output=True,
            text=True,
            check=False,
        )

    def parse_success(self, path):
        result = self.run_script(path)
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def test_markdown_paragraphs_get_stable_ids_and_lines(self):
        path = self.write_text(
            "feedback.md",
            "第一条反馈\n还有一行补充\n\n第二条反馈\n",
        )

        payload = self.parse_success(path)

        self.assertEqual(
            [item["id"] for item in payload["records"]],
            ["FB-0001", "FB-0002"],
        )
        self.assertEqual(
            [item["source_line"] for item in payload["records"]],
            [1, 4],
        )
        self.assertEqual(
            payload["records"][0]["text"],
            "第一条反馈\n还有一行补充",
        )
        self.assertEqual(payload["format"], "text")

    def test_markdown_list_items_become_separate_records(self):
        path = self.write_text(
            "feedback.md",
            "- 同步失败\n- 更新后打不开\n3. 希望导出 PDF\n",
        )

        payload = self.parse_success(path)

        self.assertEqual(
            [item["text"] for item in payload["records"]],
            ["同步失败", "更新后打不开", "希望导出 PDF"],
        )
        self.assertEqual(
            [item["source_line"] for item in payload["records"]],
            [1, 2, 3],
        )

    def test_csv_uses_supported_text_and_source_fields(self):
        path = self.write_text(
            "feedback.csv",
            "user_id,feedback,version\n"
            "U-1,同步失败,1.2.0\n"
            "U-2,导出为空,1.2.0\n",
        )

        payload = self.parse_success(path)

        self.assertEqual(
            [item["source"] for item in payload["records"]],
            ["U-1", "U-2"],
        )
        self.assertEqual(
            [item["text"] for item in payload["records"]],
            ["同步失败", "导出为空"],
        )
        self.assertEqual(
            [item["source_line"] for item in payload["records"]],
            [2, 3],
        )
        self.assertEqual(payload["summary"]["unique_source_count"], 2)

    def test_json_accepts_container_and_chinese_fields(self):
        path = self.write_text(
            "feedback.json",
            json.dumps(
                {
                    "items": [
                        {"用户": "访谈-A", "反馈": "字段映射重复配置"},
                        {"用户": "访谈-B", "反馈": "错误行无法定位"},
                    ]
                },
                ensure_ascii=False,
            ),
        )

        payload = self.parse_success(path)

        self.assertEqual(payload["format"], "json")
        self.assertEqual(payload["records"][1]["text"], "错误行无法定位")
        self.assertEqual(payload["records"][0]["source"], "访谈-A")
        self.assertIsNone(payload["records"][0]["source_line"])

    def test_duplicate_detection_is_normalized_but_non_destructive(self):
        path = self.write_text(
            "feedback.txt",
            "同步  经常失败！\n\n同步 经常失败!\n\n同步偶尔失败\n",
        )
        before = path.read_bytes()

        payload = self.parse_success(path)

        self.assertIsNone(payload["records"][0]["duplicate_of"])
        self.assertEqual(payload["records"][1]["duplicate_of"], "FB-0001")
        self.assertIsNone(payload["records"][2]["duplicate_of"])
        self.assertEqual(payload["summary"]["duplicate_count"], 1)
        self.assertEqual(payload["summary"]["unique_record_count"], 2)
        self.assertEqual(path.read_bytes(), before)

    def test_detects_email_and_mainland_mobile_without_redacting_input(self):
        path = self.write_text(
            "feedback.txt",
            "请联系 li@example.com 或 13800000000，我无法导出。",
        )

        payload = self.parse_success(path)

        self.assertEqual(
            payload["records"][0]["pii_types"],
            ["email", "phone_cn"],
        )
        self.assertEqual(payload["summary"]["pii_record_count"], 1)
        self.assertTrue(
            any("潜在直接身份信息" in warning for warning in payload["warnings"])
        )
        self.assertIn("li@example.com", payload["records"][0]["text"])

    def test_missing_source_fields_are_not_counted_as_independent_sources(self):
        path = self.write_text(
            "feedback.json",
            json.dumps(["第一条", "第二条"], ensure_ascii=False),
        )

        payload = self.parse_success(path)

        self.assertEqual(payload["summary"]["source_count"], 0)
        self.assertEqual(payload["summary"]["unique_source_count"], 0)
        self.assertTrue(
            any("独立来源数" in warning for warning in payload["warnings"])
        )

    def test_missing_file_returns_two(self):
        result = self.run_script(self.base / "missing.csv")

        self.assertEqual(result.returncode, 2)
        self.assertIn("文件不存在", result.stderr)

    def test_directory_returns_two(self):
        result = self.run_script(self.base)

        self.assertEqual(result.returncode, 2)
        self.assertIn("必须是文件", result.stderr)

    def test_unsupported_extension_returns_two(self):
        path = self.write_text("feedback.xlsx", "not really xlsx")

        result = self.run_script(path)

        self.assertEqual(result.returncode, 2)
        self.assertIn("不支持的文件类型", result.stderr)

    def test_non_utf8_returns_two(self):
        path = self.write_bytes("feedback.txt", b"\xff\xfe\x00\x00")

        result = self.run_script(path)

        self.assertEqual(result.returncode, 2)
        self.assertIn("UTF-8", result.stderr)

    def test_empty_usable_input_returns_two(self):
        path = self.write_text("feedback.md", "\n\n  \n")

        result = self.run_script(path)

        self.assertEqual(result.returncode, 2)
        self.assertIn("没有可用反馈", result.stderr)

    def test_invalid_json_returns_two(self):
        path = self.write_text("feedback.json", "{not-json}")

        result = self.run_script(path)

        self.assertEqual(result.returncode, 2)
        self.assertIn("JSON", result.stderr)

    def test_csv_without_supported_text_field_returns_two(self):
        path = self.write_text("feedback.csv", "id,rating\n1,5\n")

        result = self.run_script(path)

        self.assertEqual(result.returncode, 2)
        self.assertIn("反馈文本列", result.stderr)


if __name__ == "__main__":
    unittest.main()
