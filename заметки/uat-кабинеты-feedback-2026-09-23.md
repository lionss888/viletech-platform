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
| 08:53–08:57 | user | import/good/advance + submit | OK → form card awaits manager | F6, F7 |
| 08:55 | API | 8 combos create+submit | all 201/200 → form_waiting_verification | — |
| 08:56 | API | continuity eco/manager no_docs | stuck: invoice document required | F5 |
| 08:56 | API | eco@ role eco_start | 403 when ECO slot off | F8 note |
| 08:57 | API | manager eco_reject | → form_waiting_corrections | OK |
| 09:01 | API | spine+invoice → payment_sent | OK; provider card no PII | — |
| 09:01 | API | root_cancel actions/root_cancel | 403 FORBIDDEN | F11 |
| 09:01 | API | bank create без Idempotency-Key | 400 | F12 note |
| 09:20 | API | spine → report → completed | OK | — |
| 09:20 | API | import advance + treasurer | → completed | — |
| 09:20 | API | refund init/start/sent | → payment_refund_sent | — |
| 09:20 | API | shipment waiting→accept | → completed | — |
| 09:20 | API | postpay rate POST /forms/{id}/rate | 200 at payment_sent | — |
| 09:21 | API | export PAY_FROM_EXPORT full | → completed | — |
| 09:21 | API | bank + Idempotency-Key | 201 channel=bank | — |
| 09:21 | API | root PUT manager/.../cancel | → canceled_by_manager | F11 clarified |
| 09:21 | API | reject → user form/accept resubmit | → form_waiting_verification | OK |
| 09:22 | API | OCR readiness + real PDF extract | readiness ok; amount not prefilled | F1 |
| 09:20 | Go | HTTP export/refund/shipment/IMP tests | ok | — |

### Типы заявок (API create+submit)

Все 8 комбинаций direction×kind×condition: OK → `form_waiting_verification`.

### Spine

- **UI User** create+submit import/good/advance + PDF: OK.  
- **API** continuity approve → order → payment → provider → report → **completed**: OK.  
- **Reject** → form_waiting_corrections; **resubmit** via `PUT .../form/accept` → form_waiting_verification: OK.  
- **Provider ACL API:** без passport/email/user@vdp/ФИО: OK.  
- **UI Manager/Provider/ICO/ECO в браузере:** не закрыт (auto-review блокировал смену роли); покрытие API + Go HTTP + ранее login smoke Playwright.

### Денежные лестницы (API)

| Лестница | Итог статуса | Примечание |
|---|---|---|
| import advance + treasurer confirm | completed | PATCH treasurer/confirm-payment |
| postpay + set rate | payment_sent + rate 200 | POST /api/v1/forms/{id}/rate |
| export PAY_FROM_EXPORT | completed | order-advance/* → treas → complete-from-verification-treasurer |
| refund | payment_refund_sent | POST refund/init → start → sent |
| shipment branch | completed | POST shipment/waiting from payment_sent → accept |

### Ветки

| Ветка | Результат |
|---|---|
| OCR F1 | readiness ok; stub+real PDF без prefill суммы (W1) |
| bank channel | 201 + channel=bank при Idempotency-Key |
| root cancel | канон: `PUT /manager/form-payment/{id}/cancel` → canceled_by_manager; `actions/root_cancel` 403 |
| treasurer | login OK; import advance + export paths OK |
| return-episode | API refund OK; **browser return** → W7 (`return-episode-*.spec.ts`) |

---

## Findings

### F1 — OCR: limitations / нет prefill суммы

- **Роль:** user  
- **Шаги:** wizard stub PDF → banner limitations; API real PDF `inv, pl 2026DTD(RU)01005.pdf` + extraction/start → invoice_amount остаётся ручным.  
- **Severity:** major  
- **Волна:** W1  
- **Закрытие (W1):** честный copy шага Документы / banner (без «подставятся сами»); degraded при empty/low-conf/fixture; mergeExtractionPrefill + line fallback; Docling confidence↑ при полях; `ocr-path-gate` green (3 e2e, real Euroled PDF).

### F2 — Default организация = Inline Org*, не seed «ООО Пример»

- **Severity:** major → **W2**

### F3 — Сброс org при смене CP

- select-path: orgKept=true. **note** / regression в W2.

### F5 — no_documents → 409 invoice required на accept

- **Severity:** major → **W3**

### F6 — Путаница Инвойс / Контракт на карточке

- **Severity:** major → **W4**

### F7 — Sticky «Создать заявку» на detail

- **Severity:** minor → **W4**

### F8 — ECO direct 403 при выключенном слоте

- **Severity:** note (continuity через manager).

### F9 — «контрагент не указан» на доработке после docs-reject

- **Severity:** major → **W4**

### F11 — root_cancel: имя действия vs канон

- `POST .../actions/root_cancel` → 403.  
- Канон scenarioverify: `PUT /api/v1/manager/form-payment/{id}/cancel` от root → **canceled_by_manager** (OK).  
- `POST .../actions/cancel` → canceled_by_user.  
- **Severity:** major (docs/UI root_cancel_form vs живой path) → **W5** (сверить FE action-bridge / docs, не ломать manager cancel).

### F12 — Bank без Idempotency-Key → 400

- **Severity:** note; с ключом 201 + channel badge payload OK.

---

## DoD сессии UAT (чеклист)

- [x] Журнал заполнен по spine + ≥3 типа заявок (8 combos + ladders)
- [x] Blocker/major имеют живой repro (F1–F2, F5–F7, F9, F11)
- [x] ≥1 волна-план (W1–W7)
- [x] Не утверждать «всё зелёное» UI всех ролей — закрытие UI → **W6**; browser лестницы/return → **W7**; OCR real PDF → **W1**

---

## Волны (привязка)

| Волна | Тема | Finding ids | Plan file |
|---|---|---|---|
| W1 | OCR wizard: prefills / **реальные PDF browser** / banner UX | F1 | `.cursor/plans/uat_w1_ocr_wizard_prefill.plan.md` |
| W2 | Гигиена org/CP pick | F2, F3 | `.cursor/plans/uat_w2_parties_hygiene.plan.md` |
| W3 | no_documents → gate инвойса до compliance | F5 | `.cursor/plans/uat_w3_no_docs_invoice_gate.plan.md` |
| W4 | Маппинг Инвойс/Контракт + sticky CTA + copy доработки | F6, F7, F9 | `.cursor/plans/uat_w4_card_field_labels.plan.md` |
| W5 | Root cancel docs/FE path vs manager cancel | F11 | `.cursor/plans/uat_w5_root_cancel.plan.md` |
| W6 | **Browser UI** Manager / ICO / ECO / Provider / Root / Treasurer | остаток UI ролей | `.cursor/plans/uat_w6_role_cabinets_browser.plan.md` |
| W7 | **Browser лестницы** postpay / export / refund / shipment + return | остаток UI ladders | `.cursor/plans/uat_w7_browser_ladders_return.plan.md` |
