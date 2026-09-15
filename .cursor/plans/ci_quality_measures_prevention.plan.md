---
id: ci_quality_measures_prevention
title: "CI/CD Quality Measures: Prevention of Recurring Issues"
priority: P0
gate: org-gate
status: active
---

# CI/CD Quality Measures: Prevention of Recurring Issues

**Контекст**: После 3 дней итераций возникают новые проблемы при каждом "готово". Последняя: Node.js 22 локально vs Node.js 20 в CI → FE unit tests падают с cryptic ошибками в нативных модулях.

**Цель**: Установить систематические меры для **автоматического предотвращения** расхождений между локальной средой и CI, чтобы исключить ручную отладку.

## Немедленные исправления (выполнено)

- [x] Создан `.nvmrc` с версией 22.17.0
- [x] CI workflow обновлен на `node-version-file: vdp/fe/.nvmrc`

## Автоматические проверки (TODO)

### 1. Environment parity checks в CI
**Проблема**: Расхождения версий Node.js, npm, Go между локальной средой и CI остаются незамеченными до падения тестов.

**Решение**:
- [ ] Добавить job `env-parity` в `.github/workflows/vdp-ci.yml`:
  - Проверка `.nvmrc` существует
  - Проверка workflow использует `node-version-file` (не хардкод версии)
  - Проверка go-version в workflow совпадает с `.go-version` (или go.mod)
  - Fail-fast если расхождение

### 2. Pre-commit environment checks
**Проблема**: Коммиты с несовместимой средой попадают в CI без локальной проверки.

**Решение**:
- [ ] Добавить в `.githooks/pre-commit`:
  ```bash
  # Check Node.js version matches .nvmrc
  NVMRC_VERSION=$(cat vdp/fe/.nvmrc)
  NODE_VERSION=$(node --version | sed 's/v//')
  if [ "$NODE_VERSION" != "$NVMRC_VERSION" ]; then
    echo "❌ Node.js version mismatch: local=$NODE_VERSION, .nvmrc=$NVMRC_VERSION"
    exit 1
  fi
  ```
- [ ] Проверка package-lock.json не содержит local file:// зависимостей

### 3. Обязательный локальный `ci-pr` перед push
**Проблема**: Изменения пушатся без локального прогона CI gate.

**Решение**:
- [ ] Обновить `.githooks/pre-push`:
  ```bash
  # Require clean ci-pr before push to main/PR branches
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  if [[ "$BRANCH" =~ ^(main|master|feature/|fix/) ]]; then
    echo "Running ci-pr gate before push..."
    cd vdp && make ci-pr || {
      echo "❌ ci-pr failed. Fix issues before push."
      exit 1
    }
  fi
  ```
- [ ] Или менее агрессивный вариант: warning + manual override

### 4. Package-lock.json integrity check
**Проблема**: Устаревший или несинхронизированный package-lock.json.

**Решение**:
- [ ] Добавить step в CI job `fast`:
  ```yaml
  - name: Verify package-lock.json is up-to-date
    working-directory: vdp/fe
    run: |
      npm ci
      git diff --exit-code package-lock.json || {
        echo "❌ package-lock.json out of sync. Run 'npm install' and commit."
        exit 1
      }
  ```

## Процессные меры

### 5. Documented environment standards
**Проблема**: Нет явного канона версий инструментов.

**Решение**:
- [ ] Создать `vdp/docs/development/environment-requirements.md`:
  - Канон версий: Node.js 22.17.0, Go 1.22, Docker, Docker Compose
  - Инструкция setup локальной среды с nvm/gvm
  - Как синхронизировать после git pull
- [ ] Обновить `.cursor/rules` с ссылкой на этот документ

### 6. CI failure notifications с context
**Проблема**: Падения CI не всегда замечаются сразу; неясен root cause.

**Решение**:
- [ ] Обновить `mgmt-notify` в CI:
  - При fail: краткое описание проблемы (не просто "failed")
  - Ссылка на Actions run
  - Hints по частым причинам (version mismatch, cache corruption, missing secrets)

### 7. Регулярный аудит правил `.cursor/rules`
**Проблема**: Rules не всегда применяются агентом; могут устареть.

**Решение**:
- [ ] Еженедельный review правил (расписание в README)
- [ ] После каждого инцидента: проверка, что relevant rule существует и применен
- [ ] Метрика: % коммитов, которые требовали ручной отладки после "готово"

## Мониторинг и ретро

### 8. Automated postmortem template
**Проблема**: После инцидентов нет систематического анализа root cause.

**Решение**:
- [ ] Создать шаблон `vdp/docs/postmortems/YYYY-MM-DD-title.md`:
  - Timeline
  - Root cause
  - Prevention measures (implemented / planned)
  - Updated rules / docs / CI checks
- [ ] Обязательный postmortem после каждого "unexpected failure" в main

### 9. CI health dashboard
**Проблема**: Нет visibility по stability CI pipeline.

**Решение**:
- [ ] Badge в README с CI status
- [ ] Метрики:
  - % зеленых runs за последние 7 дней
  - Mean time to green после merge
  - Частота cache miss / version mismatch

### 10. Auto-retry с circuit breaker
**Проблема**: Флаки могут скрывать реальные проблемы.

**Решение**:
- [ ] В CI: retry только для known flaky tests (помеченных `@flaky`)
- [ ] Circuit breaker: если >3 retries → fail + escalation
- [ ] Не ретраить unit tests (они должны быть deterministic)

## DoD (Definition of Done) для этого плана

1. ✅ Node.js version mismatch исправлен (.nvmrc + CI)
2. ⬜ Environment parity check job добавлен в CI и проходит
3. ⬜ Pre-commit hook проверяет версии Node.js и Go
4. ⬜ Package-lock.json integrity check в CI
5. ⬜ Документация environment requirements создана
6. ⬜ Обновлены CI notifications с hints
7. ⬜ Шаблон postmortem создан
8. ⬜ Хотя бы один postmortem написан для текущего инцидента

## Next steps

1. **Сейчас**: Push исправления .nvmrc + CI workflow
2. **Следующие 2 часа**: Реализовать пункты 1-4 (автоматические проверки)
3. **Следующий день**: Документация + postmortem
4. **Долгосрочно**: Мониторинг и метрики (пункты 9-10)

## Связанные правила

- `.cursor/rules/vdp-ci-local-gate.mdc` - обновить с requirement .nvmrc check
- `.cursor/rules/правила-построения.mdc` - добавить requirement environment parity
- `.cursor/rules/тесты-архитектуры.mdc` - упомянуть environment checks как gate
