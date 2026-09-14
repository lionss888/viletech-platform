# Setup GitHub Deploy Secrets

## Быстрый старт

```bash
# 1. Создай Personal Access Token (один раз)
# https://github.com/settings/tokens/new
# Scopes: repo (full), admin:org (manage environments)

# 2. Запусти скрипт
cd vdp
GITHUB_TOKEN="ghp_your_token_here" ./scripts/setup-github-deploy-secrets.sh
```

## Что делает скрипт

Автоматически настраивает секреты для всех environments deploy.

Environment alpha требует секреты MGMT_NOTIFY_TOKEN и MGMT_NOTIFY_CHAT_ID.

Environment beta требует секреты MGMT_NOTIFY_TOKEN и MGMT_NOTIFY_CHAT_ID.

Environment gamma требует секреты MGMT_NOTIFY_TOKEN и MGMT_NOTIFY_CHAT_ID.

Environment demo требует секреты MGMT_NOTIFY_TOKEN и MGMT_NOTIFY_CHAT_ID.

Environment test требует секреты MGMT_NOTIFY_TOKEN и MGMT_NOTIFY_CHAT_ID.

## Шаг за шагом

### Создать GitHub Personal Access Token

Шаг 1. Открой https://github.com/settings/tokens/new

Шаг 2. В поле Note укажи VDP Deploy Secrets Setup

Шаг 3. В поле Expiration выбери 30 days или больше

Шаг 4. В секции Scopes отметь repo для Full control of private repositories

Шаг 5. В секции Scopes отметь admin:org затем write:org для Manage organization settings

Шаг 6. Нажми Generate token и скопируй токен в безопасное место

### Запустить скрипт

```bash
cd /Users/levpogosov/Downloads/viletech-platform/vdp

# Вариант 1: экспорт в сессию
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
./scripts/setup-github-deploy-secrets.sh

# Вариант 2: одной строкой
GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  ./scripts/setup-github-deploy-secrets.sh
```

### Проверить результат

Проверка в GitHub UI.

Шаг 1. Открой Repository затем Settings затем Environments

Шаг 2. Открой environment например alpha

Шаг 3. Environment secrets должны содержать MGMT_NOTIFY_TOKEN и MGMT_NOTIFY_CHAT_ID

Тестовый deploy.

Шаг 1. Открой Actions затем VDP Deploy затем Run workflow

Шаг 2. Выбери environment alpha

Шаг 3. Поле images_run_id оставь пустым

Шаг 4. Нажми Run workflow

Ожидание в Telegram уведомления о выкате в alpha.

## Требования

### Python packages

```bash
pip3 install pynacl
```

Скрипт попытается установить автоматически если не найдёт.

### GitHub CLI опционально

```bash
brew install gh
gh auth login
```

Если gh установлен можно проверить секреты через команду gh secret list --env alpha.

## Ручная настройка альтернатива скрипту

### Через GitHub UI

Шаг 1. Repository затем Settings затем Environments

Шаг 2. Выбери environment например alpha

Шаг 3. Environment secrets затем Add secret

Шаг 4. Добавь первый секрет MGMT_NOTIFY_TOKEN со значением 8910940409:AAFj1czFdevhKv4gZegrAy1Sl_N9qhQHr5w

Шаг 5. Добавь второй секрет MGMT_NOTIFY_CHAT_ID со значением -1004449173165

Шаг 6. Повтори для всех environments beta gamma demo test

## Troubleshooting

### PyNaCl not installed

```bash
pip3 install pynacl --user
```

### HTTP 404 Environment not found

Скрипт создаст environment автоматически. Если ошибка повторяется выполни создание вручную.

Шаг 1. Repository затем Settings затем Environments затем New environment

Шаг 2. В поле Name укажи alpha или другое имя

Шаг 3. Запусти скрипт снова

### HTTP 403 Forbidden

Токен без нужных прав. Проверь scopes repo и admin:org с правом write:org.

### HTTP 422 Validation failed

Секрет уже существует. Это норма скрипт обновит значение.

## Секреты

Значение MGMT_NOTIFY_TOKEN это Telegram Bot Token 8910940409:AAFj1czFdevhKv4gZegrAy1Sl_N9qhQHr5w

Значение MGMT_NOTIFY_CHAT_ID это Telegram Chat ID -1004449173165

Telegram Channel доступен по адресу https://t.me/+XAl4Vq3otV81YzVi

## После настройки

### Локальная проверка

```bash
cd vdp
make check-deploy-secrets
```

Вывод при успехе Management notify secrets configured с маскированными значениями token и chat.

### CI проверка

После push в main запускается VDP Images затем VDP Deploy для alpha.

При успешном deploy приходит уведомление о выкате в alpha в Telegram.

При сбое deploy приходит предупреждение о проблеме выката в alpha в Telegram.

Если уведомление не пришло проверь следующее.

Проверка 1. Секреты в environment alpha через GitHub UI

Проверка 2. Логи deploy job через Actions затем VDP Deploy затем последний run затем deploy затем Notify management

Проверка 3. Ошибка required but token/chat not configured означает что секреты не настроены

## Связанные файлы

Скрипт настройки в vdp/scripts/setup-github-deploy-secrets.sh

Скрипт локальной проверки в vdp/scripts/check-deploy-secrets.sh

Скрипт отправки уведомлений в vdp/scripts/notify-mgmt.sh

Deploy workflow в .github/workflows/vdp-deploy.yml

Правило локального gate в .cursor/rules/vdp-ci-local-gate.mdc

Правило TG уведомлений в .cursor/rules/mgmt-tg-notify.mdc

## FAQ

### Нужно ли настраивать секреты для каждого environment

Да. Каждый environment alpha beta gamma demo test должен иметь свои секреты. Скрипт настраивает все за один запуск.

### Можно ли использовать разные боты для разных environments

Да. Отредактируй скрипт или настрой вручную через GitHub UI. Пример конфигурации: alpha использует production bot, beta и gamma используют staging bot, demo и test используют development bot.

### Что если токен истечёт

Personal Access Token из шага 1 временный для настройки. После того как секреты созданы в GitHub этот токен можно удалить. Telegram bot token в секретах постоянный пока не отозван в @BotFather.

### Как обновить секреты после смены бота

Запусти скрипт снова с новыми значениями MGMT_TOKEN и MGMT_CHAT_ID в скрипте либо обнови вручную через GitHub UI.
