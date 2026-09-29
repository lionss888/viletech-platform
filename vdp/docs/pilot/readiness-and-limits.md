# Готовность и ограничения MVP

Дата оценки 2026-09-29. Правило честности: done в матрице Nest to vdp означает маршрут замаплен и проходит gate test. Это не полный продуктовый паритет Nest и не боевые интеграции без staging-конфига.

Маршруты вводных из scope закрыты от домена до E2E: импорт с авансом, импорт POSTPAY_RATE_ON_PP, экспорт PAY_FROM_EXPORT, возврат ДС, опциональная ветка отгрузки. Локальная команда ci-pr-pilot зелёная 2026-09-28 (узкий PR smoke плюс @pilot-matrix: 20 passed, в том числе полный постоплатный ladder до completed при отключённом казначее). Локальная сборочная команда handover (release-gate) зелёная 2026-09-15. Вне in-scope: полный мастер с payment_method advance, POSTPAY_FIXED_RATE, продукт логистов, analytics, своя OCR как PRIMARY, миграция данных Nest.

Контур FE после Lovable восстановлен. Волны UX 0–4 (стороны сделки, мастер, документы, провайдер, отчёт, закрытие) и контракты жеста загрузки (FilePickButton и filechooser) в коде. Документы B.2 на FE около 90 процентов (см. b2-fe-handoff.md). Staging deploy: workflows и rollback-документы готовы; Environments на ВМ — сторона ops.

Для демо с тремя ролями (клиент, менеджер, провайдер) казначей можно отключить через process-roles с режимом skip: подтверждение поступления выполняет менеджер. Инварианты постоплаты: [postpay-rate-on-pp-invariants.md](../domain/postpay-rate-on-pp-invariants.md).

## Полнота реализации

Оценка около 97–98 процентов in-scope контура вводных после зелёной ci-pr-pilot 2026-09-28. Не 100 процентов продукта. Backend R0–R12, B.2, IMP, export, refund, shipment. FE: кабинеты User, Manager, Provider, Treasurer; RefundPanel; ShipmentPanel; панель курса и комиссии на RATE_ON_PP после payment_sent. Browser ladders: импорт аванс с казначеем, импорт постоплата RATE_ON_PP до completed (в том числе при skip казначея), экспорт PAY_FROM_EXPORT, возврат, опциональная отгрузка. Остаток продукта: пиксельный PDF, живой bank webhook, live Prometheus, ротация секретов заказчика, полная browser-матрица всех ролей по всем статусам, заглушки analytics и assistant, UI выбора курса до первичного поручения на авансе (воркшоп).

## Качество MVP

Оценка 8 из 10 для in-scope demo-маршрутов вводных. Оценка 6.5 из 10 для prod ownership: секреты заказчика и live alerting не закрыты. Не 10 и не 100 процентов продукта.

Сильные стороны: unit и HTTP gate включая IMP1–3; воспроизводимый compose; RH-программа и path-filter pilot-matrix на PR при касании лестницы заявки; Phase 4 Ops (correlation logging, архитектура semantic alerts, runbooks). Слабее: выкат live Prometheus (ждёт инфраструктуру ops), реальные вендорские интеграции на staging, полный браузерный мастер advance и часть import-journey вне обязательного узкого PR smoke.

## Передача пилот

Маршруты вводных из scope: 100 процентов заявленной матрицы domain to E2E при зелёной ci-pr-pilot 2026-09-28 и принятых known-gaps. Это не 100 процентов roadmap. UAT demo этих маршрутов 96–98 процентов. Prod go-live 55–60 процентов: alpha health 200, software gate зелёный; ротация секретов и live alerting у заказчика и ops.

## Что можно показывать на пилоте

Полный путь User to completed на seed через compose. Ось процесса: клиент, менеджер, провайдер; ICO и ECO опциональны через process-roles. Казначей опционален: при skip менеджер подтверждает поступление.

Кабинеты ролей ICO, ECO, Manager, Provider, Treasurer (аванс import, экспорт PAY_FROM_EXPORT), smoke банковского канала. Панель курса и комиссии менеджера на POSTPAY_RATE_ON_PP после payment_sent. Браузер pilot-matrix: импорт аванс с казначеем и сроком исполнения; импорт постоплата до completed (rate/commission и full ladder со skip); экспорт PAY_FROM_EXPORT до completed (в том числе skip казначея); возврат; опциональная отгрузка. Ветка отгрузки не заменяет report completed и не равна продукту логистов.

Unit, postgres integration, compose-e2e, полный browser suite и pilot-matrix. ci-pr-pilot зелёная 2026-09-28 (20 passed @pilot-matrix). Локальная handover зелёная 2026-09-15. CI: vdp-ci.yml на main.

## Что нельзя обещать на пилоте

Сто процентов готовности продукта. Полный паритет Nest. Полная browser-матрица всех статусов. Полный мастер payment_method advance. Множественные экспортные сценарии сверх PAY_FROM_EXPORT treasurer happy path. Продукт логистов. POSTPAY_FIXED_RATE. Prod Diadoc, mail и OCR без staging-конфига. Пиксельная верность XLSX и PDF. Prod-секреты в defaults compose. Analytics и assistant. Своя OCR-модель как PRIMARY. Миграция данных Nest. UI фиксации курса до первичного поручения на авансе как закрытый заказчицкий воркшоп.

## Извлечение документов (два пути)

Коммерческий путь (Yandex PRIMARY, HITL gold, shadow): опционально за hub OCR_URL с ключами YANDEX_*. Живой Yandex: ключи в gitignored .env, EXTRACTION_PRIMARY equals yandex; smoke make extraction-yandex-smoke.

На пилоте PRIMARY — Docling, FALLBACK — docTR (EXTRACTION_PRIMARY equals docling, EXTRACTION_FALLBACK equals doctr, URL Docling и docTR, OCR_TIMEOUT_MS equals 180000, GATEWAY_TIMEOUT equals 180). Yandex на этом пилоте не PRIMARY. Smoke: make extraction-docling-smoke и make extraction-doctr-smoke. HITL-подтверждение обязательно. Demo runtime не подставляет фикстурные суммы при полном провале OCR.

Свой CPU: Ollama и few-shot можно пробовать; prod PRIMARY own не готов до оценки волны E. EXTRACTION_PRIMARY equals own без eval-отчёта — только частичная готовность. Веса — волна E (lora_recipe.md).

Применено: Hugging Face для tooling LoRA; без self-host YaLM 100B и без Onyx как OCR; open-llms — лицензионный чеклист до обучения.

## Инвентарь заглушек Hub

Docs и mail — stub при пустом URL; HTTP-контракт проверен в CI. OCR не на пользовательском транзакционном пути. Diadoc, Telegram, 1С, partner callback — только без URL вендора.

## Инвентарь заглушек экспорта

XLSX Nest/compliance — реальный OOXML. PDF — payload с template_id платёжного агента; байты файла из сервиса DOCS_URL или dev stub.pdf. На POSTPAY_RATE_ON_PP первичное поручение может не содержать курс в payload по задумке.

## Dev-секреты compose

JWT_SECRET equals vdp-core-dev-secret. HUB_SHARED_SECRET equals vdp-s2s-dev-secret. Только для локального compose, никогда для prod. Core и hub завершаются при production с этими defaults.

## Справка по метрикам гейтов

R1 form-payment 148 из 148. R12 matrix 331 из 331 in-scope. Серия IMP закрыта: HTTP IMP1 IMP2 IMP3; FE unit казначей, курс, комиссия; compose-e2e IMP1 IMP2 (в том числе dual-config treasurer on и skip); pilot-matrix IMP7 (аванс) и IMP8 (постоплата rate плюс full ladder до completed). Export фазы 5–6: domain, HTTP, FE unit, E2E PAY_FROM_EXPORT до completed. Refund фаза 7: domain, HTTP, FE, E2E. Shipment фаза 8: опциональная ветка domain, HTTP, FE, E2E. ci-pr-pilot green 2026-09-28 (20 specs @pilot-matrix). Локальная handover green 2026-09-15.

## Следующие шаги prod

Staging: staging-env.example, scripts/staging-smoke.sh. Security: security-signoff-checklist.md. Ops: semantic-alerts.md, runbooks. Нагрузочное тестирование. Импорт robot-фикстур заказчика для QG. Явный локальный VDP_API_PROXY_TARGET для FE. Миграция Nest вне scope. При необходимости демо без казначея — process-roles treasurer skip; не путать с отсутствием роли в домене.

UAT-сценарии: [uat-scenarios.md](uat-scenarios.md). Пробелы: [known-gaps.md](known-gaps.md). Жизненный цикл: [form-lifecycle.md](../domain/form-lifecycle.md). CI: [ci.md](../operations/ci.md).
