# AGENTS.md

## MUST: planning vs `.cursor/rules`

Before creating or approving any plan (Plan mode, `.cursor/plans`, roadmaps, DoD):

1. **Strictly** read and cross-check the full set under [`.cursor/rules`](.cursor/rules).
2. Record in the plan: which rules are mandatory, which are out of scope, which gate checks apply.
3. Do not execute a plan that skipped this alignment. See project rules `базовые-правила-инструмента` and `планирование-сверка-с-rules` (`alwaysApply: true`).

## VDP Docker FE rebuild (ask first)

When starting the VDP stack or after branch updates / `vdp/fe` sync: **ask the user** before refreshing Docker FE deps (`make compose-fe-refresh`). Do not run container `npm install` silently. Rule: `.cursor/rules/vdp-fe-docker-пересборка.mdc`.

## Cursor Cloud specific instructions

### What this repository is

`viletech-platform` is a **planning + reference workspace**, not a single deployable
product. Its top-level contents:

- `вводные/`, `заметки/` — requirement and analysis documents (text only, nothing to run).
- `кастомные модули для адаптации и переиспользования/` — **vendored snapshots copied from
  other repositories** for adaptation/reuse. Each subfolder (`AMG-*`, `AMG Flow`,
  `backend-for-ved`, `vili-project`) has a `.source-commit.txt` recording its upstream origin.
  These are reference fragments, **not this repo's product**, and are **not** part of the
  default development setup. Several are incomplete in isolation (e.g. `AMG-Integration-Hub`
  has no entrypoint; `AMG Flow` / `AMG-Banking-Gateway` ship placeholder / missing Go
  `go.sum`). If you ever need to run one, do so **inside that module's own folder** using its
  own `docker-compose.yml` / `Makefile` / start scripts — there is no root orchestration.
- `перенос-среды/` — the only **first-party, runnable** code (see below).

### First-party tool: `перенос-среды` (Cursor environment transfer)

`перенос-среды/machine_transfer.py` snapshots/restores Cursor workspace state (chats, layout,
settings) that does not live in git, so it can move between machines. It is **pure Python 3
standard library** (no third-party packages, nothing to `pip install`). Python 3 from the base
image is sufficient.

- Lint / syntax check: `python3 -m py_compile перенос-среды/machine_transfer.py перенос-среды/test_machine_transfer.py`
- Tests: run from inside the folder — `cd перенос-среды && python3 -m unittest -v test_machine_transfer`
  (the test imports `machine_transfer` by module name, so the working directory must be `перенос-среды/`).
- Run: `./перенос-среды/собрать.sh` (export) and `./перенос-среды/развернуть.sh` (import),
  which wrap `machine_transfer.py export|import`.

### Non-obvious caveats

- **`export` wipes and recreates the committed `перенос-среды/snapshot/` directory.** Do not run
  a real `export` in `/workspace` unless you intend to overwrite that committed snapshot. To test
  safely, run against an isolated copy of the folder and/or point the tool at throwaway dirs with
  the `CURSOR_USER_DIR` and `CURSOR_PROJECTS_DIR` environment variables (both are honored as
  overrides — handy for running without a real Cursor install).
- `import` refuses to run while Cursor is running (`pgrep`) and requires the
  `viletech-platform.code-workspace` to have been opened in Cursor at least once so a
  `workspaceStorage` entry exists to map onto.
- Repo root paths are Cyrillic; always quote them in shell commands.
