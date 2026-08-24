#!/usr/bin/env python3
"""Tests for Cursor machine-transfer helpers."""

from __future__ import annotations

import sqlite3
import tempfile
import unittest
from pathlib import Path

from machine_transfer import (
    build_replacements,
    collect_blob_refs,
    encode_project_slug,
    export_chat_snapshot,
    is_secret_key,
    keys_matching_composers,
    merge_chat_snapshot,
    rewrite_text,
)


class EncodeProjectSlugTests(unittest.TestCase):
    def test_encodes_posix_path(self) -> None:
        input_path = Path("/Users/levpogosov/Downloads/viletech-platform")
        actual = encode_project_slug(input_path)
        self.assertEqual(actual, "Users-levpogosov-Downloads-viletech-platform")


class RewriteTextTests(unittest.TestCase):
    def test_rewrites_path_and_file_uri(self) -> None:
        old_root = Path("/Users/old/viletech-platform")
        new_root = Path("/Users/new/viletech-platform")
        replacements = build_replacements(old_root, new_root)
        input_text = "file:///Users/old/viletech-platform/README.md"
        actual = rewrite_text(input_text, replacements)
        self.assertEqual(actual, "file:///Users/new/viletech-platform/README.md")


class SecretKeyTests(unittest.TestCase):
    def test_detects_oauth_and_auth_keys(self) -> None:
        self.assertTrue(is_secret_key("mcpOAuth.secret.abc"))
        self.assertTrue(is_secret_key("secret:token"))
        self.assertFalse(is_secret_key("composerData:abc"))


class ComposerKeyTests(unittest.TestCase):
    def test_keeps_only_matching_composer_keys(self) -> None:
        input_keys = [
            "composerData:aaa-111",
            "bubbleId:bbb-222:msg",
            "composerData:other",
        ]
        actual = keys_matching_composers(input_keys, ["aaa-111", "bbb-222"])
        self.assertEqual(actual, ["composerData:aaa-111", "bubbleId:bbb-222:msg"])


class BlobRefTests(unittest.TestCase):
    def test_collects_content_and_agent_blob_keys(self) -> None:
        digest = "a" * 64
        input_value = f"see composer.content.{digest} and agentKv:blob:{digest}"
        actual = collect_blob_refs([input_value])
        self.assertEqual(
            actual,
            {f"composer.content.{digest}", f"agentKv:blob:{digest}"},
        )


class ChatSnapshotRoundTripTests(unittest.TestCase):
    def test_exports_and_imports_only_this_workspace(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            source_db = Path(temp_dir) / "source.sqlite"
            snapshot_db = Path(temp_dir) / "snapshot.sqlite"
            target_db = Path(temp_dir) / "target.sqlite"
            conn = sqlite3.connect(source_db)
            conn.execute(
                """
                CREATE TABLE composerHeaders (
                    composerId TEXT, workspaceId TEXT, createdAt INTEGER,
                    lastUpdatedAt INTEGER, isArchived INTEGER, isSubagent INTEGER,
                    recency INTEGER, checkpointAt INTEGER, value BLOB
                )
                """
            )
            conn.execute("CREATE TABLE cursorDiskKV (key TEXT PRIMARY KEY, value BLOB)")
            conn.execute(
                """
                INSERT INTO composerHeaders VALUES
                ('comp-keep', 'ws-old', 1, 1, 0, 0, 1, 0, '{"path":"/old/root"}'),
                ('comp-skip', 'ws-other', 1, 1, 0, 0, 1, 0, '{}')
                """
            )
            digest = "b" * 64
            blob_key = f"composer.content.{digest}"
            conn.execute(
                "INSERT INTO cursorDiskKV VALUES (?, ?)",
                ("composerData:comp-keep", f'{{"ref":"{blob_key}"}}'),
            )
            conn.execute(
                "INSERT INTO cursorDiskKV VALUES (?, ?)",
                (blob_key, b"payload"),
            )
            conn.execute(
                "INSERT INTO cursorDiskKV VALUES (?, ?)",
                ("composerData:comp-skip", b"nope"),
            )
            conn.commit()
            conn.close()
            counts = export_chat_snapshot(source_db, ["ws-old"], snapshot_db)
            self.assertEqual(counts["composerHeaders"], 1)
            self.assertEqual(counts["cursorDiskKV"], 2)
            merge_chat_snapshot(
                snapshot_db,
                target_db,
                [("/old/root", "/new/root")],
                {"ws-old": "ws-new"},
            )
            dest = sqlite3.connect(target_db)
            header = dest.execute(
                "SELECT workspaceId, value FROM composerHeaders"
            ).fetchall()
            self.assertEqual(len(header), 1)
            self.assertEqual(header[0][0], "ws-new")
            self.assertIn("/new/root", header[0][1].decode("utf-8"))
            keys = {
                row[0]
                for row in dest.execute("SELECT key FROM cursorDiskKV")
            }
            self.assertEqual(keys, {"composerData:comp-keep", blob_key})
            dest.close()


if __name__ == "__main__":
    unittest.main()
