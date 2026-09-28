# Handoff: очередь (компромисс) + этот чат

Минимальный перенос: **без** полного `./перенос-среды/собрать.sh`.

## Статус на момент снимка

- Stage A (A1–A4) — done (планы в `.cursor/plans/архив/`)
- UAT cabinet hygiene (W2+W4+W5) — **done** (`ci-main` green)
- UAT feedback 2026-09-27 — **7 планов** F1–F7 в `.cursor/plans/uat_f*.plan.md`
- Прочие планы — в `.cursor/plans/архив/`
- UAT F1 — **done** (`ci-pr-pilot`)
- UAT F2 — **done** (`ci-pr-pilot`; код/gate; plan.md не правился по инструкции)
- Next: **UAT F3** counterparty verify

Chat id / transcript: `ac80db37-0d65-4fe5-953d-15cb41e4282e`  
Файл истории: `chat-ac80db37.jsonl`

## Очередь (daily)

1. UAT F1 — done — `.cursor/plans/uat_f1_api_session.plan.md`
2. UAT F2 — done — `uat_f2_submit_docs.plan.md`
3. **UAT F3** ← next — `uat_f3_cp_verify.plan.md`
4. UAT F4 — `uat_f4_delete_confirm.plan.md`
5. UAT F5 — `uat_f5_no_dashes.plan.md`
6. UAT F6 — `uat_f6_receipt_cta.plan.md`
7. UAT F7 — `uat_f7_provider_closed.plan.md`

Later: UAT W7, Stage B, ops/alpha — см. `queue.json`

## Canvas

```sh
make -C vdp sync-handoff-queue
```

## На другой машине

1. `git pull`
2. Next = F1 из `.cursor/plans/uat_f1_api_session.plan.md`
3. Composer-чат из jsonl сам не поднимается

Не запускайте `./перенос-среды/собрать.sh` ради этого handoff.
