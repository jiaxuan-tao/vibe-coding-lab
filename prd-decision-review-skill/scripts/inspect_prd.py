#!/usr/bin/env python3
"""Inspect PRD Markdown structure without changing the source document."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import sys


SECTION_PATTERNS = {
    "user_problem": ("用户问题", "问题背景", "用户痛点", "problem"),
    "target_user": ("目标用户", "用户画像", "target user", "persona"),
    "goal_metrics": ("产品目标", "成功指标", "成功标准", "metrics", "success criteria"),
    "scope": ("mvp", "需求范围", "本次包含", "排除项", "out of scope"),
    "user_flow": ("用户流程", "关键流程", "用户场景", "user flow", "user scenario"),
    "acceptance": ("验收标准", "验收场景", "acceptance", "given", "when", "then"),
    "dependencies_risks": ("依赖", "风险", "权限", "合规", "dependency", "risk"),
}

PLACEHOLDER_RE = re.compile(
    r"\b(?:TODO|TBD|FIXME|XXX)\b|待补充|待确认|待完善|\[NEEDS CLARIFICATION",
    re.I,
)
VAGUE_TERMS = ("优化", "提升", "友好", "尽快", "适当", "智能", "高效", "稳定")
NOTE = "结构检查不能替代产品判断，也不生成质量分数。"


def _section_matches(lines: list[str], patterns: tuple[str, ...]) -> list[str]:
    matches = []
    for line in lines:
        if any(pattern.casefold() in line.casefold() for pattern in patterns):
            evidence = line.lstrip("#").strip()
            if evidence not in matches:
                matches.append(evidence)
    return matches


def _acceptance_scenarios(lines: list[str]) -> int:
    """Count line-based Given, When, Then sequences in that order."""
    scenarios = 0
    for index, line in enumerate(lines):
        if not re.search(r"\bgiven\b", line, re.I):
            continue
        block = lines[index + 1 :]
        next_given = next(
            (offset for offset, item in enumerate(block) if re.search(r"\bgiven\b", item, re.I)),
            len(block),
        )
        block = block[:next_given]
        when_index = next(
            (offset for offset, item in enumerate(block) if re.search(r"\bwhen\b", item, re.I)),
            None,
        )
        if when_index is not None and any(
            re.search(r"\bthen\b", item, re.I) for item in block[when_index + 1 :]
        ):
            scenarios += 1
    return scenarios


def inspect_document(text: str, path: str = "<memory>") -> dict[str, object]:
    """Return structural evidence found in PRD Markdown text."""
    lines = text.splitlines()
    placeholders = []
    vague_terms = []
    for line_number, line in enumerate(lines, start=1):
        placeholders.extend(
            {"line": line_number, "text": match.group(0)}
            for match in PLACEHOLDER_RE.finditer(line)
        )
        vague_terms.extend(
            {"line": line_number, "term": term}
            for term in VAGUE_TERMS
            if term in line
        )

    sections = {}
    for name, patterns in SECTION_PATTERNS.items():
        matches = _section_matches(lines, patterns)
        sections[name] = {"present": bool(matches), "matches": matches}

    return {
        "path": path,
        "sections": sections,
        "placeholders": placeholders,
        "vague_terms": vague_terms,
        "acceptance_scenarios": _acceptance_scenarios(lines),
        "notes": [NOTE],
    }


def render_text(report: dict[str, object]) -> str:
    """Render a human-readable evidence report without quality judgments."""
    sections = report["sections"]
    assert isinstance(sections, dict)
    lines = [f"PRD structure inspection: {report['path']}", "Sections:"]
    for name, section in sections.items():
        assert isinstance(section, dict)
        status = "present" if section["present"] else "missing"
        matches = ", ".join(section["matches"]) or "-"
        lines.append(f"- {name}: {status} ({matches})")
    lines.append(f"Acceptance scenarios: {report['acceptance_scenarios']}")
    for key in ("placeholders", "vague_terms"):
        lines.append(f"{key.replace('_', ' ').title()}:")
        for item in report[key]:
            lines.append(f"- line {item['line']}: {item.get('text', item.get('term'))}")
    lines.extend(report["notes"])
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Read-only PRD Markdown structure inspector.")
    parser.add_argument("file", help="PRD Markdown file to inspect")
    parser.add_argument("--json", action="store_true", dest="as_json", help="emit JSON")
    args = parser.parse_args(argv)

    source = Path(args.file)
    if not source.is_file():
        print(f"error: not a readable file: {source}", file=sys.stderr)
        return 2
    try:
        text = source.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as error:
        print(f"error: cannot read {source}: {error}", file=sys.stderr)
        return 2

    report = inspect_document(text, str(source))
    if args.as_json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print(render_text(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
