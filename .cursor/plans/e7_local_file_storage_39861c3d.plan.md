---
name: E7 Local file storage
overview: Локальное объектное хранилище (MinIO в compose) + env/start-local, чтобы PDF upload из E2 реально сохранялся и читался без внешнего S3.
todos:
  - id: e7-minio-compose
    content: MinIO (+ bucket init) в docker-compose; volume; порт для S3 API
    status: completed
  - id: e7-env-start
    content: S3_* в .env.example + start-local.sh; smoke upload PDF
    status: completed
  - id: e7-qa
    content: "QA gate E7: upload → Mongo file id → get/preview; LIFECYCLE/NOTES"
    status: completed
isProject: false
---

# E7 — Локальное хранение файлов (MinIO)

## Зависимость

После E1–E6 (upload UI уже есть). Блокер честного DoD по итогам ручного QA.

## Цель

Оператор загружает PDF в UI; байты реально лежат в локальном object storage; file id в Mongo валиден для последующих CTA.

## Строгий критерий

`POST /file-store/upload/pdf` → 201 + `_id`; повторное открытие/превью не падает; Nest без WARN «S3 configuration is missing» на стенде `start-local`.

## Scope

- Добавить **MinIO** в [`docker-compose.yml`](fe-experiment/backend-for-ved/docker-compose.yml) (S3-compatible API + volume); init-bucket `fea360` (или имя из env)
- Прописать `S3_ENDPOINT`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `BUCKET_NAME`, region в [`.env.example`](fe-experiment/backend-for-ved/.env.example) и [`start-local.sh`](fe-experiment/start-local.sh) под compose-сеть/`127.0.0.1`
- Не менять контракт [`S3Service`](fe-experiment/backend-for-ved/src/lib/modules/s3/s3.service.ts) / File API — только инфраструктура + конфиг (детали как плагин к уже выбранному S3-порту)
- Smoke: скрипт или шаг в README — login User → upload pdf → assert file document
- Обновить [`LIFECYCLE.md`](fe-experiment/LIFECYCLE.md) / [`NOTES.md`](fe-experiment/NOTES.md) gate E7; [`README.md`](fe-experiment/README.md) — MinIO в быстром старте

## Вне

Перепись FileService на filesystem; Diadoc; прод-KMS; E8 поля заявки.

## Правила

- `развертывание-и-доставка`, `devops-культура` — воспроизводимый стенд
- `безопасность-ролей-и-данных` — ACL файлов без утечки в логи
- `устойчивость-и-наблюдаемость` — явный fail upload, не тихий stub
- `правила-построения` — проверка после реализации

## Проверка стабильности и качества

1. `./start-local.sh` поднимает MinIO; Nest стартует с валидным S3 client
2. UI/API upload PDF → ObjectId файла; object есть в bucket
3. Lifecycle CTA с `requiresFileUpload` (E2) завершается без «Failed to upload file»
4. Нет ПДн/секретов в логах upload
5. Самопроверка: путь upload совпадает с существующим `/file-store/upload/pdf`
