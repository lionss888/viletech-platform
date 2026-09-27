# Handoff: очередь (компромисс) + этот чат

Минимальный перенос: **без** полного `./перенос-среды/собрать.sh`.

## Статус на момент снимка

- Stage A (A1–A4) — done (планы в `.cursor/plans/архив/`)
- UAT cabinet hygiene (W2+W4+W5) — **done** (`ci-main` green)
- Прочие планы (~228) — в `.cursor/plans/архив/`
- Next: UAT W7 browser ladders (архив)

Chat id / transcript: `ac80db37-0d65-4fe5-953d-15cb41e4282e`  
Файл истории: `chat-ac80db37.jsonl`

## Очередь

1. **UAT W7** ← next  
   `.cursor/plans/архив/uat_w7_browser_ladders_return.plan.md`

2. Later  
   - Stage B, ops/alpha — см. `queue.json`

## Canvas

```sh
make -C vdp sync-handoff-queue
```

## На другой машине

1. `git pull`
2. Next = W7 из архива (или вернуть план в `.cursor/plans/` при старте)
3. Composer-чат из jsonl сам не поднимается

Не запускайте `./перенос-среды/собрать.sh` ради этого handoff.
