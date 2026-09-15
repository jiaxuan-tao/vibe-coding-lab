import hashlib
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class UpstreamIntegrityTest(unittest.TestCase):
    def test_pinned_upstream_files_match_manifest(self):
        manifest = json.loads((ROOT / "upstream-manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(
            manifest["commit"],
            "9ffaeec62a55d50dc26aca8308d9aac67e237501",
        )
        self.assertEqual(len(manifest["files"]), 27)
        for relative, expected in manifest["files"].items():
            if relative == "SKILL.md" or relative in manifest["documentation_only"]:
                continue
            actual = hashlib.sha256((ROOT / relative).read_bytes()).hexdigest()
            self.assertEqual(actual, expected, relative)

    def test_readme_is_the_only_documentation_only_integrity_exception(self):
        manifest = json.loads((ROOT / "upstream-manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["documentation_only"], ["README.md"])
        self.assertEqual(
            manifest["files"]["README.md"],
            "ecf66c2d453506413faa39977d5da98fa41bd09a28f039ce1e8150031058fef6",
        )

    def test_skill_allows_only_codex_frontmatter_line_removal(self):
        manifest = json.loads((ROOT / "upstream-manifest.json").read_text(encoding="utf-8"))
        path = ROOT / "SKILL.md"
        actual = path.read_bytes()
        text = actual.decode("utf-8")
        self.assertNotIn("user-invocable: true\n", text)

        lines = text.splitlines(keepends=True)
        self.assertGreaterEqual(len(lines), 3)
        self.assertEqual(lines[0], "---\n")
        closing = next(index for index, line in enumerate(lines[1:], start=1) if line == "---\n")
        restored = "".join(lines[:closing] + ["user-invocable: true\n"] + lines[closing:])
        self.assertEqual(
            hashlib.sha256(restored.encode("utf-8")).hexdigest(),
            manifest["files"]["SKILL.md"],
        )


if __name__ == "__main__":
    unittest.main()
