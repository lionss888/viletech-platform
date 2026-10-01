---
name: Verify treasurer queue skip
overview: "Verify #10: при process-roles treasurer skip после reload в «очередь у / действует» нет «Казначей». Без нового кода, если фильтр уже работает."
todos:
  - id: verify-skip-ui
    content: Проверить process-roles skip + hard reload UI без «Казначей»
    status: pending
  - id: verify-close
    content: Зафиксировать pass/fail в плане и закрыть
    status: pending
isProject: false
---

# Verify #10 — очередь без «Казначей» при skip

Фильтр уже в [`waitingActorRoles`](vdp/fe/src/lib/api/mappers.ts). Это проверка среды/снимка, не feature-срез.

## Запрос

При выключенном казначее (skip) подсказки «Сейчас действует / очередь у» не называют Казначея.

## Acceptance

Root/admin: process-roles treasurer `enabled: false`, `disable_mode: skip`. Hard reload карточки заявки (роль без CTA) → в текстах очереди нет «Казначей». При `enabled: true` — Казначей снова может появиться.

## Шаги verify

1. Открыть process-roles: убедиться skip (не полагаться на UI после `ci-pr` dual-config restore enabled).
2. Hard reload FE (при необходимости restart `fe`).
3. Карточка в статусе, где раньше светился Казначей → проверить copy.
4. Зафиксировать результат в этом плане (pass/fail). Fail → баг-fix отдельным срезом, не «тихо чинить» в verify без DoD.

## Вне scope

Новый UX copy; D1–D6.

## DoD

- [ ] Snapshot process-roles = skip
- [ ] Reload выполнен
- [ ] Acceptance pass или заведён follow-up
- [ ] Todo completed + status done
