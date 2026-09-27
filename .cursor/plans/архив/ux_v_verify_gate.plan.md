---
name: UX V Verify gate
overview: Перепроверка C1–C5 и локальная сборка/тесты fe+core. [status-sync 2026-09-24
  completed] meta verify after C1–C5 sync
todos:
- id: v-run
  content: go test formpayment + fe vitest targeted + build check
  status: completed
isProject: false
---

# V — Verify gate

## DoD
- [x] C1–C5 ручная/авто сверка
- [x] `go test` formpayment zones
- [x] `npm test` / vitest targeted
- [x] FE typecheck/build без ошибок в изменённых модулях
---

> **Status-sync 2026-09-24:** todos/DoD marked completed — code evidence recorded in sync reason. Batch triage archive; do not re-implement.
