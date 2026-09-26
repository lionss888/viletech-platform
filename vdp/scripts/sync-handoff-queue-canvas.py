#!/usr/bin/env python3
"""Rebuild handoff-queue.canvas.tsx from queue.json + plan frontmatter todos.

Canvas cannot read the filesystem at runtime (cursor/canvas only). Statuses are
derived here and embedded. Run after closing a plan in the handoff queue.

Usage (from repo root or vdp/):
  python3 vdp/scripts/sync-handoff-queue-canvas.py
  make -C vdp sync-handoff-queue
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path
from typing import Any

CLOSED = frozenset({"completed", "cancelled"})
STATUS_RE = re.compile(r"^\s+status:\s*(\w+)\s*$")
TODO_ID_RE = re.compile(r"^\s+-\s+id:\s*")


def find_repo_root(start: Path) -> Path:
    cur = start.resolve()
    for candidate in [cur, *cur.parents]:
        if (candidate / ".cursor" / "handoff").is_dir() and (candidate / "vdp").is_dir():
            return candidate
    raise SystemExit(f"repo root not found from {start}")


def parse_frontmatter_todo_statuses(plan_text: str) -> list[str]:
    if not plan_text.startswith("---"):
        return []
    end = plan_text.find("\n---", 3)
    if end < 0:
        return []
    front = plan_text[3:end]
    statuses: list[str] = []
    in_todos = False
    for line in front.splitlines():
        if not in_todos:
            if line.strip() == "todos:" or line.startswith("todos:"):
                in_todos = True
            continue
        if line and not line[0].isspace() and not line.startswith("#"):
            break
        if TODO_ID_RE.match(line):
            continue
        match = STATUS_RE.match(line)
        if match:
            statuses.append(match.group(1).lower())
    return statuses


def plan_is_done(repo: Path, plan_path: str) -> bool:
    path = repo / plan_path
    if not path.is_file():
        return False
    statuses = parse_frontmatter_todo_statuses(path.read_text(encoding="utf-8"))
    if not statuses:
        return False
    return all(status in CLOSED for status in statuses)


def item_is_done(repo: Path, item: dict[str, Any]) -> bool:
    plans = item.get("plans") or []
    if not plans:
        return False
    return all(plan_is_done(repo, plan["path"]) for plan in plans)


def resolve_statuses(repo: Path, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    next_assigned = False
    for item in items:
        done = item_is_done(repo, item)
        lane = item.get("lane", "daily")
        if lane == "later":
            status = "done" if done else "later"
        elif done:
            status = "done"
        elif not next_assigned:
            status = "next"
            next_assigned = True
        else:
            status = "queued"
        rows.append({**item, "status": status, "done": done})
    return rows


def js_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def render_queue_const(rows: list[dict[str, Any]]) -> str:
    chunks: list[str] = ["const QUEUE: QueueRow[] = ["]
    for row in rows:
        plans_js: list[str] = []
        for plan in row["plans"]:
            plans_js.append(
                "{\n"
                f'        label: {js_string(plan["label"])},\n'
                f'        path: {js_string(plan["path"])},\n'
                "      }"
            )
        plans_block = ",\n      ".join(plans_js)
        chunks.append(
            "  {\n"
            f'    order: {js_string(str(row["order"]))},\n'
            f'    item: {js_string(row["title"])},\n'
            "    plans: [\n"
            f"      {plans_block}\n"
            "    ],\n"
            f'    status: {js_string(row["status"])},\n'
            f'    note: {js_string(row["note"])},\n'
            "  },"
        )
    chunks.append("];")
    return "\n".join(chunks)


def next_row(rows: list[dict[str, Any]]) -> dict[str, Any] | None:
    for row in rows:
        if row["status"] == "next":
            return row
    return None


def next_short_label(rows: list[dict[str, Any]]) -> str:
    row = next_row(rows)
    if row is None:
        return "—"
    title = row["title"]
    if " — " in title:
        return title.split(" — ", 1)[0]
    return title


def done_stats(rows: list[dict[str, Any]]) -> list[tuple[str, str]]:
    """Pick up to two recent daily done items for Stat strip."""
    daily_done = [row for row in rows if row["lane"] == "daily" and row["status"] == "done"]
    picks = daily_done[-2:] if len(daily_done) >= 2 else daily_done
    out: list[tuple[str, str]] = []
    for row in picks:
        short = row["title"]
        if " — " in short:
            left, right = short.split(" — ", 1)
            short = f"{left} {right[:24]}"
        out.append(("done", short[:40]))
    return out


def render_canvas(manifest: dict[str, Any], rows: list[dict[str, Any]], synced: str) -> str:
    handoff_dir = manifest["handoff_dir"]
    chat_id = manifest.get("chat_id", "")
    lean = manifest.get("lean_master", ".cursor/plans/api_contract_lean_master.plan.md")
    queue_const = render_queue_const(rows)
    nxt_short = next_short_label(rows)
    nxt_full = (next_row(rows) or {}).get("title") or "очередь пуста (daily)"
    stats = done_stats(rows)
    while len(stats) < 2:
        stats.append(("—", "—"))
    return f'''import {{
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  H1,
  H2,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
  useCanvasAction,
  useHostTheme,
}} from "cursor/canvas";

type QueueStatus = "done" | "next" | "queued" | "later";

type PlanRef = {{
  label: string;
  /** Workspace-relative path under viletech-platform */
  path: string;
}};

type QueueRow = {{
  order: string;
  item: string;
  plans: PlanRef[];
  status: QueueStatus;
  note: string;
}};

// Generated by vdp/scripts/sync-handoff-queue-canvas.py — do not edit statuses by hand.
// Source: {handoff_dir}/queue.json + plan frontmatter todos. Synced: {synced}.

{queue_const}

function PlanOpenButtons({{ plans }}: {{ plans: PlanRef[] }}) {{
  const dispatch = useCanvasAction();
  return (
    <Stack gap={{4}}>
      {{plans.map((plan) => (
        <Button
          key={{plan.path}}
          variant="ghost"
          onClick={{() => dispatch({{ type: "openFile", path: plan.path }})}}
        >
          {{plan.label}}
        </Button>
      ))}}
    </Stack>
  );
}}

function statusTone(
  status: QueueStatus,
): "neutral" | "info" | "success" | "warning" {{
  switch (status) {{
    case "done":
      return "success";
    case "next":
      return "info";
    case "queued":
      return "neutral";
    case "later":
      return "warning";
  }}
}}

function statusLabel(status: QueueStatus): string {{
  switch (status) {{
    case "done":
      return "done";
    case "next":
      return "next";
    case "queued":
      return "queued";
    case "later":
      return "later";
  }}
}}

export default function HandoffQueue() {{
  const theme = useHostTheme();
  const dispatch = useCanvasAction();

  return (
    <Stack gap={{20}} style={{{{ padding: 20, maxWidth: 960 }}}}>
      <Stack gap={{6}}>
        <H1>Handoff: очередь</H1>
        <Text tone="secondary" size="small">
          Источник: {handoff_dir} · chat {chat_id} · sync {synced}
        </Text>
      </Stack>

      <Callout tone="info">
        Статусы из frontmatter todos планов (completed/cancelled = done). После
        закрытия плана: make -C vdp sync-handoff-queue. Next: {nxt_full}.
      </Callout>

      <Row gap={{12}} wrap>
        <Stat value={{{js_string(stats[0][0])}}} label={{{js_string(stats[0][1])}}} tone="success" />
        <Stat value={{{js_string(stats[1][0])}}} label={{{js_string(stats[1][1])}}} tone="success" />
        <Stat value={{{js_string(nxt_short)}}} label="Next implement" tone="info" />
      </Row>

      <Card>
        <CardHeader
          trailing={{
            <Button
              variant="ghost"
              onClick={{() =>
                dispatch({{
                  type: "openFile",
                  path: {js_string(lean)},
                }})
              }}
            >
              lean master Stage A
            </Button>
          }}
        >
          Ежедневная очередь
        </CardHeader>
        <CardBody style={{{{ padding: 0 }}}}>
          <Table
            headers={{["#", "Работа", "План", "Статус", "Заметка"]}}
            rows={{QUEUE.map((row) => [
              row.order,
              row.item,
              <PlanOpenButtons key={{row.item}} plans={{row.plans}} />,
              <Pill key={{`${{row.item}}-status`}} tone={{statusTone(row.status)}} size="sm">
                {{statusLabel(row.status)}}
              </Pill>,
              row.note,
            ])}}
            rowTone={{QUEUE.map((row) =>
              row.status === "next" ? "info" : undefined,
            )}}
          />
        </CardBody>
      </Card>

      <Divider />

      <Stack gap={{8}}>
        <H2>Файлы handoff</H2>
        <Text style={{{{ color: theme.text.secondary }}}}>
          README и queue.json в репо; canvas обновляется скриптом sync.
        </Text>
        <Stack gap={{4}}>
          <Button
            variant="ghost"
            onClick={{() =>
              dispatch({{
                type: "openFile",
                path: {js_string(f"{handoff_dir}/README.md")},
              }})
            }}
          >
            handoff README
          </Button>
          <Button
            variant="ghost"
            onClick={{() =>
              dispatch({{
                type: "openFile",
                path: {js_string(f"{handoff_dir}/queue.json")},
              }})
            }}
          >
            queue.json
          </Button>
          <Button
            variant="ghost"
            onClick={{() =>
              dispatch({{
                type: "openFile",
                path: ".cursor/plans/live_backlog_after_status_sync.plan.md",
              }})
            }}
          >
            live_backlog_after_status_sync
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}}
'''


def find_canvas_outputs(repo: Path) -> list[Path]:
    projects = Path.home() / ".cursor" / "projects"
    found: list[Path] = []
    if projects.is_dir():
        for path in projects.glob("*/canvases/handoff-queue.canvas.tsx"):
            found.append(path)
        # Prefer creating under projects that already host this workspace's canvases.
        if not found:
            for slug in (
                "Users-levpogosov-Documents-viletech-platform",
                "Users-levpogosov-Documents-платформа-viletech-platform",
            ):
                canvases = projects / slug / "canvases"
                if canvases.is_dir():
                    found.append(canvases / "handoff-queue.canvas.tsx")
    # Always keep a repo-side copy for transfer / review.
    found.append(repo / ".cursor" / "handoff" / "очередь-компромисс-2026-09-26" / "handoff-queue.canvas.tsx")
    # Deduplicate while preserving order.
    uniq: list[Path] = []
    seen: set[Path] = set()
    for path in found:
        key = path.resolve() if path.exists() else path
        if key in seen:
            continue
        seen.add(key)
        uniq.append(path)
    return uniq


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=None,
        help="viletech-platform root (default: detect from script location)",
    )
    parser.add_argument(
        "--print",
        action="store_true",
        help="print resolved statuses and exit without writing",
    )
    args = parser.parse_args()
    repo = args.repo_root or find_repo_root(Path(__file__).resolve().parent)
    queue_path = repo / ".cursor" / "handoff" / "очередь-компромисс-2026-09-26" / "queue.json"
    if not queue_path.is_file():
        raise SystemExit(f"missing {queue_path}")
    manifest = json.loads(queue_path.read_text(encoding="utf-8"))
    rows = resolve_statuses(repo, list(manifest["items"]))
    if args.print:
        for row in rows:
            print(f'{row["status"]:6}  {row["id"]:12}  {row["title"]}')
        return 0
    synced = date.today().isoformat()
    content = render_canvas(manifest, rows, synced)
    outputs = find_canvas_outputs(repo)
    if not outputs:
        raise SystemExit("no canvas output paths found")
    for out in outputs:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(content, encoding="utf-8")
        print(f"wrote {out}")
    next_row = next((row for row in rows if row["status"] == "next"), None)
    if next_row:
        print(f"next: {next_row['title']}")
    else:
        print("next: (none)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
