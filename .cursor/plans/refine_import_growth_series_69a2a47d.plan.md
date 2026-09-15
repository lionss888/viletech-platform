---
name: Refine import growth series
overview: Применить 6 точечных правок к плану import_growth_series для устранения неясностей и противоречий
todos:
  - id: apply-fixes
    content: Применить 6 точечных правок к import_growth_series_f8b557b2.plan.md
    status: completed
  - id: verify
    content: Перечитать план, verify ссылки и markdown-синтаксис
    status: completed
isProject: false
---

# Уточнение плана import_growth_series

Применить 6 конкретных правок к [`import_growth_series_f8b557b2.plan.md`](.cursor/plans/import_growth_series_f8b557b2.plan.md) для устранения неясностей.

## Правки

### 1. Материализация дочерних планов (строки ~52-53)

**Было:**
```markdown
При старте исполнения: материализовать семь файлов `.cursor/plans/imp7_*.plan.md` … `cicd_import_ops_*.plan.md` из секций ниже (по одному файлу на пакет), затем выполнять по порядку.
```

**Станет:**
```markdown
Семь дочерних планов уже материализованы: `.cursor/plans/imp7_*.plan.md` … `cicd_import_ops_*.plan.md` (todo materialize-plans completed). Выполнять по порядку P1→P7.
```

**Зачем:** Todo уже completed, фраза "При старте" создаёт путаницу.

---

### 2. P2: stale postpay test (после строки ~77, в начале секции "Работы")

**Добавить перед списком работ:**
```markdown
**Prerequisite:** `@pilot-matrix` postpay держит CTA в sync с UI через `e2e/helpers/wizard.ts` (`wizard-save-draft`). Не удалять spec из‑за старого TEST_STALE «Создать черновик».
```

**Зачем:** Связь с UAT блокером; явное указание, что нужно убрать stale test перед созданием нового.

---

### 3. P3: формат матрицы (строка ~97)

**Было:**
```markdown
- Матрица сверки (таблица в ответе/plan progress, не новый ops-doc без нужды): advance / RATE_ON_PP / continuity без ICO·ECO / corrections / refund / provider return — статус × роль × действие vs [`actions.ts`](vdp/fe/src/lib/ved/actions.ts) + domain `RoleMayPerform` + bridge.
```

**Станет:**
```markdown
- Построить таблицу сверки в прогрессе плана P3 (не ops-doc): advance / RATE_ON_PP / continuity без ICO·ECO / corrections / refund / provider return — статус × роль × действие vs [`actions.ts`](vdp/fe/src/lib/ved/actions.ts) + domain `RoleMayPerform` + bridge.
```

**Зачем:** Ясность, где именно строить матрицу.

---

### 4. P7: цель path-filter (строки ~154-161, секция "Работы")

**Было:**
```markdown
- Расширить regex в [`vdp-ci.yml`](../.github/workflows/vdp-ci.yml) `detect-pilot-matrix`: добавить `RateCommissionPanel.tsx`, `manager-payment.ts`, `forms-rate-commission` / nest treasurer paths по факту файлов P2.
```

**Станет:**
```markdown
- Расширить regex в [`vdp-ci.yml`](../.github/workflows/vdp-ci.yml) `detect-pilot-matrix`: добавить `RateCommissionPanel.tsx`, `manager-payment.ts`, `forms-rate-commission` / nest treasurer paths по факту файлов P2. Path-filter для pilot runs (ci-pr-pilot) и ревью; PR Playwright остаётся узким (4 required specs без полной postpay ladder).
```

**Зачем:** Устранить противоречие между "ловит" и "не расширять PR".

---

### 5. P7: proxy caveat (строка ~159)

**Было:**
```markdown
- [`known-gaps.md`](vdp/docs/pilot/known-gaps.md): явный local `VDP_API_PROXY_TARGET=http://localhost:8080`; partial CD VM без изменения bootstrap.
```

**Станет:**
```markdown
- [`known-gaps.md`](vdp/docs/pilot/known-gaps.md): добавить явное упоминание — для локальной работы нужен `export VDP_API_PROXY_TARGET=http://localhost:8080` (или через .env), без этого proxy молчит; partial CD VM без изменения bootstrap.
```

**Зачем:** Развёрнутая формулировка для ясности локального dev.

---

### 6. Глобальная проверка: один mgmt notify (строка ~175, п.4)

**Было:**
```markdown
4. `notify-mgmt` kind=`done` продуктовым языком после зелёного gate (`mgmt-tg-notify`).
```

**Станет:**
```markdown
4. `notify-mgmt` kind=`done` продуктовым языком ТОЛЬКО после зелёного ci-pr-pilot (один на всю серию P1-P7, не на каждый пакет; согласованно с `mgmt-tg-notify` rule).
```

**Зачем:** Согласованность с mgmt-tg-notify rule: "не шум на каждый gate".

---

## Проверка

После правок:
1. Перечитать план целиком — убедиться, что изменения согласованы
2. Verify: все ссылки на файлы валидны
3. Не нарушен markdown-синтаксис

## Связь с rules

- `планирование-сверка-с-rules`: план уже содержит явную сверку, правки не меняют scope
- `честность-готовности`: устранение неясности "материализовать при старте" повышает честность
- `mgmt-tg-notify`: правка #6 прямо согласует с rule
