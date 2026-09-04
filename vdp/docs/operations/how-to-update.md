# Как обновить и откатить VDP

Памятка для человека, который жмёт кнопку, а не собирает образы. Сборка всегда в GitHub Actions. На VM только промоут уже собранного digest. Help этого сценария выходит вместе с workflow волны 1.

## Каталог обновлений

После успешного workflow VDP Images появляется GitHub Release с именем VDP и тегом sha-XXXXXXX или vdp-v. В теле релиза перечислены digest контейнеров и номер run Images. Это и есть каталог: видно название обновления, можно выбрать его для выката.

Сборка с любой ветки: Actions, workflow VDP Images, Run workflow, поле ref равно имени ветки, тега или SHA.

## Обновить среду

Среда alpha. Назначение разработка и внутренняя проверка. Режим по умолчанию on_ready: после зелёного Images на main workflow VDP Deploy сам промоутит pin. Кнопка не нужна.

Среда beta. Назначение пред-прод. Режим по умолчанию button_or_window: либо Actions workflow VDP Deploy с environment beta, либо окно из GitHub Variable DEPLOY_WINDOW_BETA (UTC).

Среда gamma. Назначение прод. Режим только кнопка. Обязателен тег вида vdp-v и Environment required reviewers. Кнопка не собирает код заново: в поле images_run_id указывают run Images, который уже собрал этот тег. По желанию тот же digest уже стоит на beta.

Среда demo. Именованный слот заказчика, только dispatch.

Среда test. Именованный слот плюс PR-preview на той же VM. Preview: label preview на PR, URL вида pr-N.preview.vedy.io.

Запуск вручную: GitHub Actions, VDP Deploy, выбрать среду, при откате или конкретном составе заполнить images_run_id.

На хосте не использовать docker compose build и флаг --build.

Новая SQL-миграция в `core/migrations` или `hub/migrations`: достаточно merge и следующего VDP Deploy (или Images→Deploy). Promote всегда вызывает `compose-db-migrate` на существующих Postgres volumes; initdb при повторном up не срабатывает.

## Откат

Откат равен повторному выкату предыдущего pin. Найти более ранний GitHub Release или artifact release-images-pin, взять run id Images, запустить VDP Deploy с этим images_run_id. Подробности: [deploy-rollback.md](deploy-rollback.md).

## Расписание

Workflow VDP Deploy Schedule раз в час читает Variables DEPLOY_MODE_ALPHA, DEPLOY_MODE_BETA, DEPLOY_MODE_GAMMA, DEPLOY_MODE_DEMO, DEPLOY_MODE_TEST. Значения: on_ready (alpha уже закрыт workflow_run), button_or_window, button. Позже те же режимы задаёт консоль release-gate.

## Честность

После волны 1 поставка через GitHub рабочая. Своего UI консоли нет. GitLab CD нет. Шесть VM не считаются готовыми, пока на каждой не прогнан bootstrap-host.sh и не заданы секреты Environment.
