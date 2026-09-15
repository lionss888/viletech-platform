# Local QG: Deploy Secrets Check

## Проблема

Deploy workflows (GitHub Actions / GitLab CI) требуют секреты MGMT_NOTIFY_TOKEN + MGMT_NOTIFY_CHAT_ID для отправки уведомлений о статусе выката в management Telegram-чат. Без этих секретов deploy job падает на runtime-проверке.

До сих пор ошибка обнаруживалась только на CI после push с потерей времени на фикс и повторный прогон.

Теперь локальная проверка в ci-pr и release-gate пресекает проблему до push.

## Решение

### Новый скрипт проверки

Файл vdp/scripts/check-deploy-secrets.sh проверяет наличие MGMT_NOTIFY_TOKEN и MGMT_NOTIFY_CHAT_ID или их алиасов. Выходит с кодом 0 если секреты настроены. Выходит с кодом 1 и подробной инструкцией если секретов нет.

### Интеграция в Makefile

Добавлен target check-deploy-secrets встроенный в make ci-pr для PR-паритета и в make release-gate для pre-handover.

### Local QG Canvas

Файл local-qg.canvas.tsx в корне репозитория. Интерактивный UI для быстрого запуска gate-команд с кнопками.

Кнопка PR Gate (Full) запускает полный ci-pr.

Кнопка PR Gate (Fast) запускает без browser E2E.

Кнопка Release Gate запускает полный контур.

Кнопка Check Deploy Secrets запускает отдельную проверку секретов.

Секция с инструкциями по настройке секретов.

Запуск из Cursor Agent через промпт с упоминанием local-qg.canvas.tsx и текстом Local QG RUN.

## Настройка секретов

### Локально выбери один вариант

Вариант 1 приоритетный через файл ~/.vedy_bot/env.

```bash
echo "MGMT_NOTIFY_TOKEN=your_bot_token" >> ~/.vedy_bot/env
echo "MGMT_NOTIFY_CHAT_ID=your_chat_id" >> ~/.vedy_bot/env
```

Вариант 2 fallback через файл ~/.vdp-intake/env.

```bash
echo "TELEGRAM_INTAKE_TOKEN=your_bot_token" >> ~/.vdp-intake/env
echo "TELEGRAM_INTAKE_CHAT_IDS=your_chat_id" >> ~/.vdp-intake/env
```

Вариант 3 временно через shell session.

```bash
export MGMT_NOTIFY_TOKEN="your_bot_token"
export MGMT_NOTIFY_CHAT_ID="your_chat_id"
```

### В CI

Для GitHub Actions открой Repository Settings затем Secrets and variables затем Actions затем New repository secret.

Первый секрет с именем MGMT_NOTIFY_TOKEN и значением bot_token.

Второй секрет с именем MGMT_NOTIFY_CHAT_ID и значением chat_id.

Для GitLab CI открой Project Settings затем CI/CD затем Variables затем Add variable.

Первая переменная с ключом MGMT_NOTIFY_TOKEN значением bot_token и флагом Protected.

Вторая переменная с ключом MGMT_NOTIFY_CHAT_ID значением chat_id и флагом Protected.

## Получить токен и chat_id

### Создать Telegram-бота

Шаг 1. Открой https://t.me/BotFather

Шаг 2. Отправь команду /newbot

Шаг 3. Следуй инструкциям для указания имени бота и username

Шаг 4. Скопируй токен из ответа BotFather

### Получить chat_id

Шаг 1. Отправь любое сообщение боту например test

Шаг 2. Выполни запрос

```bash
curl https://api.telegram.org/bot<TOKEN>/getUpdates
```

Шаг 3. Найди "chat":{"id":<chat_id>} в ответе

Шаг 4. Скопируй значение chat_id которое может быть отрицательным для групп

### Добавить бота в групповой чат опционально

Если management-чат это группа то выполни следующие шаги.

Шаг 1. Добавь бота в группу

Шаг 2. Дай боту права на отправку сообщений

Шаг 3. Отправь любое сообщение в группу

Шаг 4. Получи chat_id через /getUpdates который будет отрицательным

## Использование

### Проверка перед push/PR

```bash
cd vdp
make ci-pr
```

Команда включает check-deploy-secrets.

### Отдельная проверка

```bash
cd vdp
make check-deploy-secrets
```

### Вывод при успехе

```
✅ Management notify secrets configured (token: 8910940409..., chat: -1004449173165)
```

### Вывод при отсутствии секретов

```
❌ Management notify secrets missing (required for deploy)

Deploy workflows (GitHub Actions / GitLab CI) require MGMT_NOTIFY_TOKEN + MGMT_NOTIFY_CHAT_ID
to send deployment status notifications. Without these, deploy jobs will fail at runtime.

Fix (choose one):
...
```

## Обновлённые правила

Правило .cursor/rules/vdp-ci-local-gate.mdc обновлено.

Добавлена секция Deploy secrets check (MUST).

Targets ci-pr и release-gate теперь включают check-deploy-secrets.

Анти-паттерн пушить в main/PR без проверки deploy secrets.

## Связанные файлы

Скрипт проверки в vdp/scripts/check-deploy-secrets.sh

Target check-deploy-secrets и интеграция в ci-pr и release-gate в vdp/Makefile

UI для запуска gate-команд в local-qg.canvas.tsx

Обновлённое правило в .cursor/rules/vdp-ci-local-gate.mdc

CI workflow с runtime-проверкой секретов в .github/workflows/vdp-deploy.yml

GitLab CI с аналогичной проверкой в .gitlab-ci.yml

## Часто задаваемые вопросы

### Нужно ли настраивать секреты если не деплою

Да. ci-pr проверяет секреты локально чтобы гарантировать что ваш коммит не сломает deploy других людей или CI.

### Можно ли использовать один токен для всех

Да можно настроить командный бот и chat_id. Главное чтобы все члены команды имели доступ к этому боту и чату.

### Что если у меня несколько проектов

Секреты привязаны к env-файлу ~/.vedy_bot/env или ~/.vdp-intake/env. Если проекты требуют разные боты используй переменную MGMT_NOTIFY_ENV_FILE для переключения.

### Как проверить что секреты правильно настроены

Запусти make check-deploy-secrets и увидишь либо успех с маскированными значениями либо ошибку с инструкциями.

### Можно ли отключить проверку для локальной разработки

Нет. Проверка часть gate перед push чтобы не допустить падение CI deploy. Настрой секреты один раз они не мешают локальной работе.
