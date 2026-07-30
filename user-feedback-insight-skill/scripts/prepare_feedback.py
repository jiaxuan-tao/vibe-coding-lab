#!/usr/bin/env python3
"""Normalize local feedback into traceable evidence records."""

import argparse
import csv
import io
import json
from pathlib import Path
import re
import sys
import unicodedata


TEXT_FIELDS = (
    "feedback",
    "text",
    "comment",
    "content",
    "review",
    "message",
    "反馈",
    "评论",
    "内容",
)
SOURCE_FIELDS = (
    "source",
    "source_id",
    "user_id",
    "user",
    "customer_id",
    "customer",
    "channel",
    "来源",
    "用户",
    "用户id",
    "渠道",
)
JSON_CONTAINERS = ("records", "feedback", "items", "comments", "reviews")
TEXT_EXTENSIONS = {".md", ".markdown", ".txt"}
SUPPORTED_EXTENSIONS = TEXT_EXTENSIONS | {".csv", ".json"}
EMAIL_PATTERN = re.compile(
    r"(?<![\w.+-])[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}(?![\w.-])",
    re.IGNORECASE,
)
PHONE_CN_PATTERN = re.compile(r"(?<!\d)1[3-9]\d{9}(?!\d)")
MARKDOWN_LIST_PATTERN = re.compile(
    r"^\s*(?:[-*+]|\d+[.)])\s+(.+?)\s*$"
)


class FeedbackInputError(ValueError):
    """Represent an input problem that should return CLI exit code 2."""


def read_utf8(path):
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError as error:
        raise FeedbackInputError("输入文件必须使用 UTF-8 编码") from error
    except OSError as error:
        raise FeedbackInputError("无法读取输入文件：{}".format(error)) from error


def _record(source_index, source_line, source, text):
    return {
        "source_index": source_index,
        "source_line": source_line,
        "source": source.strip() if isinstance(source, str) and source.strip() else None,
        "text": text.strip(),
    }


def records_from_text(content):
    lines = content.splitlines()
    nonempty_lines = [
        (line_number, line)
        for line_number, line in enumerate(lines, start=1)
        if line.strip()
    ]
    list_matches = [
        (line_number, MARKDOWN_LIST_PATTERN.match(line))
        for line_number, line in nonempty_lines
    ]
    if list_matches and all(match is not None for _, match in list_matches):
        return [
            _record(
                source_index=position,
                source_line=line_number,
                source=None,
                text=match.group(1),
            )
            for position, (line_number, match) in enumerate(list_matches, start=1)
        ]

    records = []
    buffer = []
    start_line = None

    for line_number, line in enumerate(lines, start=1):
        if line.strip():
            if start_line is None:
                start_line = line_number
            buffer.append(line.rstrip())
            continue

        if buffer:
            records.append(
                _record(
                    source_index=len(records) + 1,
                    source_line=start_line,
                    source=None,
                    text="\n".join(buffer),
                )
            )
            buffer = []
            start_line = None

    if buffer:
        records.append(
            _record(
                source_index=len(records) + 1,
                source_line=start_line,
                source=None,
                text="\n".join(buffer),
            )
        )

    return records


def _field_lookup(fieldnames, candidates):
    normalized = {
        str(field).strip().casefold(): field
        for field in (fieldnames or [])
        if field is not None
    }
    for candidate in candidates:
        match = normalized.get(candidate.casefold())
        if match is not None:
            return match
    return None


def records_from_csv(content):
    try:
        reader = csv.DictReader(io.StringIO(content.lstrip("\ufeff")))
        text_field = _field_lookup(reader.fieldnames, TEXT_FIELDS)
        source_field = _field_lookup(reader.fieldnames, SOURCE_FIELDS)
        if text_field is None:
            raise FeedbackInputError(
                "CSV 缺少反馈文本列；支持：{}".format("、".join(TEXT_FIELDS))
            )

        records = []
        for line_number, row in enumerate(reader, start=2):
            text = (row.get(text_field) or "").strip()
            if not text:
                continue
            source = row.get(source_field) if source_field is not None else None
            records.append(
                _record(
                    source_index=len(records) + 1,
                    source_line=line_number,
                    source=source,
                    text=text,
                )
            )
        return records
    except csv.Error as error:
        raise FeedbackInputError("CSV 解析失败：{}".format(error)) from error


def _json_items(payload):
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in JSON_CONTAINERS:
            value = payload.get(key)
            if isinstance(value, list):
                return value
    raise FeedbackInputError(
        "JSON 必须是数组，或包含 records、feedback、items、comments、reviews 数组"
    )


def records_from_json(content):
    try:
        payload = json.loads(content.lstrip("\ufeff"))
    except json.JSONDecodeError as error:
        raise FeedbackInputError("JSON 解析失败：{}".format(error.msg)) from error

    records = []
    for item in _json_items(payload):
        if isinstance(item, str):
            text = item.strip()
            source = None
        elif isinstance(item, dict):
            text_field = _field_lookup(item.keys(), TEXT_FIELDS)
            source_field = _field_lookup(item.keys(), SOURCE_FIELDS)
            text = str(item.get(text_field) or "").strip() if text_field else ""
            source = item.get(source_field) if source_field else None
            if source is not None:
                source = str(source)
        else:
            continue

        if not text:
            continue
        records.append(
            _record(
                source_index=len(records) + 1,
                source_line=None,
                source=source,
                text=text,
            )
        )
    return records


def load_records(path):
    if not path.exists():
        raise FeedbackInputError("文件不存在：{}".format(path))
    if not path.is_file():
        raise FeedbackInputError("输入路径必须是文件：{}".format(path))

    extension = path.suffix.casefold()
    if extension not in SUPPORTED_EXTENSIONS:
        raise FeedbackInputError(
            "不支持的文件类型：{}；支持 .md、.txt、.csv、.json".format(
                extension or "无扩展名"
            )
        )

    content = read_utf8(path)
    if extension in TEXT_EXTENSIONS:
        format_name = "text"
        records = records_from_text(content)
    elif extension == ".csv":
        format_name = "csv"
        records = records_from_csv(content)
    else:
        format_name = "json"
        records = records_from_json(content)

    if not records:
        raise FeedbackInputError("输入中没有可用反馈记录")
    return format_name, records


def normalize_for_duplicate(text):
    normalized = unicodedata.normalize("NFKC", text).casefold().strip()
    return re.sub(r"\s+", " ", normalized)


def detect_pii(text):
    pii_types = []
    if EMAIL_PATTERN.search(text):
        pii_types.append("email")
    if PHONE_CN_PATTERN.search(text):
        pii_types.append("phone_cn")
    return pii_types


def annotate_records(records):
    seen = {}
    annotated = []

    for position, record in enumerate(records, start=1):
        record_id = "FB-{:04d}".format(position)
        duplicate_key = normalize_for_duplicate(record["text"])
        duplicate_of = seen.get(duplicate_key)
        if duplicate_of is None:
            seen[duplicate_key] = record_id

        annotated.append(
            {
                "id": record_id,
                "source_index": record["source_index"],
                "source_line": record["source_line"],
                "source": record["source"],
                "text": record["text"],
                "duplicate_of": duplicate_of,
                "pii_types": detect_pii(record["text"]),
            }
        )

    return annotated


def build_payload(path, format_name, records):
    annotated = annotate_records(records)
    sources = [
        record["source"].strip()
        for record in annotated
        if isinstance(record["source"], str) and record["source"].strip()
    ]
    unique_sources = {source.casefold() for source in sources}
    duplicate_count = sum(record["duplicate_of"] is not None for record in annotated)
    pii_record_count = sum(bool(record["pii_types"]) for record in annotated)

    warnings = []
    if duplicate_count:
        warnings.append(
            "检测到 {} 条可能重复记录；重复不应增加独立证据强度。".format(
                duplicate_count
            )
        )
    if not sources:
        warnings.append("输入没有来源字段，无法计算独立来源数。")
    elif len(sources) < len(annotated):
        warnings.append("部分记录缺少来源字段，独立来源数可能被低估。")
    if pii_record_count:
        warnings.append(
            "检测到 {} 条记录含潜在直接身份信息；分析前请脱敏，引用时避免复述原值。".format(
                pii_record_count
            )
        )

    return {
        "source_file": str(path.resolve()),
        "format": format_name,
        "summary": {
            "record_count": len(annotated),
            "unique_record_count": len(annotated) - duplicate_count,
            "duplicate_count": duplicate_count,
            "source_count": len(sources),
            "unique_source_count": len(unique_sources),
            "pii_record_count": pii_record_count,
        },
        "warnings": warnings,
        "records": annotated,
    }


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="将本地反馈文件规范化为可追溯的 JSON 证据记录。"
    )
    parser.add_argument("input_file", help="UTF-8 .md、.txt、.csv 或 .json 文件")
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    path = Path(args.input_file)

    try:
        format_name, records = load_records(path)
        payload = build_payload(path, format_name, records)
    except FeedbackInputError as error:
        print("错误：{}".format(error), file=sys.stderr)
        return 2

    json.dump(payload, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
