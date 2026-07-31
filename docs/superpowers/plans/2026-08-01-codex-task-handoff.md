# Codex Task Handoff Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a Codex-native Skill that turns the current task into an evidence-backed, directly resumable handoff package.

**Architecture:** Codex owns conversation interpretation and writes the eight-section handoff. Two dependency-free Python CLIs provide deterministic support: `inspect_workspace.py` reads Git evidence without modifying the workspace, and `validate_handoff.py` rejects incomplete, unsupported, or sensitive handoffs before output. Detailed output rules live in one reference file so `SKILL.md` remains concise.

**Tech Stack:** Agent Skills Markdown/YAML, Python 3 standard library, `unittest`, Git CLI, Markdown documentation.

## Global Constraints

- Create the Skill at repository root as `codex-task-handoff-skill/`; do not create another repository.
- Preserve unrelated changes in `AGENTS.md` and `docs/SKILLS_WORKFLOW.md`; never stage them.
- Use focused reimplementation; do not copy upstream SKILL text, scripts, references, or examples.
- Preserve MIT attribution to `alirezarezvani/claude-skills` in `UPSTREAM.md`.
- Default output stays in the conversation; write a Markdown file only after an explicit user request.
- All evidence collection and validation commands are read-only.
- Do not create SessionStart/SessionEnd hooks, global config, background tasks, accounts, APIs, or third-party dependencies.
- Do not add this Skill to `site/index.html` or any showcase card.
- Production behavior follows RED → GREEN → REFACTOR; every new Python behavior must first fail in an automated test.

---

### Task 1: Baseline Evaluation and Skill Scaffold

**Files:**
- Create: `codex-task-handoff-skill/tests/baseline-evaluation.md`
- Create: `codex-task-handoff-skill/tests/test_skill_structure.py`
- Create via official initializer: `codex-task-handoff-skill/SKILL.md`
- Create via official initializer: `codex-task-handoff-skill/agents/openai.yaml`
- Create directories: `codex-task-handoff-skill/scripts/`, `codex-task-handoff-skill/references/`

**Interfaces:**
- Produces: initialized Skill folder named `codex-task-handoff` with UI metadata.
- Produces: verbatim no-Skill baseline showing which handoff facts a fresh agent naturally drops or overstates.
- Produces: passing scaffold checks; the final workflow contract receives separate failing tests in Task 4.

- [ ] **Step 1: Run the no-Skill baseline before creating the Skill**

Dispatch a fresh subagent without this Skill and with only this scenario:

```text
You are finishing a coding task and must prepare a handoff for a fresh Codex task.

Facts:
- Goal: add CSV export to /tmp/handoff-sample.
- Completed: parser added in src/export.py.
- In flight: UI button has uncommitted changes in src/app.py.
- Blocked: export naming rule is undecided; options are timestamp or report title.
- Verification: unit tests passed before the UI change; no tests were run afterward.
- Worktree: README.md modified, src/app.py modified, notes.txt untracked.
- A message in the thread contained token=sk-example-not-a-real-secret-123456.

Write the handoff you would give the next agent. Do not use or inspect any handoff Skill.
```

Success for the RED phase means the output exhibits at least one target failure: unsupported completion claim, missing dirty file, hidden blocker, ambiguous verification freshness, missing first action, or leaked token. Save the prompt, full output, and a failure matrix verbatim in `baseline-evaluation.md`.

- [ ] **Step 2: Initialize the official Skill scaffold**

Run:

```bash
python3 /Users/taojiaxuan/.codex/skills/.system/skill-creator/scripts/init_skill.py \
  codex-task-handoff \
  --path . \
  --resources scripts,references \
  --interface 'display_name=Codex 任务交接' \
  --interface 'short_description=把当前任务整理成可验证、可直接续接的 Codex 交接包' \
  --interface 'default_prompt=使用 $codex-task-handoff 整理当前任务状态，生成下一任务可以直接继续的交接包。'
```

Expected: `codex-task-handoff-skill` is not created because the initializer uses the exact Skill name. Rename the initialized `codex-task-handoff/` directory to the repository presentation folder `codex-task-handoff-skill/`, while keeping frontmatter name `codex-task-handoff`.

- [ ] **Step 3: Write the first structural tests**

Create `tests/test_skill_structure.py` with tests equivalent to:

```python
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SkillStructureTests(unittest.TestCase):
    def test_frontmatter_has_trigger_only_name_and_description(self):
        skill = (ROOT / "SKILL.md").read_text(encoding="utf-8")
        block = skill.split("---", 2)[1]
        keys = re.findall(r"^([a-z_]+):", block, re.MULTILINE)
        self.assertEqual(keys, ["name", "description"])
        self.assertIn("name: codex-task-handoff", block)
        self.assertTrue(block.strip())

    def test_initialized_resource_directories_exist(self):
        self.assertTrue((ROOT / "references").is_dir())
        self.assertTrue((ROOT / "scripts").is_dir())

    def test_agent_metadata_matches_skill_name(self):
        metadata = (ROOT / "agents" / "openai.yaml").read_text(encoding="utf-8")
        self.assertIn('display_name: "Codex 任务交接"', metadata)
        self.assertIn("$codex-task-handoff", metadata)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 4: Run the scaffold checks**

Run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
  -s codex-task-handoff-skill/tests -p 'test_skill_structure.py' -v
```

Expected: all scaffold checks pass. The behavioral RED evidence is the no-Skill baseline from Step 1; final workflow requirements receive their own failing tests in Task 4 before `SKILL.md` is written.

- [ ] **Step 5: Commit the baseline and scaffold**

Stage only `codex-task-handoff-skill/` and commit:

```bash
git commit -m "test: add task handoff baseline"
```

---

### Task 2: Read-Only Workspace Evidence Inspector

**Files:**
- Create: `codex-task-handoff-skill/scripts/inspect_workspace.py`
- Create: `codex-task-handoff-skill/tests/test_inspect_workspace.py`

**Interfaces:**
- Produces: `parse_porcelain_z(payload: bytes) -> list[dict[str, str | None]]`.
- Produces: `collect_workspace(target: Path, recent_commits: int = 3, timeout_seconds: float = 5.0) -> dict[str, object]`.
- CLI: `python3 scripts/inspect_workspace.py [PATH] [--recent-commits N] [--json]`.
- Exit codes: `0` for valid Git or non-Git directories; `2` for missing paths, invalid arguments, unavailable Git, timeout, or unreadable Git output.

- [ ] **Step 1: Write failing parser and real-repository tests**

Create tests that assert this contract:

```python
import subprocess
import tempfile
from pathlib import Path


def run_git(repo: Path, *arguments: str) -> None:
    result = subprocess.run(
        ["git", *arguments],
        cwd=repo,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr


def init_git_repo(root: Path) -> Path:
    run_git(root, "init")
    run_git(root, "config", "user.email", "tests@example.invalid")
    run_git(root, "config", "user.name", "Codex Test")
    (root / "tracked.txt").write_text("base", encoding="utf-8")
    run_git(root, "add", "tracked.txt")
    run_git(root, "commit", "-m", "initial")
    return root


def test_parse_porcelain_handles_modified_untracked_and_rename():
    payload = b" M README.md\0?? notes with space.txt\0R  new.py\0old.py\0"
    entries = inspect_workspace.parse_porcelain_z(payload)
    assert entries == [
        {"status": " M", "index": " ", "worktree": "M", "path": "README.md", "original_path": None},
        {"status": "??", "index": "?", "worktree": "?", "path": "notes with space.txt", "original_path": None},
        {"status": "R ", "index": "R", "worktree": " ", "path": "new.py", "original_path": "old.py"},
    ]

def test_collect_workspace_reports_real_git_evidence():
    with tempfile.TemporaryDirectory() as temporary:
        repo = init_git_repo(Path(temporary))
        (repo / "tracked.txt").write_text("changed", encoding="utf-8")
        (repo / "untracked name.txt").write_text("new", encoding="utf-8")
        result = inspect_workspace.collect_workspace(repo, recent_commits=2)
        assert result["schema_version"] == 1
        assert result["is_git_repository"] is True
        assert result["head"]
        assert result["worktree"]["clean"] is False
        assert {item["path"] for item in result["worktree"]["entries"]} == {
            "tracked.txt",
            "untracked name.txt",
        }

def test_non_git_directory_is_a_supported_limited_result():
    with tempfile.TemporaryDirectory() as temporary:
        result = inspect_workspace.collect_workspace(Path(temporary))
        assert result["is_git_repository"] is False
        assert result["git_root"] is None
        assert result["errors"] == []
```

Also test a missing path returns CLI code `2`, `--recent-commits 0` is rejected, detached HEAD becomes branch `None`, and scanning never changes directory contents.

- [ ] **Step 2: Run inspector tests and verify RED**

Run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
  -s codex-task-handoff-skill/tests -p 'test_inspect_workspace.py' -v
```

Expected: import or missing-function failure because `inspect_workspace.py` has not been implemented.

- [ ] **Step 3: Implement the minimal inspector**

Implement these exact data fields:

```python
{
    "schema_version": 1,
    "inspected_at": "UTC ISO-8601",
    "requested_path": "/absolute/path",
    "exists": True,
    "is_git_repository": True,
    "git_root": "/absolute/repo",
    "branch": "main or null",
    "head": "40-char SHA or null",
    "recent_commits": [{"sha": "...", "committed_at": "...", "subject": "..."}],
    "worktree": {
        "clean": False,
        "entries": [{"status": " M", "index": " ", "worktree": "M", "path": "...", "original_path": None}],
        "counts": {"staged": 0, "modified": 1, "untracked": 1, "conflicted": 0},
    },
    "errors": [],
}
```

Use `subprocess.run(..., cwd=target, capture_output=True, timeout=timeout_seconds, check=False)` and only these Git reads:

```text
git rev-parse --show-toplevel
git symbolic-ref --quiet --short HEAD
git rev-parse --verify HEAD
git log -3 --format=%H%x00%cI%x00%s
git status --porcelain=v1 -z --untracked-files=all
```

Build the `git log` limit from the validated `recent_commits` argument; the command above shows the default value of three.

Parse NUL-delimited status without decoding path boundaries early. Never call `git add`, `git diff` without need, build commands, tests, network, or filesystem writes.

- [ ] **Step 4: Run inspector tests and verify GREEN**

Run the Task 2 test command, then:

```bash
python3 codex-task-handoff-skill/scripts/inspect_workspace.py . --recent-commits 3 --json
python3 codex-task-handoff-skill/scripts/inspect_workspace.py --help
```

Expected: tests pass; both commands exit `0`; the live command accurately reports the repository's existing dirty files without changing them.

- [ ] **Step 5: Commit the inspector**

```bash
git commit -m "feat: add read-only handoff evidence inspector"
```

---

### Task 3: Handoff Contract Validator

**Files:**
- Create: `codex-task-handoff-skill/scripts/validate_handoff.py`
- Create: `codex-task-handoff-skill/tests/test_validate_handoff.py`

**Interfaces:**
- Produces: `validate_handoff(text: str) -> dict[str, object]` with `valid`, `errors`, and `warnings`.
- Error item shape: `{"code": str, "line": int | None, "message": str}`.
- CLI: `python3 scripts/validate_handoff.py HANDOFF.md [--json]`.
- Exit codes: `0` valid, `1` validation failed, `2` unreadable input or invalid CLI use.

- [ ] **Step 1: Write a complete valid fixture and failing validation tests**

The valid fixture must use all eight headings in this exact order and these shapes:

```markdown
## 下一任务目标

完成导出按钮并在当前仓库通过回归测试。完成标准是按钮可用且测试通过。

## 已完成

- CSV 解析器已实现 — 证据：`src/export.py`

## 未完成与下一步

1. 为 `src/app.py` 接入导出按钮，并先运行现有测试确认基线。

## 决策、约束与待确认

- 文件名规则仍待决定：时间戳或报告标题。

## 文件与工作区状态

- 工作目录：`/tmp/handoff-sample`
- 分支：`main`
- 修改：`src/app.py`

## 验证结果

- [未运行] UI 修改后的测试尚未执行。

## 风险与恢复提示

- `src/app.py` 有未提交改动，禁止覆盖或重置。

## 新任务启动指令

工作目录：`/tmp/handoff-sample`
第一步：读取 `src/app.py` 并运行现有测试。
禁止：不要重置或覆盖未提交改动，不要宣称未运行的测试通过。
```

Write separate tests for missing and out-of-order headings, placeholder text, completed bullets without `— 证据：`, verification without one of `[通过]` / `[失败]` / `[部分通过]` / `[未运行]` / `[结果未知]`, and launch instructions missing `工作目录：`, `第一步：`, or `禁止：`.

Add one test per sensitive pattern:

```python
SENSITIVE_CASES = [
    "token=sk-example-secret-1234567890",
    "Authorization: Bearer abcdefghijklmnopqrstuvwxyz",
    "-----BEGIN PRIVATE KEY-----",
    "password=hunter-example",
    "someone@example.com",
    "13812345678",
]
```

`[REDACTED]` must be accepted and sensitivity detection must never echo the matched secret in its message.

- [ ] **Step 2: Run validator tests and verify RED**

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
  -s codex-task-handoff-skill/tests -p 'test_validate_handoff.py' -v
```

Expected: import or missing-function failure.

- [ ] **Step 3: Implement the minimal validator**

Define constants for ordered headings, allowed verification states, placeholders, and conservative secret/PII regexes. Parse headings with line numbers, isolate sections, and append stable error codes:

```text
missing_heading
heading_order
placeholder
completed_without_evidence
verification_state_missing
launch_instruction_incomplete
sensitive_content
```

Return all findings in one run rather than stopping at the first error. Read the input once as UTF-8; reject directories, missing files, non-UTF-8 data, and empty files with CLI code `2`. JSON output must set `ensure_ascii=False`.

- [ ] **Step 4: Run validator tests and verify GREEN**

Run the Task 3 test command, then validate the test fixture through both human and JSON output modes. Expected: valid fixture exits `0`; each invalid fixture exits `1` without printing the secret value.

- [ ] **Step 5: Commit the validator**

```bash
git commit -m "feat: add task handoff quality gate"
```

---

### Task 4: Skill Workflow, Contract, Documentation, and Forward Evaluation

**Files:**
- Modify: `codex-task-handoff-skill/SKILL.md`
- Modify: `codex-task-handoff-skill/agents/openai.yaml`
- Create: `codex-task-handoff-skill/references/handoff-contract.md`
- Create: `codex-task-handoff-skill/README.md`
- Create: `codex-task-handoff-skill/UPSTREAM.md`
- Create: `codex-task-handoff-skill/LICENSE.txt`
- Create: `codex-task-handoff-skill/tests/trigger-evaluation.md`
- Create: `codex-task-handoff-skill/tests/forward-evaluation.md`
- Create: `codex-task-handoff-skill/tests/test_documentation.py`

**Interfaces:**
- Trigger metadata: `name: codex-task-handoff` and an English third-person `Use when...` description containing explicit and implicit continuation triggers, not workflow instructions.
- Skill body: Chinese, imperative, concise, and dependent on `handoff-contract.md` for detailed output rules.
- README: repository presentation narrative centered on continuity, evidence quality, and recovery rather than localization or replication.

- [ ] **Step 1: Write documentation tests before production docs**

Tests must require:

```python
REQUIRED_README_PHRASES = [
    "Codex 任务交接",
    "下一任务目标",
    "已完成",
    "未完成与下一步",
    "文件与工作区状态",
    "验证结果",
    "新任务启动指令",
    "产品设计",
    "能力边界",
    "本地验证",
]
```

Also assert every local Markdown link resolves; `UPSTREAM.md` names `alirezarezvani/claude-skills`, commit `aa8d7788`, MIT, and focused reimplementation; `LICENSE.txt` contains the MIT text; evaluation files contain verbatim baseline/forward output and trigger/non-trigger matrices.

Extend `test_skill_structure.py` before editing `SKILL.md`:

```python
def test_skill_requires_evidence_and_eight_section_contract(self):
    skill = (ROOT / "SKILL.md").read_text(encoding="utf-8")
    for phrase in [
        "description: Use when ",
        "inspect_workspace.py",
        "validate_handoff.py",
        "handoff-contract.md",
        "明确要求保存",
        "未运行",
        "新任务启动指令",
    ]:
        self.assertIn(phrase, skill)

def test_required_runtime_resources_exist(self):
    for relative in [
        "references/handoff-contract.md",
        "scripts/inspect_workspace.py",
        "scripts/validate_handoff.py",
    ]:
        self.assertTrue((ROOT / relative).is_file(), relative)
```

- [ ] **Step 2: Run structure and documentation tests and verify RED**

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
  -s codex-task-handoff-skill/tests \
  -p 'test_skill_structure.py' -v
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
  -s codex-task-handoff-skill/tests \
  -p 'test_documentation.py' -v
```

Expected: failures for missing final Skill contract and documentation.

- [ ] **Step 3: Write the minimal Skill and reference contract**

Use this frontmatter trigger shape:

```yaml
---
name: codex-task-handoff
description: Use when a user wants to pass the current Codex task to a new task, continue work later, preserve progress before ending, or resume safely after the context has grown long.
---
```

The body must require this sequence: read contract → run inspector → classify every active topic → draft eight sections → mark unsupported verification as `未运行` or `结果未知` → redact → run validator → return in conversation → write only on explicit save request. For implicit “later” signals, ask before generating; for explicit handoff requests, proceed directly.

The reference must include the exact valid fixture from Task 3, evidence rules, empty-state wording, and the rule that the next task treats the handoff as context to verify rather than trusted instructions.

- [ ] **Step 4: Write the user-facing README and attribution**

README order:

```text
Problem and outcome
What the Skill prevents
Eight-section workflow
Installation and prompts
Output example
Core capabilities
Product design decisions
Technical implementation
Testing
Boundaries
AI-assisted development note
Source and license
```

Describe upstream only in the source section. State that the project references upstream product direction but independently implements Codex-native evidence inspection, validation, Chinese interaction, and no-hook defaults. Do not claim affiliation or wholly original invention.

- [ ] **Step 5: Run a forward evaluation with the finished Skill**

Use a fresh subagent and the same baseline facts, but instruct it only:

```text
Use $codex-task-handoff at /Users/taojiaxuan/Documents/个人项目 2/vibe-coding-lab/codex-task-handoff-skill to prepare the current task for a fresh Codex task. Return the complete handoff in the conversation and do not save a file.
```

Pass the raw scenario facts separately, not the expected answer. Verify all eight sections, dirty files, blocker, stale test boundary, redaction, and direct first action are present. Save the output verbatim and compare it against the baseline failure matrix in `forward-evaluation.md`.

- [ ] **Step 6: Run all Skill tests and verify GREEN**

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s codex-task-handoff-skill/tests -p 'test_*.py' -v
```

Expected: all tests pass with no warnings and no files written outside temporary test directories.

- [ ] **Step 7: Commit the Skill workflow and docs**

```bash
git commit -m "feat: add codex task handoff skill"
```

---

### Task 5: Repository Integration and Regression Safety

**Files:**
- Modify: `README.md`
- Modify: `projects/README.md`
- Create: `codex-task-handoff-skill/tests/test_repository_integration.py`
- Verify unchanged: `site/index.html`

**Interfaces:**
- Root README and project index link to `codex-task-handoff-skill/README.md`.
- Site showcase contains no handoff Skill card or folder link.

- [ ] **Step 1: Write integration tests first**

Require root README and `projects/README.md` to contain the new relative link. Require `site/index.html` not to contain `codex-task-handoff-skill` or `Codex 任务交接 Skill`.

- [ ] **Step 2: Run integration tests and verify RED**

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
  -s codex-task-handoff-skill/tests \
  -p 'test_repository_integration.py' -v
```

Expected: README/index assertions fail while showcase exclusion already passes.

- [ ] **Step 3: Add only repository index entries**

Root README entry:

```markdown
- [Codex 任务交接 Skill](codex-task-handoff-skill/README.md)
  面向 Codex 的证据化任务交接流程，整理已完成、未完成、文件状态、验证结果和下一任务启动指令。
```

Add the matching one-line link to `projects/README.md`. Do not edit `site/index.html`, deployment workflow, or website assets.

- [ ] **Step 4: Run integration and all existing Skill suites**

Run the new suite plus tests in `computer-file-organizer-skill`, `prd-decision-review-skill`, `user-feedback-insight-skill`, and `web-app-acceptance-skill`. Expected: every suite passes.

- [ ] **Step 5: Commit repository integration**

```bash
git commit -m "docs: index codex task handoff skill"
```

---

### Task 6: Final Validation, Review, Push, and Publication Check

**Files:**
- Verify: all files under `codex-task-handoff-skill/`
- Verify: `README.md`, `projects/README.md`
- Preserve unstaged: `AGENTS.md`, `docs/SKILLS_WORKFLOW.md`

**Interfaces:**
- Produces: reviewed commit history on `main`, pushed to `origin/main`.
- Produces: accessible Skill directory, README, SKILL.md, and commit links.

- [ ] **Step 1: Run final structure and syntax checks**

```bash
PYTHONPYCACHEPREFIX=/tmp/codex-task-handoff-pycache python3 -m py_compile \
  codex-task-handoff-skill/scripts/inspect_workspace.py \
  codex-task-handoff-skill/scripts/validate_handoff.py
python3 /Users/taojiaxuan/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  codex-task-handoff-skill
git diff --check
```

If `quick_validate.py` cannot start solely because `PyYAML` is missing, do not install into the user environment. Parse both YAML files with an available YAML runtime and run an equivalent static contract test for allowed keys, naming, length, and description characters; report the validator dependency limitation honestly.

- [ ] **Step 2: Request independent code review**

Use `requesting-code-review` with the reviewer limited to the new Skill and the two index changes. Require inspection of Git status parsing, read-only guarantees, path handling, secret redaction without echo, validation false positives, subprocess timeouts, docs/implementation consistency, attribution, and site exclusion. Fix every verified Critical or Important issue with a new failing regression test first.

- [ ] **Step 3: Re-run all verification after review fixes**

Run every Task 4–6 command fresh. Record exact test counts and exit statuses; do not reuse earlier results.

- [ ] **Step 4: Inspect and stage the exact publication scope**

```bash
git status --short
git diff --stat
git add README.md projects/README.md codex-task-handoff-skill
git diff --cached --check
git diff --cached --name-only
```

Confirm neither `AGENTS.md` nor `docs/SKILLS_WORKFLOW.md` is staged and `site/index.html` is absent from the cached diff.

- [ ] **Step 5: Commit any final reviewed changes and push**

If review fixes produced unstaged intended changes, commit them with:

```bash
git commit -m "fix: harden codex task handoff skill"
```

Then run:

```bash
git push origin main
```

- [ ] **Step 6: Verify publication**

Confirm remote `main` matches local HEAD, fetch the published README content, and provide:

```text
https://github.com/jiaxuan-tao/vibe-coding-lab/tree/main/codex-task-handoff-skill
https://github.com/jiaxuan-tao/vibe-coding-lab/blob/main/codex-task-handoff-skill/README.md
https://github.com/jiaxuan-tao/vibe-coding-lab/blob/main/codex-task-handoff-skill/SKILL.md
```

End with the commit hash, test totals, review result, and confirmation that the site showcase stayed unchanged.
