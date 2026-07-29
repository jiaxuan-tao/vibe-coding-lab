import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).parents[1] / "scripts" / "inspect_web_project.py"
SPEC = importlib.util.spec_from_file_location("inspect_web_project", SCRIPT_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class InspectWebProjectTests(unittest.TestCase):
    def test_reports_scripts_package_manager_and_build_directory(self):
        with tempfile.TemporaryDirectory() as directory:
            project_dir = Path(directory)
            (project_dir / "package.json").write_text(
                json.dumps({"scripts": {"build": "vite build", "test": "vitest"}}),
                encoding="utf-8",
            )

            result = MODULE.inspect_project(project_dir)

        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["package_manager"], "npm")
        self.assertEqual(result["scripts"]["build"], "vite build")
        self.assertIn("dist", result["build_directories"])
        self.assertEqual(result["warnings"], [])

    def test_reports_warning_when_package_json_is_missing(self):
        with tempfile.TemporaryDirectory() as directory:
            result = MODULE.inspect_project(Path(directory))

        self.assertEqual(result["status"], "warning")
        self.assertEqual(result["scripts"], {})
        self.assertIn("未找到 package.json", result["warnings"])

    def test_reports_invalid_package_json_without_raising(self):
        with tempfile.TemporaryDirectory() as directory:
            project_dir = Path(directory)
            (project_dir / "package.json").write_text("{invalid", encoding="utf-8")

            result = MODULE.inspect_project(project_dir)

        self.assertEqual(result["status"], "warning")
        self.assertIn("package.json 不是有效 JSON", result["warnings"])


if __name__ == "__main__":
    unittest.main()
