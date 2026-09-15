import importlib.util
import os
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INITIALIZER = ROOT / "scripts/initialize.py"


class RuntimeContractTest(unittest.TestCase):
    def install(self, project):
        result = subprocess.run(
            [sys.executable, str(INITIALIZER), "--project", str(project), "--no-launcher"],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def load_server(self, project):
        scripts = project / "scripts"
        old_root = os.environ.get("PROTOTYPE_PROJECT_DIR")
        os.environ["PROTOTYPE_PROJECT_DIR"] = str(project)
        sys.path.insert(0, str(scripts))
        try:
            name = "runtime_contract_server_" + project.name.replace("-", "_")
            spec = importlib.util.spec_from_file_location(name, scripts / "prototype_server.py")
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            return module
        finally:
            sys.path.remove(str(scripts))
            if old_root is None:
                os.environ.pop("PROTOTYPE_PROJECT_DIR", None)
            else:
                os.environ["PROTOTYPE_PROJECT_DIR"] = old_root

    def test_no_launcher_install_creates_private_runtime_config(self):
        with tempfile.TemporaryDirectory() as tmp:
            project = Path(tmp) / "project"
            self.install(project)
            config = project / ".pm-workflow/runtime.json"
            self.assertTrue(config.is_file())
            if os.name != "nt":
                self.assertEqual(stat.S_IMODE(config.stat().st_mode), 0o600)
            self.assertTrue((project / ".handoff").is_dir())
            self.assertFalse((project / "scripts/.venv").exists())

    def test_nested_artifacts_route_to_their_requirement_screenshot_directories(self):
        with tempfile.TemporaryDirectory() as tmp:
            project = Path(tmp) / "project"
            self.install(project)
            prototype = project / "验证需求/原型/demo-prototype.html"
            flow = project / "验证需求/流程图/demo-flow.html"
            prototype.parent.mkdir(parents=True)
            flow.parent.mkdir(parents=True)
            prototype.write_text("<!doctype html><div class='device' id='one'></div>", encoding="utf-8")
            flow.write_text("<!doctype html><div class='chart-container'></div>", encoding="utf-8")
            server = self.load_server(project)

            self.assertEqual(server._output_root_for(prototype), project.resolve() / "验证需求/原型截图")
            self.assertEqual(server._output_root_for(flow), project.resolve() / "验证需求/流程图截图")

    def test_writable_resolution_rejects_project_root_and_keeps_hash_query(self):
        with tempfile.TemporaryDirectory() as tmp:
            project = Path(tmp) / "project"
            self.install(project)
            prd = project / "验证需求/需求文档/demo-PRD.html"
            prototype = project / "验证需求/原型/demo-prototype.html"
            prd.parent.mkdir(parents=True)
            prototype.parent.mkdir(parents=True)
            prd.write_text("<!doctype html>", encoding="utf-8")
            prototype.write_text("<!doctype html>", encoding="utf-8")
            root_html = project / "root.html"
            root_html.write_text("<!doctype html>", encoding="utf-8")
            server = self.load_server(project)

            resolved, page_id, query = server._resolve_ref_html(
                "../原型/demo-prototype.html?only=main#state-two", str(prd)
            )
            self.assertEqual(resolved, prototype.resolve())
            self.assertEqual(page_id, "state-two")
            self.assertEqual(query, "only=main")
            with self.assertRaises(PermissionError):
                server._resolve_writable_html_path(str(root_html))


if __name__ == "__main__":
    unittest.main()
