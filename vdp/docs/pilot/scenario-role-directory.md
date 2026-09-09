# Справочник сценариев и ролей

Контракт для автотестов и экрана проверки сценариев. Машинные идентификаторы сценариев живут в коде каталога scenarioverify. Этот документ описывает роли, смысл сценариев и честное покрытие. Источник для матрицы роботов и приёмки полного пути заявки.

Связанные документы: матрица E2E в development, readiness-and-limits в pilot.

## Роли

Роль Клиент (user). Участие в пилоте обязательное. Создаёт заявку, отправляет на проверку, правит после возврата, загружает документы и отчёты.

Роль Менеджер (manager). Участие в пилоте обязательное. При выключенных слотах внутреннего и внешнего комплаенса закрывает их шаги (continuity), ведёт оплату, назначает провайдера, закрывает заявку.

Роль Провайдер (provider). Участие в пилоте обязательное. Исполняет платёж и подтверждает отправку. Не получает ПДн клиента.

Роль Суперадмин (root). Не слот бизнес-процесса. Отмена заявки, справочники, экран проверки сценариев.

Роль Внутренний комплаенс (ICO). В пилоте по умолчанию слот выключен. Сценарий проверки организации актуален при включённом слоте или через детерминированный unapprove в автотестах; иначе шаги может закрыть менеджер.

Роль Внешний комплаенс (ECO). В пилоте по умолчанию слот выключен. Сценарий возврата ECO в пилоте выполняется как возврат менеджером (тот же статус коррекции).

Роль Банк (bank). Канал рядом с кабинетом клиента. Создание заявки с меткой «от банка».

Роли sales, viewer, treasurer, senior_provider, one_c. Участие по process config. В пилотных автотестах полного пути не обязательны; в справочнике учтены как возможные слоты без отдельного браузерного прогона каждого.

## Главный путь заявки (spine)

Обязательный критерий приёмки: заявка клиента проходит до закрытия при участниках клиент, менеджер, провайдер. Ветка возврата на доработку и повторной отправки тоже обязательна.

Идентификаторы spine: happy_path_to_completed, continuity_manager_form_approve, manager_reject_to_corrections, user_resubmit_after_reject, manager_payment_assign_provider, provider_payment_no_pii.

Проверка spine: make compose-e2e и make playwright-pilot-matrix.

## Сценарии каталога

Идентификатор happy_path_to_completed. Название Полный путь заявки до закрытия. Смысл сквозной путь от подачи до закрытия. Роли по шагам клиент, комплаенс или менеджер continuity, менеджер, провайдер, менеджер. Исход статус completed. Пилот актуален да. Покрытие API compose-e2e main. Покрытие UI pilot-matrix-full-ladder и happy-path. Статус covered.

Идентификатор eco_reject_resubmit. Название Возврат на доработку и повторная подача. Смысл возврат клиенту и повторная отправка. Роли ECO или менеджер при ECO off, затем клиент. Исход form_waiting_corrections затем form_waiting_verification. Пилот через менеджера. Покрытие API compose-e2e reject. Покрытие UI reject-path и pilot-matrix reject. Статус covered. Примечание в matrix eco_off_alias_manager_reject.

Идентификатор ico_org_pending_approve. Название Проверка организации клиента. Смысл организация ещё не одобрена. Роли клиент, ICO или менеджер continuity. Исход organization_waiting_verification затем form_waiting_verification. Пилот требует детерминированный unapprove в gate. Покрытие API compose-e2e и scenarioverify без soft-skip. Покрытие UI ico-org spot. Статус covered после волны B.

Идентификатор manager_payment_assign_provider. Название Приём оплаты и передача провайдеру. Роли менеджер. Исход payment_received затем payment_processing. Пилот да. Покрытие API compose-e2e. Покрытие UI manager-payment и pilot-matrix. Статус covered.

Идентификатор provider_payment_no_pii. Название Провайдер не видит личные данные клиента. Роли провайдер. Исход карточка без ПДн. Пилот да. Покрытие API RD7. Покрытие UI provider-acl и pilot-matrix. Статус covered.

Идентификатор bank_channel_badge. Название Заявка от банка. Роли bank. Исход draft с меткой банка. Пилот spot. Покрытие API RD9. Покрытие UI bank-badge. Статус covered.

Идентификатор root_cancel. Название Отмена заявки суперадмином. Роли root. Исход canceled_by_manager. Пилот spot. Покрытие API RD8. Покрытие UI pilot-form-flow S-Root-02. Статус covered.

Идентификатор refund_smoke. Название Нельзя отменить заявку при незавершённом возврате. Роли менеджер. Исход запрет отмены 409. Пилот API-only. Покрытие API compose-e2e. Покрытие UI нет. Статус api_only.

Идентификатор manager_hides_drafts. Название Менеджер не видит черновики клиента. Роли менеджер. Исход draft отсутствует в очереди. Пилот да. Покрытие API dash. Покрытие UI manager-hides-drafts. Статус covered.

Идентификатор doc_preview_visible. Название Просмотр документа в карточке. Роли клиент или менеджер. Исход кнопка Посмотреть. Пилот да. Покрытие API dash. Покрытие UI api-core-ux и pilot. Статус covered.

Идентификатор health_core. Название Платформа отвечает. Роли служебный. Исход health ok. Пилот smoke. Покрытие API health. Покрытие UI нет отдельного. Статус api_smoke.

Идентификатор continuity_manager_form_approve. Название Менеджер подтверждает заявку без ECO. Роли клиент, менеджер. Исход form_accepted. Пилот да. Покрытие API continuity. Покрытие UI happy-path и pilot-matrix. Статус covered.

Идентификатор manager_reject_to_corrections. Название Менеджер возвращает на коррекцию. Роли менеджер. Исход form_waiting_corrections. Пилот да. Покрытие API reject. Покрытие UI pilot-matrix. Статус covered.

Идентификатор user_resubmit_after_reject. Название Клиент повторно отправляет после коррекции. Роли клиент. Исход form_waiting_verification. Пилот да. Покрытие API reject. Покрытие UI pilot-matrix. Статус covered.

Идентификатор provider_return_to_manager. Название Провайдер возвращает платёж менеджеру. Роли провайдер. Исход manager_checking. Пилот да. Покрытие API compose-e2e и scenarioverify. Покрытие UI spot при наличии CTA. Статус covered после волны B.

Идентификатор extraction_confirm_updates_amount. Название Подтверждение OCR обновляет сумму. Роли клиент. Исход сумма и валюта в заявке. Пилот side-path. Покрытие API scenarioverify. Покрытие UI form-ux-deadends spot. Статус covered.

Идентификатор manager_sets_deal_rate. Название Менеджер задаёт курс сделки. Роли менеджер. Исход курс в карточке. Пилот да. Покрытие API compose-e2e и scenarioverify. Покрытие UI spot при наличии поля курса. Статус covered после волны B.

## Расширение матрицы

Идентификатор happy_path_shipment_branch. Не элемент каталога из 17, а ветка отгрузки в matrix. Покрытие API P5 shipment. Покрытие UI шаги отгрузки в pilot-matrix. Статус covered.

## Правила для тестов

Новый автотест обязан ссылаться на идентификатор из этого справочника. Пустая клетка покрытия запрещена. Тихий skip сценария ico_org_pending_approve в gate запрещён. Галочка выбора на экране проверки не равна успешному прогону.
