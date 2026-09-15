import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INITIALIZER = ROOT / "scripts/initialize.py"

MAPPED_DESTINATIONS = (
    "scripts/pm_runtime.py",
    "scripts/pm_bootstrap.py",
    "scripts/start_service.py",
    "scripts/prototype_server.py",
    "scripts/prototype_launcher.py",
    "scripts/pm_launchagent.py",
    "scripts/prototype-export-client.js",
    "scripts/validate_prd.py",
    "scripts/install_launcher.sh",
    "启动原型导出服务.command",
    "启动原型导出服务.bat",
    ".agents/workflows/edu-pm-prd.md",
    ".agents/workflows/edu-pm-demand.md",
    ".agents/workflows/edu-pm-acceptance.md",
    ".agents/workflows/edu-pm-data-analysis.md",
    "scripts/prd-content.html",
    "scripts/pencil-draw-prompt.md",
    "关键点.md",
    ".mcp.json.example",
)


def load_installer_mapping():
    spec = importlib.util.spec_from_file_location("installer_under_test", INITIALIZER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return tuple(destination for _source, destination, _kind in module.MAPPING)


class InitializeTest(unittest.TestCase):
    def run_installer(self, project):
        return subprocess.run(
            [
                sys.executable,
                str(INITIALIZER),
                "--project",
                str(project),
                "--no-launcher",
            ],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )

    def assert_install_succeeds(self, project):
        result = self.run_installer(project)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return result

    def test_install_creates_all_mapped_files_and_second_install_succeeds(self):
        self.assertEqual(len(MAPPED_DESTINATIONS), 19)
        self.assertEqual(load_installer_mapping(), MAPPED_DESTINATIONS)
        with tempfile.TemporaryDirectory() as tmp:
            project = Path(tmp) / "project"

            self.assert_install_succeeds(project)
            missing = [path for path in MAPPED_DESTINATIONS if not (project / path).is_file()]
            self.assertEqual(missing, [])

            second = self.assert_install_succeeds(project)
            self.assertIn("已是最新 19 项", second.stdout)

    def test_custom_edit_is_preserved_and_upstream_copy_goes_to_updates(self):
        with tempfile.TemporaryDirectory() as tmp:
            project = Path(tmp) / "project"
            self.assert_install_succeeds(project)
            destination = project / ".agents/workflows/edu-pm-prd.md"
            local_bytes = b"local custom workflow\n"
            destination.write_bytes(local_bytes)

            self.assert_install_succeeds(project)

            self.assertEqual(destination.read_bytes(), local_bytes)
            proposal = project / ".pm-workflow/updates/.agents/workflows/edu-pm-prd.md"
            self.assertEqual(
                proposal.read_bytes(),
                (ROOT / "assets/workflows/edu-pm-prd.md").read_bytes(),
            )

    def test_runtime_edit_is_replaced_and_prior_bytes_are_backed_up(self):
        with tempfile.TemporaryDirectory() as tmp:
            project = Path(tmp) / "project"
            self.assert_install_succeeds(project)
            destination = project / "scripts/validate_prd.py"
            local_bytes = b"local runtime edit\n"
            destination.write_bytes(local_bytes)

            self.assert_install_succeeds(project)

            self.assertEqual(
                destination.read_bytes(),
                (ROOT / "assets/scripts/validate_prd.py").read_bytes(),
            )
            backups = list(
                (project / ".handoff/skill-backups").glob(
                    "init-*/scripts/validate_prd.py"
                )
            )
            self.assertEqual(len(backups), 1)
            self.assertEqual(backups[0].read_bytes(), local_bytes)


if __name__ == "__main__":
    unittest.main()
