# UAT feedback — кабинеты (сессия 2026-09-23)

Контур: http://localhost:5173 (app, не demo).  
Документы: `вводные/примеры документов` + robot fixtures `vdp/testdata/robot-fixtures/packs/template/docs`.  
Мастер-план: `.cursor/plans/uat_кабинеты_матрица_сессия_2026-09-23.plan.md`.

Легенда severity: blocker | major | minor | note (ожидаемое / не баг).

---

## Прогон

### F-прогон log

| Время | Роль | Сценарий / тип | Результат | Finding ids |
|---|---|---|---|---|
| 08:50 | user | login + dashboard empty | OK | — |
| 08:50 | user | wizard docs + OCR stub PDF | OCR limitations banner | F1 |
| 08:51 | user | parties default org | Inline Org first, не ООО Пример | F2 |
| 08:52 | user | change CP keeps org (select) | orgKept=true | F3 note |
| 08:53–08:57 | user | import/good/advance + submit | OK → form card ВЭД-05e8f9ff awaits manager | F6, F7 |
| 08:55 | API | 8 combos create+submit | all 201/200 → form_waiting_verification | — |
| 08:56 | API | continuity eco/manager no_docs | stuck: invoice document required | F5 |
| 08:56 | API | eco@ role eco_start | 403 when ECO slot off | F8 note |
| 08:57 | API | manager eco_reject | → form_waiting_corrections | OK |
| 09:01 | API | spine+invoice → payment_sent | OK; provider card no PII | — |
| 09:01 | API | root_cancel draft | 403 FORBIDDEN | F11 |
| 09:01 | API | bank create | 400 Idempotency-Key required | F12 note |

### Типы заявок (API create+submit)

Все 8 комбинаций direction×kind×condition: OK → `form_waiting_verification` (до wipe core).

### Spine

- **UI User** create+submit import/good/advance: OK (ВЭД-05e8f9ff; данные могли сброситься после restart core).  
- **API** Manager continuity + assign provider + provider sent → `payment_sent`: OK (form `016d6161-…`).  
- **Provider ACL API:** карточка без passport/email/user@vdp/ФИО — OK.  
- **UI Manager/Provider/ICO/ECO:** не завершён (auto-review блокировал смену роли в браузере).  
- Postpay / export ladder / refund / shipment / return: **остаток**.

---

## Findings

### F1 — OCR на мастере: «с ограничениями», поля не prefill

- **Роль:** user  
- **Тип:** import/good/advance  
- **Шаги:** загрузка invoice+contract PDF → Далее → баннер «Распознавание завершилось с ограничениями»; сумма/номер не подставились.  
- **Severity:** major (на stub fixture ожидаемо; на реальных PDF из `вводные/примеры документов` — отдельный прогон W1).  
- **Evidence:** wizard step 2–4, кнопка «Просмотр данных».  
- **Волна:** W1  

### F2 — Default организация = Inline Org*, не seed «ООО Пример»

- **Роль:** user  
- **Шаги:** шаг «Стороны»; combobox org value = `Inline Org 1789558348009`; ООО Пример в списке 6-м среди 16.  
- **Severity:** major (Choice Overload / Hick на local UAT).  
- **Evidence:** API `GET /organizations` → 16 orgs, E2E Inline* доминируют.  
- **Волна:** W2  

### F3 — Сброс org при смене CP

- **Проверка:** смена CP через native select → `orgKept: true` (ООО Пример сохраняется).  
- **Severity:** note — не подтверждён на этом пути; оставить в W2 как regression-тест (dialog pick путь не прогнан).  

### F5 — Путь no_documents: compliance не проходит без инвойса

- **Роль:** manager continuity / eco  
- **Шаги:** `no_documents: true` → submit → `eco_accept` / `mgr eco_accept` → **409** `invoice document is required`; статус остаётся `form_verification`.  
- **Severity:** major (домен ок, но UX «нет документов» вводит в тупик до approve).  
- **Волна:** W3  

### F6 — Путаница полей Инвойс / Контракт на карточке

- **Роль:** user  
- **Шаги:** в мастере введён номер инвойса `INV-UAT-001`; на карточке: Инвойс=`template`, Контракт=`INV-UAT-001`.  
- **Severity:** major (копирайт/маппинг полей).  
- **Evidence:** скрин `uat-wizard-after-submit.png`, заявка ВЭД-05e8f9ff.  
- **Волна:** W4  

### F7 — Sticky CTA «Создать заявку» на карточке заявки

- **Роль:** user  
- **Шаги:** после submit на detail формы FAB/кнопка «Создать заявку» остаётся внизу.  
- **Severity:** minor (отвлекает от «следующего шага» по статусу).  
- **Волна:** W4 или hygiene  

### F8 — ECO direct API 403 при выключенном слоте

- **Роль:** eco  
- **Шаги:** `PUT .../eco/.../form/start` → 403; manager `eco_start` → 200.  
- **Severity:** note (пилот continuity через manager — ожидаемо).  

### F9 — Карточка «Доработка»: «контрагент не указан» при reject

- **Роль:** user  
- **Шаги:** после manager eco_reject дашборд: `ВЭД-3bf40eea Доработка контрагент не указан`.  
- **Severity:** major (копирайт/проекция вводит в заблуждение — reject был по docs, не по CP).  
- **Волна:** W4 или W5  

### F11 — root_cancel на draft: 403

- **Роль:** root  
- **Шаги:** `POST /api/v1/forms/{id}/actions/root_cancel` → 403 role not allowed.  
- **Severity:** major (UAT-сценарий root cancel из docs/pilot).  
- **Волна:** W5  

### F12 — Bank create требует Idempotency-Key

- **Роль:** bank  
- **Шаги:** POST `/api/v1/bank/forms` без ключа → 400.  
- **Severity:** note (контракт ок; проверить UI `/testing` smoke с ключом).  

---

## Волны (привязка)

| Волна | Тема | Finding ids | Plan file |
|---|---|---|---|
| W1 | OCR wizard: prefills / reals PDFs / banner UX | F1 | `.cursor/plans/uat_w1_ocr_wizard_prefill.plan.md` |
| W2 | Гигиена org/CP pick | F2, F3 | `.cursor/plans/uat_w2_parties_hygiene.plan.md` |
| W3 | no_documents → gate инвойса до compliance | F5 | `.cursor/plans/uat_w3_no_docs_invoice_gate.plan.md` |
| W4 | Маппинг Инвойс/Контракт + sticky CTA + copy доработки | F6, F7, F9 | `.cursor/plans/uat_w4_card_field_labels.plan.md` |
| W5 | Root cancel AuthZ / admin path | F11 | `.cursor/plans/uat_w5_root_cancel.plan.md` |
