---
name: CS-R2 e2e route hint
overview: "Playwright: manager видит manager-route-hint на form detail; чужие роли — нет. Gate: check-env-parity → ci-pr-pilot."
todos:
  - id: r2-spec
    content: "Добавить e2e spec: manager login → form detail → getByTestId manager-route-hint visible"
    status: completed
  - id: r2-negative
    content: "Проверка: user или provider не видят manager-route-hint на своей карточке"
    status: completed
  - id: r2-gate
    content: cd vdp && make check-env-parity && make ci-pr-pilot
    status: completed
isProject: false
---

# CS-R2 — E2E на подсказку маршрута

Родитель: [конструктор_реализация_889c3d6f.plan.md](конструктор_реализация_889c3d6f.plan.md).  
Код подсказки: [CS-R0](cs_r0_manager_hint.plan.md) (`data-testid="manager-route-hint"`).

## Цель

Закрепить жестом браузера: менеджер на карточке заявки видит блок «Как собрать путь заявки»; роли без подсказки — не видят.

## Слои

| Слой | IN / OUT |
|---|---|
| E2E / journey | IN |
| Unit | уже есть (не дублировать без нужды) |
| UI / FE | только если баг видимости |
| Домен / API | OUT |
| ActionPanel / status-matrix | OUT — не трогать |

## Шаги

1. Spec в `vdp/fe/e2e/` (новый файл или рядом с form-detail helpers).
2. Login `manager@vdp.local` → открыть существующую или созданную заявку → `expect(page.getByTestId('manager-route-hint')).toBeVisible()`.
3. Негатив: `user@vdp.local` или `provider@vdp.local` на своей карточке — testid отсутствует / hidden.
4. Gate: `cd vdp && make check-env-parity` затем **`make ci-pr-pilot`** (правка `vdp/fe/e2e/**`).

## DoD

- Spec зелёный локально в составе ci-pr-pilot.
- Не утверждать merge-ready без зелёного `ci-pr-pilot`.
- Копирайт/логика статусов не меняются без отдельного запроса.

## Вне scope

BPM; process-roles UI для менеджера; CS-R1 ops; release-gate (CS-R3).

## Сверка rules

`playwright-e2e`, `vdp-ci-local-gate`, `честность-готовности`, `fe-interaction-contracts` (не обходить жест без нужды).
