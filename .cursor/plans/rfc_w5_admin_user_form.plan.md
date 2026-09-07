---
name: RFC W5 Admin User Form
overview: "Форма пользователя 2B: аккаунт + глобальная process-policy выбранной роли + overrides; human caps; admin без process participation."
todos:
  - id: w5-account-block
    content: "Сохранить/дотянуть блок аккаунта kind+role+org+API patch"
    status: pending
  - id: w5-role-template-block
    content: "Блок шаблона роли: enabled/mandatory/influence/caps через process-roles API + warning"
    status: pending
  - id: w5-overrides-block
    content: "Блок A+B overrides на аккаунте; system только для admin; locked root caps"
    status: pending
  - id: w5-save-flow
    content: "Save: PATCH account + PUT process-role; явные ошибки; disabled Save пока invalid"
    status: pending
  - id: w5-vitest
    content: "Vitest/form tests: warning global; admin hides process block"
    status: pending
isProject: false
---

# RFC W5 — Admin user form (2B)

**Мастер:** [roles_finalize_corrections_d10e6a7d.plan.md](roles_finalize_corrections_d10e6a7d.plan.md)  
**Зависимости:** W2, W4 (переиспользовать catalog/labels и контролы)  
**Следующая:** W6

## Цель

В модалке «Редактирование пользователя» управлять **всем** нужным root’у: аккаунт и (глобально) участие роли в процессе, включая обязательная — с понятными правами.

## Сверка с `.cursor/rules`

Наследует матрицу мастера. Срез волны:

**Обязательны:** `планирование-сверка-с-rules`, `базовые-правила-инструмента`, `правила-построения`, `честность-готовности`, `ui-web-практики` (три блока = chunking; primary Save; irreversible warning на глобальный шаблон), `ux-формы-навигация-онбординг`, `ux-когнитивная-нагрузка` (Hick/Miller — не одна простыня), `ux-взаимодействие-и-скорость`, `поддержка-и-обратная-связь` (ясный warning «на всех с ролью»), `безопасность-ролей-и-данных` (kind boundary; locked root system caps; AuthZ на API), `typescript-clean-code`, `use-cases` (создание/правка аккаунта = явный сценарий root).

**Вне scope волны:** импорт CSV process policy; BPM; Nest; ML; `vdp-fe-docker-пересборка` без «да».

**Gate/DoD-чеки:** template+overrides сохраняются; warning виден; admin без process block; ошибки partial save явны; UI hide ≠ единственная защита.


## Структура модалки

Файл: [`demo/admin.tsx`](vdp/fe/src/routes/demo/admin.tsx) (+ `/admin`).

1. **Аккаунт** — имя, email, тип (user/admin), роль, организация.
2. **Шаблон роли в процессе** (только `account_kind=user` и process-eligible role):
   - В процессе (enabled), Обязательная (mandatory), Влияние, Права (catalog title/description)
   - Warning: «Изменения шаблона действуют на всех пользователей с этой ролью»
   - Данные: GET process-roles → row by `draft.role`; Save → PUT `/admin/process-roles/{role}`
3. **Override на аккаунте** — business caps (± system если admin) через [`catalog-mutations.ts`](vdp/fe/src/lib/api/catalog-mutations.ts); null = шаблон.

Для `admin`/`root`: блок 2 скрыт; system caps шаблона + locked caps нельзя снять.

## Save flow

1. Validate локально
2. PATCH account (kind, role, org, overrides)
3. Если менялся шаблон роли → PUT process-role
4. При ошибке шага 3 — показать, что аккаунт мог уже сохраниться; не молчать

Переиспользовать компоненты/хелперы из W4 (select influence, cap checklist), не дублировать CSV.

## DoD W5

- [ ] Из формы можно сменить mandatory/enabled/influence роли и увидеть эффект на process-roles
- [ ] Overrides сохраняются на аккаунт
- [ ] Warning о глобальности виден
- [ ] Admin path без process block
