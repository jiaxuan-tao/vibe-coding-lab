import importlib.util
import tempfile
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).parents[1] / "scripts" / "check_static_site.py"
SPEC = importlib.util.spec_from_file_location("check_static_site", SCRIPT_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class CheckStaticSiteTests(unittest.TestCase):
    def test_reports_missing_local_page_and_resource(self):
        with tempfile.TemporaryDirectory() as directory:
            site_dir = Path(directory)
            (site_dir / "images").mkdir()
            (site_dir / "images" / "logo.svg").write_text("<svg/>", encoding="utf-8")
            (site_dir / "index.html").write_text(
                """<a href="guide.html">指南</a>
                <a href="missing.html">缺失页</a>
                <img src="images/logo.svg">
                <img src="images/logo.png">
                <a href="https://example.com">外部</a>
                <a href="#details">锚点</a>""",
                encoding="utf-8",
            )
            (site_dir / "guide.html").write_text("<p>Guide</p>", encoding="utf-8")

            report = MODULE.check_site(site_dir)

        self.assertEqual(report["status"], "failed")
        self.assertEqual(report["pages_scanned"], 2)
        self.assertEqual(report["broken_links"], ["missing.html"])
        self.assertEqual(report["missing_resources"], ["images/logo.png"])
        self.assertEqual(report["skipped"], ["#details", "https://example.com"])

    def test_passes_for_existing_relative_references(self):
        with tempfile.TemporaryDirectory() as directory:
            site_dir = Path(directory)
            (site_dir / "assets").mkdir()
            (site_dir / "assets" / "app.js").write_text("console.log('ok')", encoding="utf-8")
            (site_dir / "about.html").write_text("<p>About</p>", encoding="utf-8")
            (site_dir / "index.html").write_text(
                '<a href="about.html">关于</a><script src="assets/app.js"></script>',
                encoding="utf-8",
            )

            report = MODULE.check_site(site_dir)

        self.assertEqual(report["status"], "passed")
        self.assertEqual(report["broken_links"], [])
        self.assertEqual(report["missing_resources"], [])


if __name__ == "__main__":
    unittest.main()
