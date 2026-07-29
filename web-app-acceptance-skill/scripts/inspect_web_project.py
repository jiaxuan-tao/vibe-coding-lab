#!/usr/bin/env python3
"""只读检查 Web 项目的可用验收信息。"""

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List


KNOWN_BUILD_DIRECTORIES = ("dist", "build", "out", ".next")


def infer_package_manager(project_path: Path) -> str:
    if (project_path / "pnpm-lock.yaml").is_file():
        return "pnpm"
    if (project_path / "yarn.lock").is_file():
        return "yarn"
    if (project_path / "bun.lockb").is_file() or (project_path / "bun.lock").is_file():
        return "bun"
    return "npm"


def infer_build_directories(package_data: Dict[str, Any]) -> List[str]:
    scripts = package_data.get("scripts", {})
    build_command = scripts.get("build", "") if isinstance(scripts, dict) else ""
    directories = []
    if "next" in build_command:
        directories.append(".next")
    if "vite" in build_command or "astro" in build_command:
        directories.append("dist")
    if "react-scripts" in build_command:
        directories.append("build")
    if "export" in build_command:
        directories.append("out")
    return directories or list(KNOWN_BUILD_DIRECTORIES)


def inspect_project(project_path: Path) -> Dict[str, Any]:
    project_path = project_path.resolve()
    result: Dict[str, Any] = {
        "project_path": str(project_path),
        "status": "warning",
        "package_manager": None,
        "scripts": {},
        "build_directories": [],
        "warnings": [],
    }

    if not project_path.is_dir():
        result["warnings"].append("项目路径不存在或不是目录")
        return result

    package_json = project_path / "package.json"
    if not package_json.is_file():
        result["warnings"].append("未找到 package.json")
        return result

    try:
        package_data = json.loads(package_json.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        result["warnings"].append("package.json 不是有效 JSON")
        return result

    scripts = package_data.get("scripts", {})
    if not isinstance(scripts, dict):
        scripts = {}
        result["warnings"].append("package.json 的 scripts 不是对象")

    result.update(
        {
            "status": "ok",
            "package_manager": infer_package_manager(project_path),
            "scripts": scripts,
            "build_directories": infer_build_directories(package_data),
        }
    )
    if "build" not in scripts:
        result["warnings"].append("未定义 build 脚本；请人工确认构建命令")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="只读检查 Web 项目的 package.json 与候选构建目录。")
    parser.add_argument("project_path", type=Path, help="待验收项目目录")
    args = parser.parse_args()
    print(json.dumps(inspect_project(args.project_path), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
