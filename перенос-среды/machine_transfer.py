#!/usr/bin/env python3
"""Export and restore Cursor project state that does not live in git."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from urllib.parse import quote

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
SNAPSHOT_DIR = SCRIPT_DIR / "snapshot"
WORKSPACE_FILE_NAME = "viletech-platform.code-workspace"
SKIP_DIR_NAMES = {".git", "agent-tools", "terminals", "__pycache__", "node_modules"}
SKIP_FILE_SUFFIXES = (".vscdb-shm", ".vscdb-wal")
BLOB_KEY_RE = re.compile(
    rb"(?:composer\.content\.|agentKv:blob:)[0-9a-f]{64}"
)
SECRET_KEY_MARKERS = (
    "secret:",
    "mcpOAuth.secret",
    "mcpOAuth.global",
    "cursorAuth/",
    "superflex.auth",
)


def resolve_cursor_user_dir() -> Path:
    override = os.environ.get("CURSOR_USER_DIR")
    if override:
        return Path(override)
    mac_dir = Path.home() / "Library" / "Application Support" / "Cursor" / "User"
    linux_dir = Path.home() / ".config" / "Cursor" / "User"
    windows_dir = Path.home() / "AppData" / "Roaming" / "Cursor" / "User"
    for candidate in (mac_dir, linux_dir, windows_dir):
        if candidate.exists():
            return candidate
    return mac_dir


def resolve_cursor_projects_dir() -> Path:
    override = os.environ.get("CURSOR_PROJECTS_DIR")
    if override:
        return Path(override)
    return Path.home() / ".cursor" / "projects"


def encode_project_slug(root: Path) -> str:
    posix_path = root.resolve().as_posix()
    trimmed = posix_path[1:] if posix_path.startswith("/") else posix_path
    return trimmed.replace("/", "-").replace(":", "-")


def is_secret_key(key: str) -> bool:
    lowered = key.lower()
    return any(marker.lower() in lowered for marker in SECRET_KEY_MARKERS)


def rewrite_text(text: str, replacements: list[tuple[str, str]]) -> str:
    updated = text
    for old, new in replacements:
        if old and old != new:
            updated = updated.replace(old, new)
    return updated


def build_replacements(old_root: Path, new_root: Path) -> list[tuple[str, str]]:
    old_posix = old_root.resolve().as_posix()
    new_posix = new_root.resolve().as_posix()
    pairs = [
        (old_posix, new_posix),
        (f"file://{old_posix}", f"file://{new_posix}"),
        (quote(old_posix, safe="/"), quote(new_posix, safe="/")),
        (encode_project_slug(old_root), encode_project_slug(new_root)),
    ]
    return [(old, new) for old, new in pairs if old != new]


def rewrite_blob(value: bytes | str, replacements: list[tuple[str, str]]) -> bytes:
    if isinstance(value, bytes):
        try:
            text = value.decode("utf-8")
            return rewrite_text(text, replacements).encode("utf-8")
        except UnicodeDecodeError:
            return value
    return rewrite_text(value, replacements).encode("utf-8")


def is_cursor_running() -> bool:
    for process_name in ("Cursor", "cursor"):
        result = subprocess.run(
            ["pgrep", "-x", process_name],
            check=False,
            capture_output=True,
        )
        if result.returncode == 0:
            return True
    return False


def copy_tree(source: Path, destination: Path) -> None:
    if destination.exists():
        shutil.rmtree(destination)
    destination.mkdir(parents=True, exist_ok=True)
    if not source.exists():
        return
    for current, dir_names, file_names in os.walk(source):
        dir_names[:] = [name for name in dir_names if name not in SKIP_DIR_NAMES]
        relative = Path(current).relative_to(source)
        target_dir = destination / relative
        target_dir.mkdir(parents=True, exist_ok=True)
        for file_name in file_names:
            if file_name.endswith(SKIP_FILE_SUFFIXES):
                continue
            shutil.copy2(Path(current) / file_name, target_dir / file_name)


def backup_sqlite(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        destination.unlink()
    source_conn = sqlite3.connect(f"file:{source}?mode=ro", uri=True)
    dest_conn = sqlite3.connect(destination)
    try:
        source_conn.backup(dest_conn)
    finally:
        dest_conn.close()
        source_conn.close()


def find_workspace_storages(user_dir: Path, repo_root: Path) -> dict[str, Path]:
    storage_root = user_dir / "workspaceStorage"
    found: dict[str, Path] = {}
    if not storage_root.exists():
        return found
    workspace_uri = f"file://{repo_root.resolve().as_posix()}/{WORKSPACE_FILE_NAME}"
    folder_uri = f"file://{repo_root.resolve().as_posix()}"
    for child in storage_root.iterdir():
        meta_path = child / "workspace.json"
        if not meta_path.is_file():
            continue
        payload = meta_path.read_text(encoding="utf-8")
        if workspace_uri in payload or payload.rstrip().endswith(f"{WORKSPACE_FILE_NAME}\""):
            found["code-workspace"] = child
        elif folder_uri in payload and WORKSPACE_FILE_NAME not in payload:
            found["folder"] = child
    return found


def list_composer_ids(conn: sqlite3.Connection, workspace_ids: Iterable[str]) -> list[str]:
    ids: list[str] = []
    workspace_list = list(workspace_ids)
    if not workspace_list:
        return ids
    placeholders = ",".join("?" for _ in workspace_list)
    rows = conn.execute(
        f"SELECT composerId FROM composerHeaders WHERE workspaceId IN ({placeholders})",
        workspace_list,
    ).fetchall()
    for (composer_id,) in rows:
        ids.append(str(composer_id))
    return ids


def keys_matching_composers(keys: Iterable[str], composer_ids: Iterable[str]) -> list[str]:
    id_list = list(composer_ids)
    matched: list[str] = []
    for key in keys:
        if any(composer_id in key for composer_id in id_list):
            matched.append(key)
    return matched


def collect_blob_refs(values: Iterable[bytes | str]) -> set[str]:
    refs: set[str] = set()
    for value in values:
        blob = value if isinstance(value, bytes) else value.encode("utf-8", "surrogateescape")
        for match in BLOB_KEY_RE.findall(blob):
            refs.add(match.decode("ascii"))
    return refs


def fetch_kv_rows(
    conn: sqlite3.Connection,
    keys: list[str],
    batch_size: int = 400,
) -> list[tuple[str, bytes]]:
    rows: list[tuple[str, bytes]] = []
    for offset in range(0, len(keys), batch_size):
        chunk = keys[offset : offset + batch_size]
        placeholders = ",".join("?" for _ in chunk)
        rows.extend(
            conn.execute(
                f"SELECT key, value FROM cursorDiskKV WHERE key IN ({placeholders})",
                chunk,
            ).fetchall()
        )
    return rows


def export_chat_snapshot(
    global_db: Path,
    workspace_ids: list[str],
    output_db: Path,
) -> dict[str, int]:
    source = sqlite3.connect(f"file:{global_db}?mode=ro", uri=True)
    if output_db.exists():
        output_db.unlink()
    output_db.parent.mkdir(parents=True, exist_ok=True)
    dest = sqlite3.connect(output_db)
    try:
        dest.execute(
            """
            CREATE TABLE composerHeaders (
                composerId TEXT PRIMARY KEY,
                workspaceId TEXT,
                createdAt INTEGER,
                lastUpdatedAt INTEGER,
                isArchived INTEGER,
                isSubagent INTEGER,
                recency INTEGER,
                checkpointAt INTEGER,
                value BLOB
            )
            """
        )
        dest.execute("CREATE TABLE cursorDiskKV (key TEXT PRIMARY KEY, value BLOB)")
        workspace_list = workspace_ids
        placeholders = ",".join("?" for _ in workspace_list) if workspace_list else ""
        headers = []
        if workspace_list:
            headers = source.execute(
                f"""
                SELECT composerId, workspaceId, createdAt, lastUpdatedAt, isArchived,
                       isSubagent, recency, checkpointAt, value
                FROM composerHeaders
                WHERE workspaceId IN ({placeholders})
                """,
                workspace_list,
            ).fetchall()
        dest.executemany(
            """
            INSERT INTO composerHeaders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            headers,
        )
        composer_ids = [str(row[0]) for row in headers]
        all_keys = [row[0] for row in source.execute("SELECT key FROM cursorDiskKV")]
        selected_keys = keys_matching_composers(all_keys, composer_ids)
        selected = set(selected_keys)
        kv_rows = fetch_kv_rows(source, selected_keys)
        pending_refs = collect_blob_refs(value for _, value in kv_rows)
        pending_refs.update(collect_blob_refs(row[8] for row in headers if row[8] is not None))
        pending_refs -= selected
        while pending_refs:
            batch = [key for key in pending_refs if key not in selected]
            pending_refs.clear()
            extra_rows = fetch_kv_rows(source, batch)
            for key, value in extra_rows:
                if key in selected:
                    continue
                selected.add(key)
                kv_rows.append((key, value))
                pending_refs.update(collect_blob_refs([value]) - selected)
        dest.executemany("INSERT INTO cursorDiskKV VALUES (?, ?)", kv_rows)
        dest.commit()
        return {
            "composerHeaders": len(headers),
            "cursorDiskKV": len(kv_rows),
        }
    finally:
        dest.close()
        source.close()


def merge_chat_snapshot(
    snapshot_db: Path,
    global_db: Path,
    replacements: list[tuple[str, str]],
    workspace_id_map: dict[str, str],
) -> None:
    source = sqlite3.connect(f"file:{snapshot_db}?mode=ro", uri=True)
    dest = sqlite3.connect(global_db)
    try:
        dest.execute(
            """
            CREATE TABLE IF NOT EXISTS composerHeaders (
                composerId TEXT PRIMARY KEY,
                workspaceId TEXT,
                createdAt INTEGER,
                lastUpdatedAt INTEGER,
                isArchived INTEGER,
                isSubagent INTEGER,
                recency INTEGER,
                checkpointAt INTEGER,
                value BLOB
            )
            """
        )
        dest.execute(
            "CREATE TABLE IF NOT EXISTS cursorDiskKV (key TEXT PRIMARY KEY, value BLOB)"
        )
        for row in source.execute("SELECT * FROM composerHeaders"):
            composer_id, workspace_id, *rest, value = row
            mapped_workspace = workspace_id_map.get(str(workspace_id), str(workspace_id))
            rewritten_value = rewrite_blob(value or b"", replacements)
            rewritten_value = rewrite_blob(
                rewritten_value,
                [(str(workspace_id), mapped_workspace)],
            )
            dest.execute(
                """
                INSERT OR REPLACE INTO composerHeaders
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (composer_id, mapped_workspace, *rest, rewritten_value),
            )
        for key, value in source.execute("SELECT key, value FROM cursorDiskKV"):
            new_key = rewrite_text(str(key), replacements)
            for old_id, new_id in workspace_id_map.items():
                new_key = new_key.replace(old_id, new_id)
            new_value = rewrite_blob(value or b"", replacements)
            for old_id, new_id in workspace_id_map.items():
                new_value = rewrite_blob(new_value, [(old_id, new_id)])
            dest.execute(
                "INSERT OR REPLACE INTO cursorDiskKV VALUES (?, ?)",
                (new_key, new_value),
            )
        dest.commit()
    finally:
        dest.close()
        source.close()


def export_extensions(extensions_dir: Path, output_file: Path) -> int:
    names: list[str] = []
    if extensions_dir.exists():
        for child in sorted(extensions_dir.iterdir()):
            if child.is_dir() and child.name not in {".obsolete"}:
                names.append(child.name)
    output_file.write_text("\n".join(names) + ("\n" if names else ""), encoding="utf-8")
    return len(names)


def cmd_export() -> int:
    user_dir = resolve_cursor_user_dir()
    projects_dir = resolve_cursor_projects_dir()
    snapshot = SNAPSHOT_DIR
    if snapshot.exists():
        shutil.rmtree(snapshot)
    snapshot.mkdir(parents=True)
    storages = find_workspace_storages(user_dir, REPO_ROOT)
    workspace_ids = {kind: path.name for kind, path in storages.items()}
    storage_out = snapshot / "workspaceStorage"
    for kind, path in storages.items():
        target = storage_out / kind
        copy_tree(path, target)
        db_path = path / "state.vscdb"
        if db_path.exists():
            backup_sqlite(db_path, target / "state.vscdb")
    project_slug = encode_project_slug(REPO_ROOT)
    local_project = projects_dir / project_slug
    copy_tree(local_project / "agent-transcripts", snapshot / "agent-transcripts")
    copy_tree(local_project / "canvases", snapshot / "canvases")
    copy_tree(local_project / "assets", snapshot / "assets")
    settings_src = user_dir / "settings.json"
    keybindings_src = user_dir / "keybindings.json"
    user_out = snapshot / "user"
    user_out.mkdir(parents=True, exist_ok=True)
    if settings_src.exists():
        shutil.copy2(settings_src, user_out / "settings.json")
    if keybindings_src.exists():
        shutil.copy2(keybindings_src, user_out / "keybindings.json")
    snippets_src = user_dir / "snippets"
    if snippets_src.exists():
        copy_tree(snippets_src, user_out / "snippets")
    extension_count = export_extensions(
        Path.home() / ".cursor" / "extensions",
        snapshot / "extensions.txt",
    )
    global_db = user_dir / "globalStorage" / "state.vscdb"
    chat_counts = {"composerHeaders": 0, "cursorDiskKV": 0}
    if global_db.exists() and workspace_ids:
        chat_counts = export_chat_snapshot(
            global_db,
            list(workspace_ids.values()),
            snapshot / "chats.sqlite",
        )
    manifest = {
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "sourceRoot": str(REPO_ROOT),
        "workspaceFile": str(REPO_ROOT / WORKSPACE_FILE_NAME),
        "workspaceIds": workspace_ids,
        "projectSlug": project_slug,
        "chatCounts": chat_counts,
        "extensionCount": extension_count,
    }
    (snapshot / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Exported to {snapshot}")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 0


def merge_json_file(source: Path, destination: Path) -> None:
    incoming = json.loads(source.read_text(encoding="utf-8"))
    existing: dict = {}
    if destination.exists():
        existing = json.loads(destination.read_text(encoding="utf-8"))
    if not isinstance(existing, dict) or not isinstance(incoming, dict):
        shutil.copy2(source, destination)
        return
    existing.update(incoming)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        json.dumps(existing, ensure_ascii=False, indent=4) + "\n",
        encoding="utf-8",
    )


def cmd_import() -> int:
    snapshot = SNAPSHOT_DIR
    manifest_path = snapshot / "manifest.json"
    if not manifest_path.exists():
        print("Snapshot is missing. Run ./собрать.sh on the source machine first.", file=sys.stderr)
        return 1
    if is_cursor_running():
        print("Quit Cursor completely, then run ./развернуть.sh again.", file=sys.stderr)
        return 1
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    old_root = Path(manifest["sourceRoot"])
    replacements = build_replacements(old_root, REPO_ROOT)
    user_dir = resolve_cursor_user_dir()
    projects_dir = resolve_cursor_projects_dir()
    storages = find_workspace_storages(user_dir, REPO_ROOT)
    if "code-workspace" not in storages:
        print(
            "Open viletech-platform.code-workspace in Cursor once, quit Cursor, then run this again.",
            file=sys.stderr,
        )
        return 1
    workspace_id_map: dict[str, str] = {}
    old_ids: dict[str, str] = manifest.get("workspaceIds", {})
    for kind, old_id in old_ids.items():
        if kind in storages:
            workspace_id_map[old_id] = storages[kind].name
    storage_snapshot = snapshot / "workspaceStorage"
    if storage_snapshot.exists():
        for kind_dir in storage_snapshot.iterdir():
            if not kind_dir.is_dir() or kind_dir.name not in storages:
                continue
            target = storages[kind_dir.name]
            backup = target.parent / f"{target.name}.bak-before-import"
            if backup.exists():
                shutil.rmtree(backup)
            shutil.copytree(target, backup)
            copy_tree(kind_dir, target)
            source_db = kind_dir / "state.vscdb"
            if source_db.exists():
                shutil.copy2(source_db, target / "state.vscdb")
            meta_path = target / "workspace.json"
            if meta_path.exists():
                meta_path.write_text(
                    rewrite_text(meta_path.read_text(encoding="utf-8"), replacements),
                    encoding="utf-8",
                )
    chats_db = snapshot / "chats.sqlite"
    global_db = user_dir / "globalStorage" / "state.vscdb"
    if chats_db.exists():
        global_db.parent.mkdir(parents=True, exist_ok=True)
        merge_chat_snapshot(chats_db, global_db, replacements, workspace_id_map)
    new_slug = encode_project_slug(REPO_ROOT)
    local_project = projects_dir / new_slug
    local_project.mkdir(parents=True, exist_ok=True)
    copy_tree(snapshot / "agent-transcripts", local_project / "agent-transcripts")
    copy_tree(snapshot / "canvases", local_project / "canvases")
    copy_tree(snapshot / "assets", local_project / "assets")
    user_out = snapshot / "user"
    if (user_out / "settings.json").exists():
        merge_json_file(user_out / "settings.json", user_dir / "settings.json")
    if (user_out / "keybindings.json").exists():
        target = user_dir / "keybindings.json"
        if target.exists():
            shutil.copy2(target, target.with_suffix(".json.bak-before-import"))
        shutil.copy2(user_out / "keybindings.json", target)
    if (user_out / "snippets").exists():
        copy_tree(user_out / "snippets", user_dir / "snippets")
    print("Import finished. Open Cursor and the .code-workspace file.")
    print(f"Workspace map: {workspace_id_map}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("export", "import"))
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.command == "export":
        return cmd_export()
    return cmd_import()


if __name__ == "__main__":
    sys.exit(main())
