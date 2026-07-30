from __future__ import annotations

from contextlib import redirect_stderr, redirect_stdout
from io import StringIO
import json
import os
from pathlib import Path
import stat
import sys
import tempfile
import unittest
from unittest.mock import patch


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))

import organize_files  # noqa: E402
from organize_files import build_plan, main, write_plan  # noqa: E402


class OrganizeFilesTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name) / "Downloads"
        self.root.mkdir()
        self.root = self.root.resolve()

    def write(self, name: str, content: bytes = b"content") -> Path:
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return path

    def run_cli(self, arguments: list[str]) -> tuple[int, str, str]:
        output = StringIO()
        errors = StringIO()
        with redirect_stdout(output), redirect_stderr(errors):
            code = main(arguments)
        return code, output.getvalue(), errors.getvalue()

    def test_plan_classifies_known_extensions_and_leaves_unknown_files(self):
        pdf = self.write("方案.pdf", b"pdf")
        image = self.write("截图.PNG", b"image")
        unknown = self.write("数据.custom", b"unknown")

        plan = build_plan(self.root, recursive=False, include_duplicates=False)

        destinations = {
            Path(item["source"]).name: Path(item["destination"]).relative_to(self.root)
            for item in plan["operations"]
        }
        self.assertEqual(destinations["方案.pdf"], Path("文档/方案.pdf"))
        self.assertEqual(destinations["截图.PNG"], Path("图片/截图.PNG"))
        self.assertNotIn(unknown.name, destinations)
        self.assertIn(str(unknown), plan["unclassified"])
        self.assertTrue(pdf.exists())
        self.assertTrue(image.exists())

    def test_plan_is_read_only(self):
        self.write("说明.txt")
        before = sorted(path.relative_to(self.root) for path in self.root.rglob("*"))

        build_plan(self.root, recursive=False, include_duplicates=False)

        after = sorted(path.relative_to(self.root) for path in self.root.rglob("*"))
        self.assertEqual(after, before)
        self.assertFalse((self.root / "文档").exists())
        self.assertFalse((self.root / ".file-organizer-history").exists())

    def test_hidden_files_symlinks_and_nested_files_are_skipped_by_default(self):
        self.write(".secret.pdf")
        nested = self.write("nested/deep.pdf")
        target = self.write("real.pdf")
        link = self.root / "linked.pdf"
        link.symlink_to(target)

        plan = build_plan(self.root, recursive=False, include_duplicates=False)

        sources = {item["source"] for item in plan["operations"]}
        self.assertNotIn(str(self.root / ".secret.pdf"), sources)
        self.assertNotIn(str(nested), sources)
        self.assertNotIn(str(link), sources)
        self.assertIn(str(target), sources)

    def test_recursive_plan_includes_nested_files_but_not_category_destinations(self):
        nested = self.write("临时/资料.docx")

        plan = build_plan(self.root, recursive=True, include_duplicates=False)

        operation = next(item for item in plan["operations"] if item["source"] == str(nested))
        self.assertEqual(
            Path(operation["destination"]).relative_to(self.root),
            Path("文档/资料.docx"),
        )

    def test_exact_duplicates_require_same_hash(self):
        first = self.write("副本一.pdf", b"same")
        second = self.write("副本二.pdf", b"same")
        self.write("不同.pdf", b"diff")

        plan = build_plan(self.root, recursive=False, include_duplicates=False)

        self.assertEqual(len(plan["duplicate_groups"]), 1)
        self.assertEqual(
            set(plan["duplicate_groups"][0]["files"]),
            {str(first), str(second)},
        )
        self.assertFalse(any(item["kind"] == "duplicate" for item in plan["operations"]))
        duplicate_files = plan["duplicate_groups"][0]["files"]
        operation_sources = {item["source"] for item in plan["operations"]}
        self.assertTrue(set(duplicate_files).isdisjoint(operation_sources))
        self.assertEqual(
            {item["path"] for item in plan["skipped"]},
            set(duplicate_files),
        )
        self.assertTrue(
            all(
                item["reason"] == "exact_duplicate_requires_confirmation"
                for item in plan["skipped"]
            )
        )

    def test_duplicate_quarantine_is_opt_in_and_keeps_one_copy(self):
        first = self.write("副本一.pdf", b"same")
        second = self.write("副本二.pdf", b"same")

        plan = build_plan(self.root, recursive=False, include_duplicates=True)

        duplicates = [item for item in plan["operations"] if item["kind"] == "duplicate"]
        self.assertEqual(len(duplicates), 1)
        self.assertIn(duplicates[0]["source"], {str(first), str(second)})
        self.assertEqual(
            Path(duplicates[0]["destination"]).parent.name,
            "待确认重复文件",
        )

    def test_apply_requires_confirmation_and_does_not_move(self):
        source = self.write("说明.txt")
        plan_path = Path(self.temporary.name) / "plan.json"
        plan = build_plan(self.root, recursive=False, include_duplicates=False)
        plan_path.write_text(json.dumps(plan, ensure_ascii=False), encoding="utf-8")

        code, _, errors = self.run_cli(["apply", str(plan_path)])

        self.assertEqual(code, 2)
        self.assertIn("--confirm", errors)
        self.assertTrue(source.exists())

    def test_plan_output_never_overwrites_existing_file(self):
        self.write("说明.txt")
        output = Path(self.temporary.name) / "plan.json"
        output.write_text("keep me", encoding="utf-8")
        plan = build_plan(self.root, recursive=False, include_duplicates=False)

        with self.assertRaises(FileExistsError):
            write_plan(plan, output)

        self.assertEqual(output.read_text(encoding="utf-8"), "keep me")

    def test_apply_rejects_plan_without_explicit_root(self):
        plan_path = Path(self.temporary.name) / "plan.json"
        plan_path.write_text(
            json.dumps({"schema_version": 1, "operations": []}),
            encoding="utf-8",
        )
        previous = Path.cwd()
        os.chdir(Path(self.temporary.name))
        try:
            code, _, errors = self.run_cli(["apply", str(plan_path), "--confirm"])
        finally:
            os.chdir(previous)

        self.assertEqual(code, 2)
        self.assertIn("root", errors)
        self.assertFalse(
            (Path(self.temporary.name) / ".file-organizer-history").exists()
        )

    def test_apply_moves_files_and_writes_reversible_manifest(self):
        source = self.write("说明.txt")
        plan_path = Path(self.temporary.name) / "plan.json"
        plan = build_plan(self.root, recursive=False, include_duplicates=False)
        plan_path.write_text(json.dumps(plan, ensure_ascii=False), encoding="utf-8")

        code, output, errors = self.run_cli(["apply", str(plan_path), "--confirm"])

        self.assertEqual((code, errors), (0, ""))
        destination = self.root / "文档" / "说明.txt"
        self.assertFalse(source.exists())
        self.assertTrue(destination.exists())
        payload = json.loads(output)
        manifest = Path(payload["manifest"])
        self.assertTrue(manifest.is_file())

        undo_code, undo_output, undo_errors = self.run_cli(
            ["undo", str(manifest), "--confirm"]
        )
        self.assertEqual((undo_code, undo_errors), (0, ""))
        self.assertTrue(source.exists())
        self.assertFalse(destination.exists())
        self.assertEqual(json.loads(undo_output)["restored"], 1)

    def test_atomic_move_does_not_overwrite_destination_created_during_move(self):
        source = self.write("说明.txt", b"source")
        destination = self.root / "文档" / "说明.txt"
        destination.parent.mkdir()
        real_os_link = os.link
        injected = False

        def racing_link(
            source_name,
            destination_name,
            *,
            src_dir_fd=None,
            dst_dir_fd=None,
            follow_symlinks=True,
        ):
            nonlocal injected
            if not injected and destination_name == destination.name:
                injected = True
                descriptor = os.open(
                    destination_name,
                    os.O_WRONLY | os.O_CREAT | os.O_EXCL,
                    0o600,
                    dir_fd=dst_dir_fd,
                )
                os.write(descriptor, b"racer")
                os.close(descriptor)
            return real_os_link(
                source_name,
                destination_name,
                src_dir_fd=src_dir_fd,
                dst_dir_fd=dst_dir_fd,
                follow_symlinks=follow_symlinks,
            )

        with patch.object(organize_files.os, "link", side_effect=racing_link):
            with self.assertRaises(FileExistsError):
                organize_files.move_no_replace(source, destination, self.root)

        self.assertEqual(source.read_bytes(), b"source")
        self.assertEqual(destination.read_bytes(), b"racer")

    def test_move_rejects_destination_directory_swapped_for_symlink(self):
        source = self.write("说明.txt", b"source")
        destination_parent = self.root / "文档"
        destination_parent.mkdir()
        destination = destination_parent / "说明.txt"
        external = Path(self.temporary.name) / "external"
        external.mkdir()
        real_os_link = os.link
        swapped = False

        def racing_link(
            source_name,
            destination_name,
            *,
            src_dir_fd=None,
            dst_dir_fd=None,
            follow_symlinks=True,
        ):
            nonlocal swapped
            if not swapped:
                swapped = True
                destination_parent.rename(self.root / "detached")
                destination_parent.symlink_to(external, target_is_directory=True)
            return real_os_link(
                source_name,
                destination_name,
                src_dir_fd=src_dir_fd,
                dst_dir_fd=dst_dir_fd,
                follow_symlinks=follow_symlinks,
            )

        with patch.object(organize_files.os, "link", side_effect=racing_link):
            with self.assertRaises(OSError):
                organize_files.move_no_replace(source, destination, self.root)

        self.assertTrue(source.exists())
        self.assertEqual(list(external.iterdir()), [])
        self.assertEqual(list((self.root / "detached").iterdir()), [])

    def test_move_preserves_inode_and_extended_metadata_when_supported(self):
        source = self.write("说明.txt", b"source")
        destination = self.root / "文档" / "说明.txt"
        before = source.stat()
        xattr_supported = hasattr(os, "setxattr") and hasattr(os, "getxattr")
        if xattr_supported:
            try:
                os.setxattr(source, b"user.codex-test", b"kept")
            except OSError:
                xattr_supported = False

        organize_files.move_no_replace(source, destination, self.root)

        after = destination.stat()
        self.assertEqual((after.st_dev, after.st_ino), (before.st_dev, before.st_ino))
        self.assertTrue(stat.S_ISREG(after.st_mode))
        if xattr_supported:
            self.assertEqual(os.getxattr(destination, b"user.codex-test"), b"kept")

    def test_apply_rejects_source_mutated_after_move_hash(self):
        source = self.write("说明.txt", b"original")
        plan_path = Path(self.temporary.name) / "plan.json"
        plan = build_plan(self.root, recursive=False, include_duplicates=False)
        plan_path.write_text(json.dumps(plan, ensure_ascii=False), encoding="utf-8")
        real_hash = organize_files._sha256_descriptor
        hashes = 0

        def mutate_after_second_hash(descriptor):
            nonlocal hashes
            hashes += 1
            digest = real_hash(descriptor)
            if hashes == 2:
                source.write_bytes(b"mutated-content")
            return digest

        with patch.object(
            organize_files,
            "_sha256_descriptor",
            side_effect=mutate_after_second_hash,
        ):
            code, output, errors = self.run_cli(
                ["apply", str(plan_path), "--confirm"]
            )

        self.assertEqual((code, errors), (1, ""))
        self.assertTrue(source.exists())
        self.assertEqual(source.read_bytes(), b"mutated-content")
        self.assertFalse((self.root / "文档" / "说明.txt").exists())
        payload = json.loads(output)
        self.assertEqual(payload["failed"], 1)
        self.assertIn("发生变化", payload["failures"][0]["error"])

    def test_apply_preflights_history_path_before_moving(self):
        source = self.write("说明.txt")
        history = self.root / ".file-organizer-history"
        history.write_text("occupied", encoding="utf-8")
        plan_path = Path(self.temporary.name) / "plan.json"
        plan = build_plan(self.root, recursive=False, include_duplicates=False)
        plan_path.write_text(json.dumps(plan, ensure_ascii=False), encoding="utf-8")

        code, _, errors = self.run_cli(["apply", str(plan_path), "--confirm"])

        self.assertEqual(code, 2)
        self.assertIn("历史目录", errors)
        self.assertTrue(source.exists())
        self.assertEqual(history.read_text(encoding="utf-8"), "occupied")

    def test_apply_rejects_history_symlink_before_moving(self):
        source = self.write("说明.txt")
        external = Path(self.temporary.name) / "external-history"
        external.mkdir()
        (self.root / ".file-organizer-history").symlink_to(
            external,
            target_is_directory=True,
        )
        plan_path = Path(self.temporary.name) / "plan.json"
        plan = build_plan(self.root, recursive=False, include_duplicates=False)
        plan_path.write_text(json.dumps(plan, ensure_ascii=False), encoding="utf-8")

        code, _, errors = self.run_cli(["apply", str(plan_path), "--confirm"])

        self.assertEqual(code, 2)
        self.assertIn("符号链接", errors)
        self.assertTrue(source.exists())
        self.assertEqual(list(external.iterdir()), [])

    def test_apply_rejects_history_directory_swapped_during_manifest_creation(self):
        source = self.write("说明.txt")
        external = Path(self.temporary.name) / "external-history"
        external.mkdir()
        detached = Path(self.temporary.name) / "detached-history"
        plan_path = Path(self.temporary.name) / "plan.json"
        plan = build_plan(self.root, recursive=False, include_duplicates=False)
        plan_path.write_text(json.dumps(plan, ensure_ascii=False), encoding="utf-8")
        real_write = organize_files._write_json_descriptor
        swapped = False

        def racing_write(descriptor, payload):
            nonlocal swapped
            real_write(descriptor, payload)
            if not swapped:
                swapped = True
                history = self.root / ".file-organizer-history"
                history.rename(detached)
                history.symlink_to(external, target_is_directory=True)

        with patch.object(
            organize_files,
            "_write_json_descriptor",
            side_effect=racing_write,
        ):
            code, _, errors = self.run_cli(["apply", str(plan_path), "--confirm"])

        self.assertEqual(code, 2)
        self.assertIn("历史目录", errors)
        self.assertTrue(source.exists())
        self.assertEqual(list(external.iterdir()), [])
        self.assertEqual(list(detached.iterdir()), [])

    def test_apply_refuses_stale_source(self):
        source = self.write("说明.txt", b"before")
        plan_path = Path(self.temporary.name) / "plan.json"
        plan = build_plan(self.root, recursive=False, include_duplicates=False)
        plan_path.write_text(json.dumps(plan, ensure_ascii=False), encoding="utf-8")
        source.write_bytes(b"after")

        code, output, _ = self.run_cli(["apply", str(plan_path), "--confirm"])

        self.assertEqual(code, 1)
        self.assertTrue(source.exists())
        payload = json.loads(output)
        self.assertEqual(payload["skipped"], 0)
        self.assertEqual(payload["failed"], 1)
        self.assertEqual(len(payload["failures"]), 1)
        self.assertIn("发生变化", payload["failures"][0]["error"])

    def test_apply_refuses_tampered_destination_outside_root(self):
        source = self.write("说明.txt")
        plan_path = Path(self.temporary.name) / "plan.json"
        plan = build_plan(self.root, recursive=False, include_duplicates=False)
        plan["operations"][0]["destination"] = str(Path(self.temporary.name) / "escaped.txt")
        plan_path.write_text(json.dumps(plan, ensure_ascii=False), encoding="utf-8")

        code, _, errors = self.run_cli(["apply", str(plan_path), "--confirm"])

        self.assertEqual(code, 2)
        self.assertIn("目标目录之外", errors)
        self.assertTrue(source.exists())

    def test_apply_never_overwrites_destination_created_after_plan(self):
        source = self.write("说明.txt", b"source")
        plan_path = Path(self.temporary.name) / "plan.json"
        plan = build_plan(self.root, recursive=False, include_duplicates=False)
        destination = Path(plan["operations"][0]["destination"])
        destination.parent.mkdir()
        destination.write_bytes(b"occupied")
        plan_path.write_text(json.dumps(plan, ensure_ascii=False), encoding="utf-8")

        code, output, _ = self.run_cli(["apply", str(plan_path), "--confirm"])

        self.assertEqual(code, 1)
        self.assertTrue(source.exists())
        self.assertEqual(destination.read_bytes(), b"occupied")
        self.assertEqual(json.loads(output)["failed"], 1)

    def test_undo_does_not_overwrite_reoccupied_original_path(self):
        source = self.write("说明.txt")
        plan_path = Path(self.temporary.name) / "plan.json"
        plan = build_plan(self.root, recursive=False, include_duplicates=False)
        plan_path.write_text(json.dumps(plan, ensure_ascii=False), encoding="utf-8")
        _, output, _ = self.run_cli(["apply", str(plan_path), "--confirm"])
        manifest = Path(json.loads(output)["manifest"])
        source.write_bytes(b"new file")

        code, undo_output, _ = self.run_cli(["undo", str(manifest), "--confirm"])

        self.assertEqual(code, 1)
        self.assertEqual(source.read_bytes(), b"new file")
        self.assertEqual(json.loads(undo_output)["conflicts"], 1)

    def test_undo_refuses_destination_replaced_after_apply(self):
        source = self.write("说明.txt", b"original")
        plan_path = Path(self.temporary.name) / "plan.json"
        plan = build_plan(self.root, recursive=False, include_duplicates=False)
        plan_path.write_text(json.dumps(plan, ensure_ascii=False), encoding="utf-8")
        _, output, _ = self.run_cli(["apply", str(plan_path), "--confirm"])
        manifest = Path(json.loads(output)["manifest"])
        destination = self.root / "文档" / "说明.txt"
        destination.unlink()
        destination.write_bytes(b"replacement")

        code, undo_output, _ = self.run_cli(["undo", str(manifest), "--confirm"])

        self.assertEqual(code, 1)
        self.assertFalse(source.exists())
        self.assertEqual(destination.read_bytes(), b"replacement")
        self.assertEqual(json.loads(undo_output)["conflicts"], 1)

    def test_undo_refuses_destination_replaced_by_symlink(self):
        source = self.write("说明.txt", b"original")
        plan_path = Path(self.temporary.name) / "plan.json"
        plan = build_plan(self.root, recursive=False, include_duplicates=False)
        plan_path.write_text(json.dumps(plan, ensure_ascii=False), encoding="utf-8")
        _, output, _ = self.run_cli(["apply", str(plan_path), "--confirm"])
        manifest = Path(json.loads(output)["manifest"])
        destination = self.root / "文档" / "说明.txt"
        unrelated = self.write("无关.txt", b"original")
        destination.unlink()
        destination.symlink_to(unrelated)

        code, undo_output, _ = self.run_cli(["undo", str(manifest), "--confirm"])

        self.assertEqual(code, 1)
        self.assertFalse(source.exists())
        self.assertTrue(destination.is_symlink())
        self.assertEqual(unrelated.read_bytes(), b"original")
        self.assertEqual(json.loads(undo_output)["conflicts"], 1)

    def test_undo_recovers_entry_left_in_moving_state(self):
        source = self.write("说明.txt", b"original")
        plan_path = Path(self.temporary.name) / "plan.json"
        plan = build_plan(self.root, recursive=False, include_duplicates=False)
        plan_path.write_text(json.dumps(plan, ensure_ascii=False), encoding="utf-8")
        real_write_manifest = organize_files._write_json_atomic
        writes = 0

        def fail_after_move(path, payload):
            nonlocal writes
            writes += 1
            if writes == 2:
                raise OSError("simulated manifest interruption")
            return real_write_manifest(path, payload)

        with patch.object(
            organize_files,
            "_write_json_atomic",
            side_effect=fail_after_move,
        ):
            code, _, errors = self.run_cli(["apply", str(plan_path), "--confirm"])

        self.assertEqual(code, 2)
        self.assertIn("manifest", errors)
        self.assertFalse(source.exists())
        manifests = list((self.root / ".file-organizer-history").glob("*.json"))
        self.assertEqual(len(manifests), 1)
        persisted = json.loads(manifests[0].read_text(encoding="utf-8"))
        self.assertEqual(persisted["operations"][0]["status"], "moving")

        undo_code, undo_output, undo_errors = self.run_cli(
            ["undo", str(manifests[0]), "--confirm"]
        )

        self.assertEqual((undo_code, undo_errors), (0, ""))
        self.assertTrue(source.exists())
        self.assertEqual(json.loads(undo_output)["restored"], 1)

    def test_undo_reconciles_moving_entry_before_link_was_created(self):
        source = self.write("说明.txt", b"original")
        destination = self.root / "文档" / "说明.txt"
        manifest = self.make_moving_manifest(source, destination)

        code, output, errors = self.run_cli(
            ["undo", str(manifest), "--confirm"]
        )

        self.assertEqual((code, errors), (0, ""))
        self.assertTrue(source.exists())
        self.assertFalse(destination.exists())
        payload = json.loads(output)
        self.assertEqual(payload["restored"], 0)
        self.assertEqual(payload["reconciled"], 1)

    def test_undo_reconciles_moving_entry_after_link_before_unlink(self):
        source = self.write("说明.txt", b"original")
        destination = self.root / "文档" / "说明.txt"
        destination.parent.mkdir()
        os.link(source, destination)
        manifest = self.make_moving_manifest(source, destination)

        code, output, errors = self.run_cli(
            ["undo", str(manifest), "--confirm"]
        )

        self.assertEqual((code, errors), (0, ""))
        self.assertTrue(source.exists())
        self.assertFalse(destination.exists())
        payload = json.loads(output)
        self.assertEqual(payload["restored"], 0)
        self.assertEqual(payload["reconciled"], 1)

    def test_apply_reports_target_parent_value_error_as_failed_item(self):
        source = self.write("说明.txt")
        (self.root / "文档").write_text("occupied", encoding="utf-8")
        plan_path = Path(self.temporary.name) / "plan.json"
        plan = build_plan(self.root, recursive=False, include_duplicates=False)
        plan_path.write_text(json.dumps(plan, ensure_ascii=False), encoding="utf-8")

        code, output, errors = self.run_cli(["apply", str(plan_path), "--confirm"])

        self.assertEqual((code, errors), (1, ""))
        self.assertTrue(source.exists())
        payload = json.loads(output)
        self.assertEqual(payload["failed"], 1)
        self.assertIn("目录", payload["failures"][0]["error"])

    def test_plan_output_rejects_dangling_symlink(self):
        self.write("说明.txt")
        output = Path(self.temporary.name) / "plan.json"
        target = Path(self.temporary.name) / "missing.json"
        output.symlink_to(target)
        plan = build_plan(self.root, recursive=False, include_duplicates=False)

        with self.assertRaises(FileExistsError):
            write_plan(plan, output)

        self.assertTrue(output.is_symlink())
        self.assertFalse(target.exists())

    def make_moving_manifest(self, source: Path, destination: Path) -> Path:
        state = source.stat()
        manifest = {
            "schema_version": 1,
            "root": str(self.root),
            "operations": [
                {
                    "source": str(source),
                    "destination": str(destination),
                    "status": "moving",
                    "size": state.st_size,
                    "mtime_ns": state.st_mtime_ns,
                    "sha256": organize_files._sha256(source),
                }
            ],
        }
        path = Path(self.temporary.name) / f"moving-{os.urandom(4).hex()}.json"
        path.write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
        return path


if __name__ == "__main__":
    unittest.main()
