---
name: UX V Verify gate
overview: "Перепроверка C1–C5 и локальная сборка/тесты fe+core."
todos:
  - id: v-run
    content: go test formpayment + fe vitest targeted + build check
    status: pending
isProject: false
---

# V — Verify gate

## DoD
- [ ] C1–C5 ручная/авто сверка
- [ ] `go test` formpayment zones
- [ ] `npm test` / vitest targeted
- [ ] FE typecheck/build без ошибок в изменённых модулях
---
