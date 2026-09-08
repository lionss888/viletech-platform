#!/usr/bin/env python3
"""Sanitize management Telegram texts: strip tool/IDE/stack brand names and secrets."""

from __future__ import annotations

import argparse
import re
import sys
import unittest

# Word-boundary brands and tooling names (case-insensitive).
_BRAND_RE = re.compile(
    r"\b("
    r"cursor(?:\s*ide)?|ollama|vitest|playwright|jest|pytest|"
    r"golang|nodejs|typescript|nestjs?|mongo(?:db)?|postgres(?:ql)?|"
    r"docker(?:\s*compose)?|kubernetes|k8s|gitlab|github|"
    r"lovable|openai|anthropic|claude|chatgpt|"
    r"botfather|launchd|systemd"
    r")\b",
    re.IGNORECASE,
)

_REPLACEMENTS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bgo\s+test\b", re.I), "unit-проверки"),
    (re.compile(r"\b(?:vitest\+|)?go\+(?:playwright)?\b", re.I), "проверки"),
    (re.compile(r"\bgo\+[a-z]+\b", re.I), "проверки"),
    (re.compile(r"\bnpm\s+(?:test|ci|install)\b", re.I), "проверки фронта"),
    (re.compile(r"\bmake\s+[\w.-]+\b", re.I), "сборочная команда"),
    (re.compile(r"\bnest\s*→\s*parity\b", re.I), "legacy→домен"),
    (re.compile(r"\bnest\s*->\s*parity\b", re.I), "legacy→домен"),
    (re.compile(r"\bparity\s+rename\b", re.I), "переименование адаптера"),
    (re.compile(r"(?:^|\s)\.?cursor/plans/[^\s]+", re.I), " план работ"),
    (re.compile(r"~/?\.vdp-(?:intake|uptime|standup)\b[^\s]*", re.I), "локальный конфиг"),
    (re.compile(r"https?://localhost(?::\d+)?(?:/\S*)?", re.I), "локальная среда"),
    (re.compile(r"\blocalhost:\d+\b", re.I), "локальная среда"),
    (re.compile(r"\b(?:manager|user|admin|provider)@[a-z0-9.-]+\s*/\s*\S+", re.I), "[учётка скрыта]"),
    (re.compile(r"\b[A-Z0-9_]*(?:TOKEN|PASSWORD|SECRET|API_KEY)=?\S*", re.I), "[секрет]"),
    (re.compile(r"\bplan:\s*[a-z0-9_]{8,}\b", re.I), "план работ"),
    (re.compile(r"\b[a-z]+_[a-z0-9]+_[a-f0-9]{8}\b", re.I), "план работ"),
    (re.compile(r"`[^`]+`"), ""),
]


def sanitize(text: str) -> str:
    """Return management-safe text. Empty input stays empty."""
    out = text.replace("\r\n", "\n")
    for pattern, repl in _REPLACEMENTS:
        out = pattern.sub(repl, out)
    out = _BRAND_RE.sub("", out)
    out = re.sub(r"[ \t]{2,}", " ", out)
    out = re.sub(r" *\n *", "\n", out)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()


def banned_hits(text: str) -> list[str]:
    """Return leftover banned tokens after sanitize (should be empty)."""
    clean = sanitize(text)
    hits = sorted({m.group(0).lower() for m in _BRAND_RE.finditer(clean)})
    if re.search(r"localhost", clean, re.I):
        hits.append("localhost")
    if re.search(r"\.cursor/", clean, re.I):
        hits.append(".cursor/")
    return hits


class SanitizeTests(unittest.TestCase):
    def test_strips_brands_and_paths(self) -> None:
        raw = (
            "✅ План API Core UX fixes. vitest+Go+Playwright gate.\n"
            "Plan: api_core_ux_fixes_8eee86cb\n"
            ".cursor/plans/nest_to_parity_rename_36a204c3.plan.md\n"
            "http://localhost:5173 manager@vdp.local / manager\n"
            "Nest→parity rename; ollama; Cursor IDE"
        )
        got = sanitize(raw)
        self.assertNotIn("vitest", got.lower())
        self.assertNotIn("playwright", got.lower())
        self.assertNotIn("localhost", got.lower())
        self.assertNotIn(".cursor/", got.lower())
        self.assertNotIn("ollama", got.lower())
        self.assertNotIn("cursor", got.lower())
        self.assertNotIn("manager@vdp.local", got.lower())
        self.assertIn("legacy→домен", got)
        self.assertEqual(banned_hits(raw), [])

    def test_preserve_product_language(self) -> None:
        raw = "✅ Готово · UX кабинетов\nПриёмка: пройдена\nСреда: alpha"
        self.assertEqual(sanitize(raw), raw)

    def test_empty(self) -> None:
        self.assertEqual(sanitize(""), "")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="exit 1 if banned tokens remain")
    parser.add_argument("text", nargs="?", help="text to sanitize; stdin if omitted")
    args = parser.parse_args(argv)
    raw = args.text if args.text is not None else sys.stdin.read()
    clean = sanitize(raw)
    if args.check:
        hits = banned_hits(raw)
        if hits:
            print("banned leftover: " + ", ".join(hits), file=sys.stderr)
            return 1
    sys.stdout.write(clean)
    if clean and not clean.endswith("\n"):
        sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--self-test":
        unittest.main(argv=[sys.argv[0]] + sys.argv[2:])
    else:
        raise SystemExit(main(sys.argv[1:]))
