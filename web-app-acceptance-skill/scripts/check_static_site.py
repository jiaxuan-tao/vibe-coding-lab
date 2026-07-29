#!/usr/bin/env python3
"""只读检查静态 HTML 站点中的本地引用。"""

import argparse
import json
from html.parser import HTMLParser
from pathlib import Path
from typing import Dict, List, Tuple
from urllib.parse import unquote, urlparse


RESOURCE_TAGS = {"img", "script", "source", "audio", "video", "iframe"}


class ReferenceParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.references: List[Tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, str]]) -> None:
        attributes = dict(attrs)
        if tag == "a" and attributes.get("href"):
            self.references.append(("link", attributes["href"]))
        elif tag == "link" and attributes.get("href"):
            self.references.append(("resource", attributes["href"]))
        elif tag in RESOURCE_TAGS and attributes.get("src"):
            self.references.append(("resource", attributes["src"]))


def empty_report(site_dir: Path) -> Dict[str, object]:
    return {
        "site_path": str(site_dir.resolve()),
        "status": "passed",
        "pages_scanned": 0,
        "broken_links": [],
        "missing_resources": [],
        "skipped": [],
        "warnings": [],
    }


def is_external_or_fragment(reference: str) -> bool:
    parsed = urlparse(reference)
    return bool(parsed.scheme or parsed.netloc or reference.startswith("#"))


def resolve_reference(site_dir: Path, html_file: Path, reference: str) -> Path:
    parsed = urlparse(reference)
    reference_path = unquote(parsed.path)
    if reference_path.startswith("/"):
        candidate = site_dir / reference_path.lstrip("/")
    else:
        candidate = html_file.parent / reference_path
    return candidate.resolve()


def is_within_site(site_dir: Path, candidate: Path) -> bool:
    try:
        candidate.relative_to(site_dir)
        return True
    except ValueError:
        return False


def exists_as_page_or_resource(candidate: Path, reference_kind: str) -> bool:
    if candidate.is_file():
        return True
    if reference_kind == "link" and candidate.is_dir() and (candidate / "index.html").is_file():
        return True
    return False


def check_site(site_dir: Path) -> Dict[str, object]:
    site_dir = site_dir.resolve()
    report = empty_report(site_dir)
    if not site_dir.is_dir():
        report["status"] = "warning"
        report["warnings"].append("站点路径不存在或不是目录")
        return report

    html_files = sorted(site_dir.rglob("*.html"))
    report["pages_scanned"] = len(html_files)
    if not html_files:
        report["status"] = "warning"
        report["warnings"].append("未找到 HTML 文件")
        return report

    broken_links = set()
    missing_resources = set()
    skipped = set()
    warnings = set()

    for html_file in html_files:
        parser = ReferenceParser()
        try:
            parser.feed(html_file.read_text(encoding="utf-8"))
        except UnicodeDecodeError:
            warnings.add(f"无法以 UTF-8 读取：{html_file.relative_to(site_dir)}")
            continue

        for reference_kind, reference in parser.references:
            if is_external_or_fragment(reference):
                skipped.add(reference)
                continue
            candidate = resolve_reference(site_dir, html_file, reference)
            if not is_within_site(site_dir, candidate):
                warnings.add(f"引用超出站点目录：{reference}")
                continue
            if exists_as_page_or_resource(candidate, reference_kind):
                continue
            relative_reference = str(candidate.relative_to(site_dir))
            if reference_kind == "link":
                broken_links.add(relative_reference)
            else:
                missing_resources.add(relative_reference)

    report["broken_links"] = sorted(broken_links)
    report["missing_resources"] = sorted(missing_resources)
    report["skipped"] = sorted(skipped)
    report["warnings"] = sorted(warnings)
    if broken_links or missing_resources:
        report["status"] = "failed"
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="只读检查静态 HTML 的本地链接和资源。")
    parser.add_argument("site_path", type=Path, help="待检查的静态站点目录")
    args = parser.parse_args()
    report = check_site(args.site_path)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if report["status"] == "failed" else 0


if __name__ == "__main__":
    raise SystemExit(main())
