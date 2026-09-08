# AGENTS.md

**Canonical agent instructions live in [`.cursor/rules/`](.cursor/rules)** (`alwaysApply`).

This file is a stub so tools that still look for `AGENTS.md` do not invent a second process.

| Topic | Rule |
|---|---|
| Workspace map / `перенос-среды` | `workspace-карта` |
| Plan vs rules | `планирование-сверка-с-rules`, `базовые-правила-инструмента` |
| Docker FE refresh (ask first) | `vdp-fe-docker-пересборка` |
| Local CI before push/PR | `vdp-ci-local-gate` |
| Management TG notify | `mgmt-tg-notify` |

Do not duplicate process here — edit the matching `.mdc` under `.cursor/rules`.
