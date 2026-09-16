# Комбаин: провязка локального QG на другой macOS-машине

Первичный слой при Commit (CLI, GitHub Desktop, Cursor): git hooks из `.githooks` → `check-env-parity` → `docs-format-check` + `make test`. На fail — TG в mgmt-чат (если настроен токен). Это не заменяет `make ci-pr` / `ci-pr-pilot`.

## Состав

machine.profile.toml — версии и карта gate.

env.mgmt.notify.example — шаблон `~/.vedy_bot/env` (без реальных секретов).

path-bootstrap.sh — PATH для GUI (Homebrew, nvm, mise, Go).

apply-macos.sh — применить хуки на машине.

verify.sh — проверить провязку без полного `make test`.

## Применение на новой машине

1. Клонировать репозиторий, открыть корень `viletech-platform`.

2. Установить toolchain: Node = содержимое `vdp/fe/.nvmrc` (сейчас 22.17.0), Go >= 1.22, `make` (Xcode CLT или Homebrew).

3. Применить провязку:

```sh
bash "инструменты/комбаин_провязка_машин/apply-macos.sh" --gui-wrappers --with-notify-env
```

`--gui-wrappers` нужен, если коммитите из GitHub Desktop (GUI не видит PATH из zshrc). Без флага — `core.hooksPath=.githooks`, как `make -C vdp install-git-hooks`.

4. Вписать токен и chat id в `~/.vedy_bot/env` (chmod 600). Без токена gate всё равно блокирует плохой коммит; просто не будет TG на fail.

5. Проверить:

```sh
bash "инструменты/комбаин_провязка_машин/verify.sh"
```

6. Опционально полный симулятор хука: `make -C vdp precommit-gate`.

7. Панель кнопок в Cursor (без команд): скопировать `local-qg.canvas.tsx` из корня репо в папку canvases проекта Cursor. Открыть canvas Local QG. Кнопка «Проверить перед коммитом» = тот же слой, что GitHub Desktop. Перед push по заявке — «Лестница заявки».

## Что увидите при Commit

Слой 1: Node должен совпадать с `.nvmrc`, иначе fail сразу.

Слой 2: `docs-format-check` — ops/docs без списков, bold, backticks, fence (кроме `docs/development/`).

Слой 3: `make test` по Go-модулям vdp.

Если в диалоге «Commit failed» внизу `notify-mgmt: ok` — gate упал раньше; прокрутите вывод вверх к `FAIL` / `docs-format-check`.

## Лестница после коммита

Перед push/PR: `make -C vdp ci-pr`. Если трогали `vdp/fe/e2e/**` или pilot-matrix / ActionPanel / formpayment — `make -C vdp ci-pr-pilot`.

Канон: `.cursor/rules/vdp-ci-local-gate.mdc`.
