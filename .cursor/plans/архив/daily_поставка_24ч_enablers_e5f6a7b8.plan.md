---
name: Daily поставка 24ч — enablers
overview: "Технические и процессные доработки, без которых эталон «срез ≤ 24 ч на alpha» будет регулярно срываться: Go в env-parity, fail-fast на длинных E2E лестницы, дисциплина push поверх длинного run, postmortem на неожиданный fail main."
todos:
  - id: go-env-parity
    content: Добавить проверку версии Go в check-env-parity.sh + строка в environment-requirements; CI/pre-commit подхватывают тот же скрипт
    status: completed
  - id: fail-fast-e2e
    content: Паттерн короткого expect на CTA/шаг для длинных @pilot-matrix / return specs; без silent wait 7–17 мин
    status: completed
  - id: push-over-long-run
    content: "Callout/правило Local QG + пункт в DoD шаблона: не пушить поверх идущего ci-pr-pilot/ci-main без нужды"
    status: completed
  - id: postmortem-habit
    content: "Правило или короткий шаблон: неожиданный красный main → postmortem + 1 prevention item в план"
    status: completed
  - id: verify-gates
    content: "После go-parity: make check-env-parity; после e2e — make ci-pr-pilot или ci-main по path"
    status: completed
isProject: false
---

# Daily поставка раз в 24 часа — enablers

Зачем: [ориентир-скорости-запросов-заказчика-2026-09-21.md](../../заметки/ориентир-скорости-запросов-заказчика-2026-09-21.md) задаёт ритм. Этот план снимает известный налог lead time (env, stale E2E, cancel, отсутствие разбора).

Связанный процессный план: [эталон_оценки_запросов_заказчика_a1b2c3d4.plan.md](эталон_оценки_запросов_заказчика_a1b2c3d4.plan.md).

## Запрос заказчика (внутренний: предсказуемая поставка)

Команда может каждый рабочий день выкатывать срез на alpha без сюрпризов «локально зелёно / CI красное», без часа ожидания несуществующей кнопки и без ложного «красного» от отмены прогона.

## Acceptance

1. `make -C vdp check-env-parity` падает при неверной версии Go так же, как при неверном Node.
2. Хотя бы один бывший «длинный silent wait» в лестнице/return падает за секунды при отсутствии CTA; полный path gate зелёный.
3. В Local QG или шаблоне DoD явный запрет push поверх длинного run.
4. Есть шаблон postmortem на 1 страницу и правило «неожиданный fail main → разбор».

## Вне scope

- Ускорение самого Playwright suite (параллелизм, шардинг) — отдельный план при нужде
- Смена path-filter GitHub
- Автоматический block push при running workflow (можно позже; сейчас дисциплина + Callout)
- Закрытие конкретного открытого бага return/export 20.09 — отдельный product-план, не этот

## Слои

| Слой | Действие |
|---|---|
| UI | Callout Local QG (push / postmortem reminder) |
| FE / E2E | Fail-fast asserts в затронутых specs |
| Домен / API | Нет |
| Scripts | `check-env-parity.sh` + docs environment |
| Unit | При смене скрипта — smoke/shell check если уже есть в CI |
| QG | `check-env-parity`; e2e-срез → `ci-pr-pilot` или `ci-main` по path |

## Сверка с rules

Обязательны: `vdp-ci-local-gate`, `честность-готовности`, `playwright-e2e`, `тесты-архитектуры` (fail-fast / пирамида), `devops-культура` (postmortem), `развертывание-и-доставка`, `планирование-сверка-с-rules`.

Вне scope: смена матрицы ролей, Provider ПДн, ML.

## DoD

1. Go в env-parity: локально и в том же pre-commit пути.
2. Fail-fast: зелёный заявленный browser gate после правок specs.
3. Push-дисциплина зафиксирована в Local QG и/или шаблоне плана.
4. Шаблон postmortem в `vdp/docs/postmortems/` или `docs/development/` + отсылка из ориентира.
5. Перед «готово» плана: `make -C vdp check-env-parity`; для e2e — `make -C vdp ci-pr-pilot` или `ci-main` по path-filter (не только `ci-pr`).

## Срезы дня

- День 1: Go env-parity + docs + Callout push.
- День 2: fail-fast на приоритетных длинных specs + gate.
- День 3: шаблон postmortem + ссылка из ориентира 21.09.
