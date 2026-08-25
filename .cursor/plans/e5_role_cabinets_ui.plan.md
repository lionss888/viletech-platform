---
name: E5 Role cabinets UI
overview: "Кабинеты 5 ролей ВИ для ручного UI-теста: list/detail hints и колонки, Provider без ПДн, чеклист роль×экраны, изоляция чужих заявок."
todos:
  - id: e5-list-detail
    content: List/detail builders — intro, колонки, reject comment, action_bar
    status: pending
  - id: e5-provider-pii
    content: Provider detail — только поля без ПДн клиента
    status: pending
  - id: e5-role-docs
    content: README — role picker / logout / смена роли
    status: pending
  - id: e5-qa
    content: "QA gate E5: чеклист 5 ролей × login/list/detail + isolation smoke"
    status: pending
isProject: false
---

# E5 — Кабинеты ролей как во вводных

## Зависимость

После зелёного **E4** (ветки UI). Можно частично параллелить с E4 по builders, но QA gate — после E4, чтобы сценарии уже проходимы.

## Цель

Ручной тест интерфейса **каждой** роли ВИ на очередях и карточках заявок без Swagger.

## Строгий критерий (вклад в DoD программы)

Оператор может: **ручное тестирование интерфейса всех ролей из вводных** и **работу с заявками** (список → карточка → CTA).

## Scope

- List: понятные intro/hint, колонки (id, status, org/amount); dataSource-фильтры статусов — читаемость
- Detail: status badge, detail_fields (сделка, комментарий reject), вложения/ids файлов если API отдаёт, action_bar
- Provider: UI не показывает ПДн — опора на [`FormPaymentProviderViewDto`](fe-experiment/backend-for-ved/src/modules/form-payment/dto/form-payment-provider.view.dto.ts)
- Role picker / logout / смена роли — в [`README.md`](fe-experiment/README.md)
- Файлы: [`role-cabinet.builders.ts`](fe-experiment/backend-for-ved/src/modules/bdui/service/role-cabinet.builders.ts), [`user-screen.builders.ts`](fe-experiment/backend-for-ved/src/modules/bdui/service/user-screen.builders.ts), виджеты detail/table при необходимости
- Чеклист «роль × login/list/detail» в LIFECYCLE

## Вне

Figma/Neo360 визуал; Admin/Superadmin; новые роли.

## Опора

- Роли ВИ: [`вводные/вводные от ви.txt`](вводные/вводные%20от%20ви.txt)
- Правило: `безопасность-ролей-и-данных`
- BDUI roles: user, internal_compliance_officer, compliance_officer, manager, provider

## Проверка стабильности и качества

1. Чеклист «роль × экраны login/list/detail» для 5 ролей — руками, без Swagger
2. Unit builders на ключевые hints/columns
3. Чужой кабинет не видит чужую заявку (404 / пустой list) — smoke
4. Provider detail без email/phone/ПДн клиента
5. Отметить E5 DONE в LIFECYCLE
