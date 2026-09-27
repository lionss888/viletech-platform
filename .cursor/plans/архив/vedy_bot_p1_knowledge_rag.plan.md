---
name: Vedy P1 knowledge RAG
overview: "P1: knowledge corpus + cloud embeddings RAG + ContextPack в Cursor. Без локальных embedding-моделей."
todos:
  - id: p1-1-boundary
    content: "P1.1 internal/knowledge порты Ingest/Store/Embedder/Retriever"
    status: pending
  - id: p1-2-sources
    content: "P1.2 Адаптеры: files, dirs, thread, experience, VDP export"
    status: pending
  - id: p1-3-corpus
    content: "P1.3 Corpus layout + chunk + redaction"
    status: pending
  - id: p1-4-embed
    content: "P1.4 Cloud Embedder HTTP + vector index на диске"
    status: pending
  - id: p1-5-retrieve
    content: "P1.5 Retriever cosine + keyword boost → ContextPack"
    status: pending
  - id: p1-6-api-console
    content: "P1.6 API ingest/search/pack + консоль"
    status: pending
  - id: p1-7-gate
    content: "P1.7 Unit embed/retrieve + make test; честный fail без API key"
    status: pending
isProject: false
---

# P1 — Модуль знаний (RAG с cloud embeddings)

Родитель: [vedy_bot_master_knowledge_agent.plan.md](vedy_bot_master_knowledge_agent.plan.md).

**Решение:** embeddings **в scope P1**. Провайдер — облачный OpenAI-compatible HTTP (`INTAKE_EMBEDDING_URL`, `INTAKE_EMBEDDING_API_KEY`, `INTAKE_EMBEDDING_MODEL`). Локальные embedding LLM **вне scope**. Индекс векторов — локально в `INTAKE_HOME/knowledge/`.

## Цель

Владелец знаний для intake: артефакты + справочники + чат + VDP export → chunk → embed → retrieve → `ContextPack` в промпт Cursor.

## Сверка rules

**Обязательны:** `screaming-architecture`, `границы-и-контексты`, `детали-как-плагины`, `безопасность-ролей-и-данных`, `честность-готовности`, `go-testing`, `go-architecture`, `машинное-обучение`, `устойчивость-и-наблюдаемость` (таймаут/retry embed API).

**Вне scope P1:** local Ollama/GPU embed models, vendored AMG as runtime, TG auto (P2), HITL cutover (P3).

**QG:** `make test`; unit mock Embedder; manual ingest + search с реальным API key (или зафиксированный mock e2e); без ключа — error, не silent keyword-only «успех».

## Слои

| Слой | Содержание |
|---|---|
| UI | Knowledge: источники, ingest, search preview, citations |
| FE | Панель Knowledge |
| Домен | Document, Chunk, Embedding meta |
| API | ingest / search / pack |
| Unit | chunk, redact, cosine retrieve, embed client mock |
| E2E | smoke auth + pack; embed path с mock |
| Compose | env embedding + volume knowledge/ |
| Docs | Honesty: cloud embeddings required for RAG claim |

## Декомпозиция

### P1.1 Граница

- `internal/knowledge/`: ports `Ingester`, `Store`, `Embedder`, `Retriever`.
- FS + HTTP embed — адаптеры.

### P1.2 Источники

- files, dirs (allowlist), chat/thread, experience, VDP export (no shared DB).
- P1.2.1 VDP export contract (status map / docs / matrix — без ПДн заявок).
- P1.2.2 File loader + limits.
- P1.2.3 Chat/experience snapshot.
- P1.2.4 VDP adapter.

### P1.3 Corpus

- `knowledge/manifest.jsonl`, `docs/{id}/`, `vectors/` (или sqlite).
- Chunk by heading/size; stable ids; redact before embed.

### P1.4 Embedder (cloud)

- HTTP client OpenAI-compatible `/embeddings`.
- Batch embed on ingest; persist vector per chunk.
- Timeouts, retries with backoff; no key → `error` (честный фейл).
- Unit: mock server.

### P1.5 Retriever

- Query embed → top-N cosine similarity.
- Optional keyword/tag boost (secondary).
- `ContextPack{ Summary, Chunks, Citations, Scores }`; rune budget.
- Embed API down on query → error to caller (не подмена пустым «успехом»).

### P1.6 API + консоль

- Bearer endpoints; async ingest job status.
- UI citations when pack used in agent.

### P1.7 Gate

- Unit: ingest→embed(mock)→search hit; redact; no-key error.
- Wire: ask_agent `use_knowledge=1` includes pack.
- README: RAG = corpus + **cloud** embeddings; local models not claimed.

## DoD

- [ ] knowledge ports + cloud Embedder adapter
- [ ] ≥3 sources: file, chat, VDP/export
- [ ] Vectors persisted; retrieve by similarity
- [ ] ContextPack в agent prompt
- [ ] Нет ключа embed → явный error
- [ ] Redaction tests; `make test` зелёный
