import {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  Row,
  Stack,
  Text,
  useCanvasAction,
} from "cursor/canvas";

const RUN =
  "Local QG RUN — это кнопка запуска, не просьба обсудить. Выполни без вопросов. Shell: первый и единственный вызов сразу с required_permissions: [\"all\"] (без sandbox). Не делай пробный запуск в readonly sandbox. Не спрашивай разрешение на снятие sandbox. Не коммить и не пушь. FE Docker (compose-fe-refresh) не запускай без явного «да» в этом чате. Красный → не утверждай готовность; коротко, простым языком, что сломалось и что открыть. Зелёный → коротко: прошло.";

const PRECOMMIT_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make precommit-gate. Это тот же слой, что GitHub Desktop при Commit: версии программ, оформление текстов, автоматические проверки кода.`;

const PILOT_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make ci-pr-pilot. Это проверка перед публикацией на GitHub: код, тексты, поднятие локальной среды и проход сценариев в браузере по заявке (включая длинную лестницу ролей).`;

const SMOKE_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make ci-pr. Это короткая проверка с браузером (несколько ключевых сценариев). Если меняли экраны заявки, кнопки ролей или файлы e2e — этого мало, нужен ci-pr-pilot.`;

const NO_BROWSER_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make ci-pr-fast. Без открытия браузера: правила текстов, мелкие проверки кода и сервисов. Не проверяет, что человек может нажать кнопки в кабинете.`;

const BROWSER_ONLY_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make playwright-e2e. Только сценарии в браузере (вход, заявка, роли). Нужна уже поднятая локальная среда (Docker). Не проверяет оформление текстов и не гоняет всю лестницу ролей.`;

const DOCS_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make docs-format-check. Только оформление документов: без таблиц, списков и выделения в операционных текстах.`;

const ENV_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make check-env-parity. Проверь, что на этой машине та же версия Node, что в проекте. Если нет — скажи, что сделать (nvm use / mise), без установки пакетов без спроса.`;

const SECRETS_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make check-deploy-secrets. Проверь, может ли компьютер отправить служебное сообщение о выкате. Не печатай токены и секреты. Если нет — объясни простым языком, какой файл создать, без значений.`;

const COMMENTS_PROMPT = `Local QG — комментирование кода. Это не make-gate. Не коммить и не пушь.

Посмотри незакоммиченные правки (git status, git diff). Добавь комментарии только там, где без них не понять смысл для следующего человека:
- публичные функции и типы: JSDoc (TypeScript) или GoDoc;
- неочевидное правило домена (роль, статус, деньги) — одно короткое предложение «почему»;
- не комментируй очевидное (setX, return err);
- не пиши новые markdown-файлы и не трогай чужой код вне diff.
В конце: список файлов и что пояснил.`;

const TRIAGE_PROMPT = `Local QG — подскажи проверку. Не запускай тесты, пока человек не нажмёт другую кнопку.

По git status и git diff скажи простым языком:
1. Что менялось (экраны, правила заявки, тексты, только план).
2. Какую кнопку нажать в Local QG (перед коммитом / без браузера / с браузером / документация / лестница).
3. Почему именно её, одной фразой.
Не коммить. Не пушь. Не запускай make.`;

export default function LocalQG() {
  const dispatch = useCanvasAction();

  return (
    <Stack gap={24} style={{ padding: 24, maxWidth: 720 }}>
      <Stack gap={6}>
        <H1>Контроль качества</H1>
        <Text tone="secondary">
          Нажмите кнопку — агент сам запустит проверку и напишет, прошло или нет.
          Команды знать не нужно. Не коммитит и не публикует сам.
        </Text>
      </Stack>

      <Callout tone="info" title="Сначала коммит, потом GitHub">
        GitHub Desktop при Commit уже гоняет короткий слой. Кнопка ниже — то же
        самое заранее, чтобы ошибка была в чате, а не в окне «Commit failed».
        Перед отправкой ветки на GitHub — «Лестница заявки».
      </Callout>

      <Stack gap={8}>
        <H2>1. Перед коммитом</H2>
        <Text tone="secondary" size="small">
          То же, что при Commit в GitHub Desktop: версии программ на компьютере,
          тексты без запрещённой разметки, автоматические проверки кода. Если
          красное — коммит отклонят. ~2–5 мин.
        </Text>
        <Button
          onClick={() =>
            dispatch({ type: "newComposerChat", userPrompt: PRECOMMIT_PROMPT })
          }
        >
          Проверить перед коммитом
        </Button>
      </Stack>

      <Divider />

      <Stack gap={8}>
        <H2>2. Перед отправкой на GitHub</H2>
        <Text tone="secondary" size="small">
          Меняли экраны заявки, кнопки ролей, мастер, курс/комиссию или проверки в
          браузере — эта кнопка. Иначе GitHub может покраснеть, даже если коммит
          прошёл. ~15–25 мин.
        </Text>
        <Button
          onClick={() =>
            dispatch({ type: "newComposerChat", userPrompt: PILOT_PROMPT })
          }
        >
          Лестница заявки
        </Button>
        <Text tone="tertiary" size="small">
          Короче (несколько сценариев в браузере, не вся лестница):
        </Text>
        <Button
          variant="secondary"
          onClick={() =>
            dispatch({ type: "newComposerChat", userPrompt: SMOKE_PROMPT })
          }
        >
          Короткая проверка с браузером
        </Button>
      </Stack>

      <Divider />

      <H2>3. Частичные проверки</H2>
      <Text tone="secondary" size="small">
        Когда правили только часть и не хотите ждать четверть часа.
      </Text>

      <Grid columns={2} gap={12}>
        <Card>
          <CardHeader>Без браузера</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text tone="secondary" size="small">
                Проверяет тексты и внутренние правила (статусы, роли, расчёты).
                Не открывает кабинет. Подходит, если меняли только логику или
                документы, не кнопки на экране. ~2–3 мин.
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({
                    type: "newComposerChat",
                    userPrompt: NO_BROWSER_PROMPT,
                  })
                }
              >
                Запустить
              </Button>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>С браузером</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text tone="secondary" size="small">
                Робот заходит в кабинеты как пользователь: вход, заявка,
                действия ролей. Нужна уже запущенная локальная среда. Не
                проверяет оформление документов. ~1–8 мин.
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({
                    type: "newComposerChat",
                    userPrompt: BROWSER_ONLY_PROMPT,
                  })
                }
              >
                Запустить
              </Button>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Документация</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text tone="secondary" size="small">
                Смотрит, что в рабочих текстах нет таблиц, списков и «жирного»
                оформления — иначе публикация на GitHub падает. ~10 сек.
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({ type: "newComposerChat", userPrompt: DOCS_PROMPT })
                }
              >
                Запустить
              </Button>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Комментарии в коде</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text tone="secondary" size="small">
                Агент подпишет ваши незакоммиченные правки короткими пояснениями
                (зачем правило, а не «что делает строка»). Тесты не запускает.
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({
                    type: "newComposerChat",
                    userPrompt: COMMENTS_PROMPT,
                  })
                }
              >
                Пояснить правки
              </Button>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <Divider />

      <H2>Помощники</H2>
      <Grid columns={2} gap={12}>
        <Card>
          <CardHeader>Что мне запустить</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text tone="secondary" size="small">
                Смотрит, какие файлы вы меняли, и называет одну кнопку выше.
                Ничего не гоняет.
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({ type: "newComposerChat", userPrompt: TRIAGE_PROMPT })
                }
              >
                Подсказать
              </Button>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Версии на компьютере</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text tone="secondary" size="small">
                Часто коммит падает сразу: другая версия Node. Эта кнопка
                проверяет совпадение с проектом. ~5 сек.
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({ type: "newComposerChat", userPrompt: ENV_PROMPT })
                }
              >
                Проверить
              </Button>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Сообщение о выкате</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text tone="secondary" size="small">
                На сервере после выката должно уйти служебное сообщение в чат.
                Если ключей нет — выкат на GitHub может упасть в конце.
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({ type: "newComposerChat", userPrompt: SECRETS_PROMPT })
                }
              >
                Проверить
              </Button>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <Card collapsible defaultOpen={false}>
        <CardHeader>Как выбрать (если сомневаетесь)</CardHeader>
        <CardBody>
          <Stack gap={8}>
            <Text size="small">
              Сейчас жмёте Commit в GitHub Desktop — «Проверить перед коммитом».
            </Text>
            <Text size="small">
              Меняли кнопки, мастер заявки, роли, курс — «Лестница заявки» до
              push.
            </Text>
            <Text size="small">
              Меняли только текст инструкции — «Документация».
            </Text>
            <Text size="small">
              Не знаете — «Что мне запустить».
            </Text>
          </Stack>
        </CardBody>
      </Card>

      <Row justify="center">
        <Text tone="quaternary" size="small">
          Кнопка = запуск. Агент не публикует сам.
        </Text>
      </Row>
    </Stack>
  );
}
