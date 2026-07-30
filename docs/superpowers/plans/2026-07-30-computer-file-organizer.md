# Computer File Organizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a zero-dependency Codex Skill that safely organizes one explicitly selected folder through a read-only plan, confirmed execution, and reversible manifest.

**Architecture:** Keep operating rules and approval boundaries in a concise `SKILL.md`. Use one Python standard-library CLI with `plan`, `apply`, and `undo` subcommands so filesystem changes are deterministic, validated, conflict-safe, and testable. Protect behavior with temporary-directory `unittest` cases and static documentation contracts.

**Tech Stack:** Markdown, YAML, Python 3 standard library, `unittest`, Git.

## Global Constraints

- Create `computer-file-organizer-skill/` as a top-level folder in the existing repository.
- Only operate on one explicit directory; reject the filesystem root and the user home directory.
- `plan` is read-only; `apply` requires `--confirm`; no command deletes files.
- Ignore hidden files, symlinks, directories, and unknown extensions by default.
- Do not overwrite destination files or occupied undo paths.
- Record every successful move in a JSON manifest and support reverse-order undo.
- Do not require remote APIs, credentials, paid services, databases, daemons, or third-party Python packages.
- Keep Skills out of `site/index.html`; update the repository README and `projects/README.md`.
- Preserve unrelated changes in `AGENTS.md` and `docs/SKILLS_WORKFLOW.md`.

---

### Task 1: Baseline, Skill Contract, and Scaffold

**Files:**
- Create: `computer-file-organizer-skill/tests/baseline-evaluation.md`
- Create: `computer-file-organizer-skill/tests/test_skill_structure.py`
- Create: `computer-file-organizer-skill/SKILL.md`
- Create: `computer-file-organizer-skill/agents/openai.yaml`

**Interfaces:**
- Consumes: the approved design specification.
- Produces: a valid Skill folder with frontmatter name `computer-file-organizer`.

- [ ] Record the no-Skill baseline prompt and verbatim output.
- [ ] Write a failing structure test for trigger terms, safety gates, required resources, and metadata.
- [ ] Run the focused test and confirm it fails because the Skill does not exist.
- [ ] Run the official `init_skill.py`, rename the generated directory to `computer-file-organizer-skill`, and replace placeholders.
- [ ] Run the structure test and confirm it passes.

### Task 2: Read-only Planning

**Files:**
- Create: `computer-file-organizer-skill/tests/test_organize_files.py`
- Create: `computer-file-organizer-skill/scripts/organize_files.py`

**Interfaces:**
- `build_plan(root: Path, recursive: bool, include_duplicates: bool) -> dict[str, object]`
- `write_plan(plan: dict[str, object], destination: Path) -> None`
- CLI: `plan TARGET --output PLAN [--recursive] [--include-duplicates]`

- [ ] Write failing tests for extension classification, unknown files, hidden files, symlinks, recursive scope, path rejection, duplicate groups, and read-only behavior.
- [ ] Run the focused tests and confirm expected failures.
- [ ] Implement safe scanning, classification, collision-free destinations, size-first SHA-256 duplicate detection, and JSON plan output.
- [ ] Run all planning tests and confirm they pass.

### Task 3: Confirmed Apply and Reversible Undo

**Files:**
- Modify: `computer-file-organizer-skill/tests/test_organize_files.py`
- Modify: `computer-file-organizer-skill/scripts/organize_files.py`

**Interfaces:**
- `apply_plan(plan_path: Path, confirmed: bool) -> tuple[int, Path | None]`
- `undo_manifest(manifest_path: Path, confirmed: bool) -> int`
- CLI: `apply PLAN --confirm`
- CLI: `undo MANIFEST --confirm`

- [ ] Write failing tests proving apply rejects missing confirmation, stale sources, tampered paths, and destination overwrites.
- [ ] Write failing tests for successful moves, manifest persistence, reverse undo, and occupied original paths.
- [ ] Implement plan validation, state checks, safe moves, partial-failure recording, manifests, and conflict-safe undo.
- [ ] Run the complete script tests and confirm they pass.

### Task 4: Product Documentation and Licensing

**Files:**
- Create: `computer-file-organizer-skill/README.md`
- Create: `computer-file-organizer-skill/UPSTREAM.md`
- Create: `computer-file-organizer-skill/LICENSE.txt`
- Create: `computer-file-organizer-skill/references/file-organization-policy.md`
- Create: `computer-file-organizer-skill/tests/test_documentation.py`
- Create: `computer-file-organizer-skill/tests/trigger-evaluation.md`
- Create: `computer-file-organizer-skill/tests/forward-evaluation.md`
- Modify: `computer-file-organizer-skill/SKILL.md`

**Interfaces:**
- Produces a user-facing explanation, installation instructions, examples, capability boundaries, implementation rationale, source attribution, and executable validation guidance.

- [ ] Write failing documentation and local-link tests.
- [ ] Write the organization policy reference and concise Skill workflow.
- [ ] Write the complete README with product capability and safety design as the main narrative.
- [ ] Record trigger boundaries and forward evaluation on temporary folders.
- [ ] Run documentation tests and confirm they pass.

### Task 5: Repository Integration and Publication

**Files:**
- Create: `computer-file-organizer-skill/tests/test_repository_integration.py`
- Modify: `README.md`
- Modify: `projects/README.md`

**Interfaces:**
- Produces repository index links while keeping `site/index.html` unchanged.

- [ ] Write the failing repository integration test.
- [ ] Add README and project index entries.
- [ ] Run Skill tests, official validation, local-link checks, `git diff --check`, and relevant repository tests.
- [ ] Review the diff and stage only this Skill, its design/plan, and intended index updates.
- [ ] Commit, push `main`, and verify the GitHub directory and README URLs.
