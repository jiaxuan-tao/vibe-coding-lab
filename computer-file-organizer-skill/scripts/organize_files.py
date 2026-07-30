#!/usr/bin/env python3
"""Plan, apply, and undo conservative file organization operations."""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import stat
import sys
from typing import Iterable, Optional
import uuid


SCHEMA_VERSION = 1
HISTORY_DIRECTORY = ".file-organizer-history"
DUPLICATE_DIRECTORY = "待确认重复文件"
SAFE_DIR_FD_SUPPORTED = {
    os.open,
    os.mkdir,
    os.stat,
    os.unlink,
}.issubset(os.supports_dir_fd) and os.link in os.supports_dir_fd

CATEGORY_EXTENSIONS = {
    "文档": {
        ".doc",
        ".docx",
        ".md",
        ".odt",
        ".pages",
        ".pdf",
        ".rtf",
        ".txt",
    },
    "表格": {".csv", ".numbers", ".ods", ".xls", ".xlsx"},
    "演示文稿": {".key", ".odp", ".ppt", ".pptx"},
    "图片": {
        ".bmp",
        ".gif",
        ".heic",
        ".heif",
        ".jpeg",
        ".jpg",
        ".png",
        ".svg",
        ".tif",
        ".tiff",
        ".webp",
    },
    "音频": {".aac", ".flac", ".m4a", ".mp3", ".ogg", ".wav"},
    "视频": {".avi", ".mkv", ".mov", ".mp4", ".webm"},
    "压缩包": {
        ".7z",
        ".bz2",
        ".gz",
        ".rar",
        ".tar",
        ".tgz",
        ".xz",
        ".zip",
    },
    "安装包": {".apk", ".deb", ".dmg", ".exe", ".msi", ".pkg", ".rpm"},
    "代码": {
        ".css",
        ".go",
        ".html",
        ".java",
        ".js",
        ".json",
        ".jsx",
        ".py",
        ".rs",
        ".sh",
        ".sql",
        ".ts",
        ".tsx",
        ".xml",
        ".yaml",
        ".yml",
    },
}

EXTENSION_TO_CATEGORY = {
    extension: category
    for category, extensions in CATEGORY_EXTENSIONS.items()
    for extension in extensions
}
MANAGED_DIRECTORIES = set(CATEGORY_EXTENSIONS) | {
    DUPLICATE_DIRECTORY,
    HISTORY_DIRECTORY,
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _resolved(path: Path) -> Path:
    return path.expanduser().resolve()


def _absolute_lexical(path: Path) -> Path:
    return Path(os.path.abspath(os.path.expanduser(str(path))))


def _is_within(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
    except ValueError:
        return False
    return True


def validate_root(root: Path) -> Path:
    """Return a safe absolute directory or raise ValueError."""
    if root.is_symlink():
        raise ValueError("目标目录不能是符号链接")
    resolved = _resolved(root)
    if not resolved.is_dir():
        raise ValueError(f"目标不是可读取目录：{root}")
    if resolved == Path(resolved.anchor):
        raise ValueError("不能整理文件系统根目录")
    if resolved == Path.home().resolve():
        raise ValueError("不能直接整理用户主目录，请选择下载、桌面或更小的目录")
    return resolved


def classify(path: Path) -> Optional[str]:
    """Return the conservative category for a file extension."""
    return EXTENSION_TO_CATEGORY.get(path.suffix.casefold())


def _contains_hidden_part(path: Path, root: Path) -> bool:
    return any(part.startswith(".") for part in path.relative_to(root).parts)


def _inside_managed_directory(path: Path, root: Path) -> bool:
    relative = path.relative_to(root)
    return bool(relative.parts and relative.parts[0] in MANAGED_DIRECTORIES)


def iter_files(root: Path, recursive: bool) -> Iterable[Path]:
    """Yield eligible files without following links or managed destinations."""
    candidates = root.rglob("*") if recursive else root.iterdir()
    for path in candidates:
        if _contains_hidden_part(path, root):
            continue
        if _inside_managed_directory(path, root):
            continue
        if path.is_symlink() or not path.is_file():
            continue
        yield path


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def find_duplicates(files: list[Path]) -> list[dict[str, object]]:
    """Find exact duplicates using size grouping followed by SHA-256."""
    by_size: dict[int, list[Path]] = defaultdict(list)
    for path in files:
        by_size[path.stat().st_size].append(path)

    duplicate_groups: list[dict[str, object]] = []
    for size, same_size_files in sorted(by_size.items()):
        if len(same_size_files) < 2:
            continue
        by_hash: dict[str, list[Path]] = defaultdict(list)
        for path in sorted(same_size_files, key=lambda item: str(item).casefold()):
            by_hash[_sha256(path)].append(path)
        for digest, same_content_files in sorted(by_hash.items()):
            if len(same_content_files) < 2:
                continue
            ordered = sorted(same_content_files, key=lambda item: str(item).casefold())
            duplicate_groups.append(
                {
                    "sha256": digest,
                    "size": size,
                    "keep": str(ordered[0]),
                    "files": [str(path) for path in ordered],
                }
            )
    return duplicate_groups


def _available_destination(
    desired: Path,
    occupied: set[Path],
) -> Path:
    candidate = desired
    counter = 2
    while candidate in occupied or candidate.exists():
        candidate = desired.with_name(f"{desired.stem} ({counter}){desired.suffix}")
        counter += 1
    occupied.add(candidate)
    return candidate


def _operation(source: Path, destination: Path, kind: str, category: str) -> dict[str, object]:
    state = source.stat()
    return {
        "source": str(source),
        "destination": str(destination),
        "kind": kind,
        "category": category,
        "size": state.st_size,
        "mtime_ns": state.st_mtime_ns,
    }


def build_plan(
    root: Path,
    recursive: bool = False,
    include_duplicates: bool = False,
) -> dict[str, object]:
    """Create a read-only organization plan for one explicit directory."""
    safe_root = validate_root(root)
    files = sorted(iter_files(safe_root, recursive), key=lambda item: str(item).casefold())
    duplicate_groups = find_duplicates(files)
    duplicate_non_keep_sources = {
        Path(source)
        for group in duplicate_groups
        for source in group["files"][1:]
    }
    all_duplicate_sources = {
        Path(source)
        for group in duplicate_groups
        for source in group["files"]
    }

    occupied: set[Path] = set()
    operations = []
    unclassified = []
    skipped = []
    category_counts: Counter[str] = Counter()

    for source in files:
        if source in all_duplicate_sources:
            if include_duplicates and source in duplicate_non_keep_sources:
                destination = _available_destination(
                    safe_root / DUPLICATE_DIRECTORY / source.name,
                    occupied,
                )
                operations.append(
                    _operation(source, destination, "duplicate", DUPLICATE_DIRECTORY)
                )
                category_counts[DUPLICATE_DIRECTORY] += 1
                continue
            if not include_duplicates:
                skipped.append(
                    {
                        "path": str(source),
                        "reason": "exact_duplicate_requires_confirmation",
                    }
                )
                continue

        category = classify(source)
        if category is None:
            unclassified.append(str(source))
            continue
        destination = _available_destination(
            safe_root / category / source.name,
            occupied,
        )
        operations.append(_operation(source, destination, "classify", category))
        category_counts[category] += 1

    return {
        "schema_version": SCHEMA_VERSION,
        "created_at": _utc_now(),
        "root": str(safe_root),
        "recursive": recursive,
        "include_duplicates": include_duplicates,
        "summary": {
            "eligible_files": len(files),
            "total_bytes": sum(path.stat().st_size for path in files),
            "planned_moves": len(operations),
            "unclassified": len(unclassified),
            "skipped": len(skipped),
            "duplicate_groups": len(duplicate_groups),
            "category_counts": dict(sorted(category_counts.items())),
        },
        "operations": operations,
        "unclassified": unclassified,
        "skipped": skipped,
        "duplicate_groups": duplicate_groups,
    }


def write_plan(plan: dict[str, object], destination: Path) -> None:
    root = Path(str(plan["root"]))
    destination = Path(os.path.expanduser(str(destination)))
    if destination.is_symlink():
        raise FileExistsError(f"计划输出路径已存在：{destination}")
    absolute_destination = _absolute_lexical(destination)
    resolved_parent = _resolved(absolute_destination.parent)
    resolved_destination = resolved_parent / absolute_destination.name
    if _is_within(resolved_destination, root):
        raise ValueError("计划文件必须保存在目标目录之外，以保持计划阶段只读")
    resolved_destination.parent.mkdir(parents=True, exist_ok=True)
    with resolved_destination.open("x", encoding="utf-8") as handle:
        handle.write(json.dumps(plan, ensure_ascii=False, indent=2) + "\n")
        handle.flush()
        os.fsync(handle.fileno())


def _load_json(path: Path) -> dict[str, object]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise ValueError(f"无法读取 JSON 文件：{error}") from error
    if not isinstance(payload, dict):
        raise ValueError("JSON 顶层必须是对象")
    return payload


def _payload_root(payload: dict[str, object]) -> Path:
    value = payload.get("root")
    if not isinstance(value, str) or not value.strip():
        raise ValueError("计划或清单缺少明确的 root 目录")
    return validate_root(Path(value))


def _validated_operations(
    payload: dict[str, object],
    root: Path,
) -> list[dict[str, object]]:
    if payload.get("schema_version") != SCHEMA_VERSION:
        raise ValueError("不支持的计划或清单版本")
    operations = payload.get("operations")
    if not isinstance(operations, list):
        raise ValueError("计划缺少 operations 数组")

    seen_sources: set[Path] = set()
    validated = []
    for item in operations:
        if not isinstance(item, dict):
            raise ValueError("计划操作格式错误")
        try:
            source = _absolute_lexical(Path(str(item["source"])))
            destination = _absolute_lexical(Path(str(item["destination"])))
        except KeyError as error:
            raise ValueError(f"计划操作缺少字段：{error}") from error
        if not _is_within(source, root) or not _is_within(destination, root):
            raise ValueError("计划包含目标目录之外的路径")
        if source == destination:
            raise ValueError("源路径与目标路径不能相同")
        if source in seen_sources:
            raise ValueError("计划包含重复的源路径")
        seen_sources.add(source)
        validated.append(item)
    return validated


def _manifest_path(root: Path) -> Path:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return root / HISTORY_DIRECTORY / f"{timestamp}-{uuid.uuid4().hex[:8]}.json"


def _directory_flags() -> int:
    flags = os.O_RDONLY
    flags |= getattr(os, "O_DIRECTORY", 0)
    flags |= getattr(os, "O_NOFOLLOW", 0)
    return flags


def _file_read_flags() -> int:
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
    flags |= getattr(os, "O_BINARY", 0)
    return flags


def _relative_parts(path: Path, root: Path, label: str) -> tuple[str, ...]:
    absolute = _absolute_lexical(path)
    try:
        relative = absolute.relative_to(root)
    except ValueError as error:
        raise ValueError(f"{label}位于目标目录之外") from error
    if not relative.parts or any(part in {"", ".", ".."} for part in relative.parts):
        raise ValueError(f"{label}必须是目标目录内的具体路径")
    return relative.parts


def _open_root_fd(root: Path) -> int:
    if not SAFE_DIR_FD_SUPPORTED:
        raise OSError("当前 Python 平台不支持安全执行所需的目录句柄与原子硬链接")
    return os.open(str(root), _directory_flags())


def _open_directory_chain(
    root_fd: int,
    parts: tuple[str, ...],
    *,
    create: bool,
    label: str,
) -> int:
    current_fd = os.dup(root_fd)
    try:
        for part in parts:
            try:
                next_fd = os.open(part, _directory_flags(), dir_fd=current_fd)
            except FileNotFoundError:
                if not create:
                    raise
                try:
                    os.mkdir(part, mode=0o700, dir_fd=current_fd)
                    os.fsync(current_fd)
                except FileExistsError:
                    pass
                next_fd = os.open(part, _directory_flags(), dir_fd=current_fd)
            except OSError as error:
                raise ValueError(f"{label}必须是非符号链接目录") from error
            os.close(current_fd)
            current_fd = next_fd
        return current_fd
    except BaseException:
        os.close(current_fd)
        raise


def _directory_is_attached(
    root_fd: int,
    parts: tuple[str, ...],
    directory_fd: int,
) -> bool:
    try:
        current_fd = _open_directory_chain(
            root_fd,
            parts,
            create=False,
            label="目录",
        )
    except (OSError, ValueError):
        return False
    try:
        expected = os.fstat(directory_fd)
        current = os.fstat(current_fd)
        return (expected.st_dev, expected.st_ino) == (current.st_dev, current.st_ino)
    finally:
        os.close(current_fd)


def _write_json_descriptor(descriptor: int, payload: dict[str, object]) -> None:
    with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        handle.flush()
        os.fsync(handle.fileno())


def _open_history(
    root: Path,
    *,
    create: bool,
) -> tuple[int, int]:
    root_fd = _open_root_fd(root)
    try:
        history_fd = _open_directory_chain(
            root_fd,
            (HISTORY_DIRECTORY,),
            create=create,
            label="历史目录",
        )
    except BaseException:
        os.close(root_fd)
        raise
    if not _directory_is_attached(root_fd, (HISTORY_DIRECTORY,), history_fd):
        os.close(history_fd)
        os.close(root_fd)
        raise OSError("历史目录在打开期间发生变化")
    return root_fd, history_fd


def _write_json_atomic(path: Path, payload: dict[str, object]) -> None:
    root = _payload_root(payload)
    expected_parent = root / HISTORY_DIRECTORY
    absolute_path = _absolute_lexical(path)
    if absolute_path.parent != expected_parent or absolute_path.name in {"", ".", ".."}:
        raise ValueError("manifest 路径不在历史目录内")

    root_fd, history_fd = _open_history(root, create=False)
    temporary_name = f".{absolute_path.name}.{uuid.uuid4().hex}.tmp"
    created_temporary = False
    try:
        descriptor = os.open(
            temporary_name,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL,
            0o600,
            dir_fd=history_fd,
        )
        created_temporary = True
        _write_json_descriptor(descriptor, payload)
        os.replace(
            temporary_name,
            absolute_path.name,
            src_dir_fd=history_fd,
            dst_dir_fd=history_fd,
        )
        created_temporary = False
        os.fsync(history_fd)
        if not _directory_is_attached(
            root_fd,
            (HISTORY_DIRECTORY,),
            history_fd,
        ):
            raise OSError("历史目录在写入期间发生变化")
    finally:
        if created_temporary:
            try:
                os.unlink(temporary_name, dir_fd=history_fd)
            except OSError:
                pass
        os.close(history_fd)
        os.close(root_fd)


def _create_manifest(
    root: Path,
    plan_path: Path,
    operations: list[dict[str, object]],
) -> tuple[Path, dict[str, object]]:
    manifest_path = _manifest_path(root)
    manifest = {
        "schema_version": SCHEMA_VERSION,
        "created_at": _utc_now(),
        "root": str(root),
        "plan": str(_resolved(plan_path)),
        "status": "in_progress",
        "operations": [
            {
                "source": item["source"],
                "destination": item["destination"],
                "kind": item.get("kind"),
                "category": item.get("category"),
                "size": item.get("size"),
                "mtime_ns": item.get("mtime_ns"),
                "status": "pending",
            }
            for item in operations
        ],
    }
    root_fd, history_fd = _open_history(root, create=True)
    created = False
    try:
        descriptor = os.open(
            manifest_path.name,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL,
            0o600,
            dir_fd=history_fd,
        )
        created = True
        _write_json_descriptor(descriptor, manifest)
        os.fsync(history_fd)
        if not _directory_is_attached(
            root_fd,
            (HISTORY_DIRECTORY,),
            history_fd,
        ):
            try:
                os.unlink(manifest_path.name, dir_fd=history_fd)
            except OSError:
                pass
            created = False
            raise OSError("历史目录在 manifest 创建期间发生变化")
    except BaseException:
        if created:
            try:
                os.unlink(manifest_path.name, dir_fd=history_fd)
            except OSError:
                pass
        raise
    finally:
        os.close(history_fd)
        os.close(root_fd)
    return manifest_path, manifest


def _sha256_descriptor(descriptor: int) -> str:
    digest = hashlib.sha256()
    os.lseek(descriptor, 0, os.SEEK_SET)
    while True:
        block = os.read(descriptor, 1024 * 1024)
        if not block:
            break
        digest.update(block)
    os.lseek(descriptor, 0, os.SEEK_SET)
    return digest.hexdigest()


def _stable_file_identity(state: os.stat_result) -> tuple[int, int, int, int, int]:
    return (
        state.st_dev,
        state.st_ino,
        state.st_size,
        state.st_mtime_ns,
        state.st_ctime_ns,
    )


def _stable_file_content(state: os.stat_result) -> tuple[int, int, int, int]:
    return (
        state.st_dev,
        state.st_ino,
        state.st_size,
        state.st_mtime_ns,
    )


def _inspect_file(path: Path, root: Path) -> tuple[os.stat_result, str]:
    relative = _relative_parts(path, root, "源文件")
    root_fd = _open_root_fd(root)
    parent_fd = -1
    descriptor = -1
    try:
        parent_fd = _open_directory_chain(
            root_fd,
            relative[:-1],
            create=False,
            label="源文件父目录",
        )
        if not _directory_is_attached(root_fd, relative[:-1], parent_fd):
            raise OSError("源文件父目录在检查期间发生变化")
        descriptor = os.open(relative[-1], _file_read_flags(), dir_fd=parent_fd)
        state = os.fstat(descriptor)
        if not stat.S_ISREG(state.st_mode):
            raise OSError("源文件不是普通文件")
        current = os.stat(relative[-1], dir_fd=parent_fd, follow_symlinks=False)
        if (state.st_dev, state.st_ino) != (current.st_dev, current.st_ino):
            raise OSError("源文件在检查期间发生变化")
        return state, _sha256_descriptor(descriptor)
    finally:
        if descriptor >= 0:
            os.close(descriptor)
        if parent_fd >= 0:
            os.close(parent_fd)
        os.close(root_fd)


def _path_state(path: Path, root: Path) -> Optional[os.stat_result]:
    relative = _relative_parts(path, root, "文件路径")
    root_fd = _open_root_fd(root)
    parent_fd = -1
    try:
        try:
            parent_fd = _open_directory_chain(
                root_fd,
                relative[:-1],
                create=False,
                label="文件父目录",
            )
        except FileNotFoundError:
            return None
        if not _directory_is_attached(root_fd, relative[:-1], parent_fd):
            raise OSError("文件父目录在检查期间发生变化")
        try:
            return os.stat(
                relative[-1],
                dir_fd=parent_fd,
                follow_symlinks=False,
            )
        except FileNotFoundError:
            return None
    finally:
        if parent_fd >= 0:
            os.close(parent_fd)
        os.close(root_fd)


def move_no_replace(
    source: Path,
    destination: Path,
    root: Path,
    expected_sha256: Optional[str] = None,
    expected_size: Optional[int] = None,
    expected_mtime_ns: Optional[int] = None,
) -> tuple[int, str]:
    """Atomically link then unlink a regular file without replacing targets."""
    source_relative = _relative_parts(source, root, "源文件")
    destination_relative = _relative_parts(destination, root, "目标路径")
    if source_relative == destination_relative:
        raise ValueError("源路径与目标路径不能相同")

    root_fd = _open_root_fd(root)
    source_parent_fd = -1
    destination_parent_fd = -1
    source_fd = -1
    linked = False
    try:
        source_parent_fd = _open_directory_chain(
            root_fd,
            source_relative[:-1],
            create=False,
            label="源文件父目录",
        )
        destination_parent_fd = _open_directory_chain(
            root_fd,
            destination_relative[:-1],
            create=True,
            label="目标父目录",
        )
        if not _directory_is_attached(
            root_fd,
            source_relative[:-1],
            source_parent_fd,
        ):
            raise OSError("源文件父目录在移动前发生变化")
        if not _directory_is_attached(
            root_fd,
            destination_relative[:-1],
            destination_parent_fd,
        ):
            raise OSError("目标父目录在移动前发生变化")

        source_fd = os.open(
            source_relative[-1],
            _file_read_flags(),
            dir_fd=source_parent_fd,
        )
        before = os.fstat(source_fd)
        if not stat.S_ISREG(before.st_mode):
            raise OSError("源文件不是普通文件")
        current_source = os.stat(
            source_relative[-1],
            dir_fd=source_parent_fd,
            follow_symlinks=False,
        )
        if (before.st_dev, before.st_ino) != (
            current_source.st_dev,
            current_source.st_ino,
        ):
            raise OSError("源文件在移动前发生变化")
        if expected_size is not None and before.st_size != expected_size:
            raise OSError("源文件大小与执行清单不一致")
        if (
            expected_mtime_ns is not None
            and before.st_mtime_ns != expected_mtime_ns
        ):
            raise OSError("源文件修改时间与执行清单不一致")
        digest = _sha256_descriptor(source_fd)
        after_hash = os.fstat(source_fd)
        if _stable_file_identity(before) != _stable_file_identity(after_hash):
            raise OSError("源文件在哈希后发生变化")
        if expected_sha256 is not None and digest != expected_sha256:
            raise OSError("源文件内容与执行清单不一致")

        os.link(
            source_relative[-1],
            destination_relative[-1],
            src_dir_fd=source_parent_fd,
            dst_dir_fd=destination_parent_fd,
            follow_symlinks=False,
        )
        linked = True
        os.fsync(destination_parent_fd)

        if not _directory_is_attached(
            root_fd,
            destination_relative[:-1],
            destination_parent_fd,
        ):
            raise OSError("目标父目录在移动期间发生变化")
        if not _directory_is_attached(
            root_fd,
            source_relative[:-1],
            source_parent_fd,
        ):
            raise OSError("源文件父目录在移动期间发生变化")

        destination_state = os.stat(
            destination_relative[-1],
            dir_fd=destination_parent_fd,
            follow_symlinks=False,
        )
        source_state = os.stat(
            source_relative[-1],
            dir_fd=source_parent_fd,
            follow_symlinks=False,
        )
        final_digest = _sha256_descriptor(source_fd)
        latest = os.fstat(source_fd)
        identity = (before.st_dev, before.st_ino)
        if (
            (destination_state.st_dev, destination_state.st_ino) != identity
            or (source_state.st_dev, source_state.st_ino) != identity
            or _stable_file_content(before) != _stable_file_content(latest)
            or final_digest != digest
        ):
            raise OSError("文件路径在移动期间发生变化")

        os.unlink(source_relative[-1], dir_fd=source_parent_fd)
        os.fsync(source_parent_fd)
        linked = False
        return before.st_size, digest
    except BaseException:
        if linked:
            try:
                destination_state = os.stat(
                    destination_relative[-1],
                    dir_fd=destination_parent_fd,
                    follow_symlinks=False,
                )
                if (
                    source_fd >= 0
                    and (destination_state.st_dev, destination_state.st_ino)
                    == (os.fstat(source_fd).st_dev, os.fstat(source_fd).st_ino)
                ):
                    os.unlink(
                        destination_relative[-1],
                        dir_fd=destination_parent_fd,
                    )
                    os.fsync(destination_parent_fd)
            except OSError:
                pass
        raise
    finally:
        if source_fd >= 0:
            os.close(source_fd)
        if destination_parent_fd >= 0:
            os.close(destination_parent_fd)
        if source_parent_fd >= 0:
            os.close(source_parent_fd)
        os.close(root_fd)


def _remove_matching_destination_link(
    original: Path,
    destination: Path,
    root: Path,
    expected_size: int,
    expected_sha256: str,
) -> bool:
    original_relative = _relative_parts(original, root, "原路径")
    destination_relative = _relative_parts(destination, root, "目标路径")
    root_fd = _open_root_fd(root)
    original_parent_fd = -1
    destination_parent_fd = -1
    original_fd = -1
    destination_fd = -1
    try:
        original_parent_fd = _open_directory_chain(
            root_fd,
            original_relative[:-1],
            create=False,
            label="原文件父目录",
        )
        destination_parent_fd = _open_directory_chain(
            root_fd,
            destination_relative[:-1],
            create=False,
            label="目标文件父目录",
        )
        if not _directory_is_attached(
            root_fd,
            original_relative[:-1],
            original_parent_fd,
        ) or not _directory_is_attached(
            root_fd,
            destination_relative[:-1],
            destination_parent_fd,
        ):
            raise OSError("文件父目录在恢复期间发生变化")

        original_fd = os.open(
            original_relative[-1],
            _file_read_flags(),
            dir_fd=original_parent_fd,
        )
        destination_fd = os.open(
            destination_relative[-1],
            _file_read_flags(),
            dir_fd=destination_parent_fd,
        )
        original_state = os.fstat(original_fd)
        destination_state = os.fstat(destination_fd)
        if (
            not stat.S_ISREG(original_state.st_mode)
            or not stat.S_ISREG(destination_state.st_mode)
            or (original_state.st_dev, original_state.st_ino)
            != (destination_state.st_dev, destination_state.st_ino)
            or original_state.st_size != expected_size
            or _sha256_descriptor(original_fd) != expected_sha256
            or _sha256_descriptor(destination_fd) != expected_sha256
        ):
            return False

        original_entry = os.stat(
            original_relative[-1],
            dir_fd=original_parent_fd,
            follow_symlinks=False,
        )
        destination_entry = os.stat(
            destination_relative[-1],
            dir_fd=destination_parent_fd,
            follow_symlinks=False,
        )
        identity = (original_state.st_dev, original_state.st_ino)
        if (
            (original_entry.st_dev, original_entry.st_ino) != identity
            or (destination_entry.st_dev, destination_entry.st_ino) != identity
        ):
            return False
        os.unlink(destination_relative[-1], dir_fd=destination_parent_fd)
        os.fsync(destination_parent_fd)
        return True
    finally:
        if destination_fd >= 0:
            os.close(destination_fd)
        if original_fd >= 0:
            os.close(original_fd)
        if destination_parent_fd >= 0:
            os.close(destination_parent_fd)
        if original_parent_fd >= 0:
            os.close(original_parent_fd)
        os.close(root_fd)


def apply_plan(plan_path: Path, confirmed: bool) -> tuple[int, Optional[Path], dict[str, object]]:
    if not confirmed:
        raise ValueError("执行整理必须显式提供 --confirm")

    plan = _load_json(plan_path)
    root = _payload_root(plan)
    operations = _validated_operations(plan, root)
    manifest_path, manifest = _create_manifest(root, plan_path, operations)

    entries = manifest["operations"]
    assert isinstance(entries, list)
    for entry in entries:
        assert isinstance(entry, dict)
        source = _absolute_lexical(Path(str(entry["source"])))
        destination = Path(str(entry["destination"]))
        try:
            state, digest = _inspect_file(source, root)
            if state.st_size != entry.get("size") or state.st_mtime_ns != entry.get(
                "mtime_ns"
            ):
                raise OSError("源文件在计划生成后发生变化")
            entry.update(
                {
                    "sha256": digest,
                    "status": "moving",
                    "error": None,
                }
            )
            _write_json_atomic(manifest_path, manifest)
            moved_size, moved_hash = move_no_replace(
                source,
                destination,
                root,
                expected_sha256=digest,
                expected_size=state.st_size,
                expected_mtime_ns=state.st_mtime_ns,
            )
            entry.update(
                {
                    "size": moved_size,
                    "sha256": moved_hash,
                    "status": "moved",
                }
            )
        except (OSError, ValueError) as error:
            entry.update({"status": "failed", "error": str(error)})
        _write_json_atomic(manifest_path, manifest)

    moved = [entry for entry in entries if entry.get("status") == "moved"]
    failures = [entry for entry in entries if entry.get("status") == "failed"]
    manifest["status"] = "partial" if failures else "completed"
    manifest["completed_at"] = _utc_now()
    _write_json_atomic(manifest_path, manifest)
    summary = {
        "moved": len(moved),
        "skipped": 0,
        "failed": len(failures),
        "failures": [
            {
                "source": entry["source"],
                "destination": entry["destination"],
                "error": entry.get("error"),
            }
            for entry in failures
        ],
        "manifest": str(manifest_path),
    }
    return (1 if failures else 0), manifest_path, summary


def undo_manifest(
    manifest_path: Path,
    confirmed: bool,
) -> tuple[int, dict[str, object]]:
    if not confirmed:
        raise ValueError("撤销整理必须显式提供 --confirm")

    manifest = _load_json(manifest_path)
    root = _payload_root(manifest)
    operations = _validated_operations(manifest, root)
    moves = [
        item
        for item in operations
        if item.get("status", "moved") in {"moved", "moving"}
    ]
    restored = 0
    reconciled = 0
    conflicts = 0
    failures = []

    for item in reversed(moves):
        original = _absolute_lexical(Path(str(item["source"])))
        current = _absolute_lexical(Path(str(item["destination"])))
        try:
            original_state = _path_state(original, root)
            current_state = _path_state(current, root)
            status = item.get("status", "moved")
            expected_size = item.get("size")
            expected_hash = item.get("sha256")

            if status == "moving" and original_state is not None:
                if (
                    not isinstance(expected_size, int)
                    or not isinstance(expected_hash, str)
                    or not stat.S_ISREG(original_state.st_mode)
                ):
                    conflicts += 1
                    continue
                original_inspected, original_hash = _inspect_file(original, root)
                if (
                    original_inspected.st_size != expected_size
                    or original_hash != expected_hash
                ):
                    conflicts += 1
                    continue
                if current_state is None:
                    reconciled += 1
                    continue
                if _remove_matching_destination_link(
                    original,
                    current,
                    root,
                    expected_size,
                    expected_hash,
                ):
                    reconciled += 1
                else:
                    conflicts += 1
                continue

            if original_state is not None:
                conflicts += 1
                continue
            if current_state is None:
                failures.append({"path": str(current), "error": "已移动文件不存在"})
                continue
            if not stat.S_ISREG(current_state.st_mode):
                conflicts += 1
                continue
            inspected_state, inspected_hash = _inspect_file(current, root)
            if (
                not isinstance(expected_size, int)
                or not isinstance(expected_hash, str)
                or inspected_state.st_size != expected_size
                or inspected_hash != expected_hash
            ):
                conflicts += 1
                continue
            move_no_replace(
                current,
                original,
                root,
                expected_sha256=expected_hash,
                expected_size=expected_size,
            )
            restored += 1
        except (OSError, ValueError) as error:
            failures.append({"path": str(current), "error": str(error)})

    summary = {
        "restored": restored,
        "reconciled": reconciled,
        "conflicts": conflicts,
        "failed": len(failures),
        "failures": failures,
    }
    return (1 if conflicts or failures else 0), summary


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="安全规划、执行和撤销一个指定目录内的文件整理。"
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    plan_parser = subparsers.add_parser("plan", help="只读扫描并生成 JSON 计划")
    plan_parser.add_argument("target", help="要整理的明确目录")
    plan_parser.add_argument("--output", required=True, help="目标目录外的计划文件")
    plan_parser.add_argument("--recursive", action="store_true", help="递归扫描子目录")
    plan_parser.add_argument(
        "--include-duplicates",
        action="store_true",
        help="将精确重复副本加入待确认移动操作",
    )

    apply_parser = subparsers.add_parser("apply", help="按已确认计划执行移动")
    apply_parser.add_argument("plan", help="JSON 计划文件")
    apply_parser.add_argument("--confirm", action="store_true", help="确认执行计划")

    undo_parser = subparsers.add_parser("undo", help="按执行清单撤销移动")
    undo_parser.add_argument("manifest", help="执行生成的 JSON 清单")
    undo_parser.add_argument("--confirm", action="store_true", help="确认撤销")
    return parser


def main(argv: Optional[list[str]] = None) -> int:
    parser = _parser()
    args = parser.parse_args(argv)
    try:
        if args.command == "plan":
            plan = build_plan(
                Path(args.target),
                recursive=args.recursive,
                include_duplicates=args.include_duplicates,
            )
            destination = Path(args.output)
            write_plan(plan, destination)
            print(
                json.dumps(
                    {
                        "plan": str(_resolved(destination)),
                        **plan["summary"],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
            )
            return 0
        if args.command == "apply":
            code, _, summary = apply_plan(Path(args.plan), args.confirm)
            print(json.dumps(summary, ensure_ascii=False, indent=2))
            return code
        code, summary = undo_manifest(Path(args.manifest), args.confirm)
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return code
    except (OSError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
