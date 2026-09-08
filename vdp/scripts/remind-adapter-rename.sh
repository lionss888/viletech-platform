#!/usr/bin/env bash
# One-day reminders: Fri 2026-09-11 → management TG via notify-mgmt (sanitized).
set -euo pipefail
TARGET_YMD="2026-09-11"
now_ymd="$(date +%Y-%m-%d)"
if [ "$now_ymd" != "$TARGET_YMD" ]; then
  echo "remind-adapter-rename: skip (today=$now_ymd want=$TARGET_YMD)"
  exit 0
fi
NOTIFY="${VDP_NOTIFY_MGMT:-}"
if [ -z "$NOTIFY" ]; then
  for cand in \
    "${HOME}/Downloads/viletech-platform/vdp/scripts/notify-mgmt.sh" \
    "${HOME}/viletech-platform/vdp/scripts/notify-mgmt.sh"; do
    if [ -x "$cand" ]; then NOTIFY="$cand"; break; fi
  done
fi
if [ -z "$NOTIFY" ] || [ ! -x "$NOTIFY" ]; then
  echo "remind-adapter-rename: notify-mgmt.sh not found" >&2
  exit 1
fi
hour="$(date +%H:%M)"
bash "$NOTIFY" \
  --kind schedule \
  --title "Переименование адаптера legacy→домен" \
  --body "Заложить в график планов работ. HTTP-контракт не менять — только имена в ядре." \
  --next "${hour} МСК · пт 11.09 · не начато"
