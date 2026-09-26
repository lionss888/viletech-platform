# Handoff: очередь (компромисс) + этот чат

Минимальный перенос: **без** полного `./перенос-среды/собрать.sh`.

## Статус на момент снимка

- A1 (`forms.yaml` schemas) — реализован в коде: `vdp/shared/openapi/forms.yaml`
- Дальше по очереди: карточка п.14, затем Stage A (A2→A4), UAT W2/W4/W5
- W7 и Stage B — позже; deploy/ops — не в ежедневной очереди

Chat id / transcript: `ac80db37-0d65-4fe5-953d-15cb41e4282e`  
Файл истории: `chat-ac80db37.jsonl` (рядом с этим README)

## Очередь планов

1. Карточка, п.14  
   `.cursor/plans/карточка_без_прочерков_e874f6dc.plan.md`

2. Контракт Stage A  
   - мастер: `.cursor/plans/api_contract_lean_master.plan.md`  
   - A1: `.cursor/plans/api_contract_a1_forms_yaml.plan.md`  
   - A2: `.cursor/plans/api_contract_a2_schema_helper.plan.md` ← следующий implement  
   - A3: `.cursor/plans/api_contract_a3_httptest.plan.md`  
   - A4: `.cursor/plans/api_contract_a4_docs_qg.plan.md`

3. UAT точечно (после repro)  
   - W2: `.cursor/plans/uat_w2_parties_hygiene.plan.md`  
   - W4: `.cursor/plans/uat_w4_card_field_labels.plan.md`  
   - W5: `.cursor/plans/uat_w5_root_cancel.plan.md`

4. Ops / alpha — не в ежедневной очереди  
   `.cursor/plans/vdp_blockers_and_deploy_99106aff.plan.md`

5. W7 — отдельный день  
   `.cursor/plans/uat_w7_browser_ladders_return.plan.md`

6. Stage B — после A, по желанию  
   - B1: `.cursor/plans/api_contract_b1_golden.plan.md`  
   - B2: `.cursor/plans/api_contract_b2_vitest.plan.md`  
   - B3: `.cursor/plans/api_contract_b3_docs_qg.plan.md`

Сводка: `.cursor/plans/live_backlog_after_status_sync.plan.md`

## На другой машине

1. `git pull` (нужен коммит этого handoff + `forms.yaml`, если ещё не в remote).
2. Планы уже в `.cursor/plans/` — открывайте по ссылкам выше.
3. Живой Composer-чат Cursor **не** восстановится сам из `jsonl`. Варианты:
   - новый чат: «продолжи с handoff `.cursor/handoff/очередь-компромисс-2026-09-26/`» и приложите `README.md` / `chat-ac80db37.jsonl`;
   - либо полный/частичный merge через `перенос-среды` (если позже понадобится именно тот же UI-чат).

Не запускайте `./перенос-среды/собрать.sh` ради этого handoff — он перезапишет весь `snapshot/`.
