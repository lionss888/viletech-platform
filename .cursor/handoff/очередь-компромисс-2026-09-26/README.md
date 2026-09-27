# Handoff: очередь (компромисс) + этот чат

Минимальный перенос: **без** полного `./перенос-среды/собрать.sh`.

## Статус на момент снимка

- Stage A (A1–A4) — **done**: forms.yaml Form + 4 path’а; shared openapi helper; httptest contract assert; docs/openapi.md + `ci-pr-fast`
- Карточка п.14 — done
- W2 / W4 / W5 как отдельные планы — **superseded** сводным планом (не исполнять по отдельности)
- **Next implement:** UAT cabinet hygiene (F2/F3/F6/F7/F9/F11)  
  `.cursor/plans/uat_cabinet_hygiene_2bc557a8.plan.md`
- Первый шаг того плана: архив прочих `.cursor/plans/*.plan.md` → `.cursor/plans/архив/` + эта очередь
- W7, Stage B, ops/alpha — later

Chat id / transcript: `ac80db37-0d65-4fe5-953d-15cb41e4282e`  
Файл истории: `chat-ac80db37.jsonl` (рядом с этим README)

## Очередь планов

1. **UAT cabinet hygiene** ← следующий implement  
   `.cursor/plans/uat_cabinet_hygiene_2bc557a8.plan.md`  
   Свод вместо W2+W4+W5. Scope: шум Inline Org / seed org first; смена CP не сбрасывает org; инвойс≠контракт на карточке; sticky create на detail; copy доработки docs-reject; root cancel draft рабочим path. Gate: `ci-main`. Сначала localhost repro.

2. Stage A (закрыт)  
   - A1–A4 и lean master — done (`api_contract_*`)

3. Later  
   - W7: `.cursor/plans/uat_w7_browser_ladders_return.plan.md`  
   - Stage B: B1/B2/B3  
   - Ops/alpha: `.cursor/plans/vdp_blockers_and_deploy_99106aff.plan.md`

Машиночитаемая очередь: `queue.json` (рядом). Старые W2/W4/W5 файлы ещё на диске до шага архива плана hygiene.

## Canvas (Handoff Queue)

Статусы **не** правятся вручную в canvas. Источник порядка: `queue.json`; done/next — из frontmatter todos планов.

```sh
make -C vdp sync-handoff-queue
```

Скрипт: `vdp/scripts/sync-handoff-queue-canvas.py`.

## На другой машине

1. `git pull` (handoff + Stage A + план `uat_cabinet_hygiene_2bc557a8`).
2. Открыть сводный план выше; не гонять отдельно W2/W4/W5.
3. Живой Composer-чат из `jsonl` сам не поднимется — новый чат с этим README / jsonl, либо `перенос-среды` если нужен тот же UI-чат.

Не запускайте `./перенос-среды/собрать.sh` ради этого handoff — он перезапишет весь `snapshot/`.
