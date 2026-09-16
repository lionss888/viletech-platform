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

const PILOT_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make ci-pr-pilot. Это проверка перед публикацией на GitHub: код, тексты, поднятие локальной среды и проход сценариев в браузере по заявке (включая длинную лестницу ролей и Pilot Robot Matrix).`;

const SMOKE_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make ci-pr. Это короткая проверка с браузером (несколько ключевых сценариев). Если меняли экраны заявки, кнопки ролей или файлы e2e — этого мало, нужен ci-pr-pilot.`;

const NO_BROWSER_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make ci-pr-fast. Без открытия браузера: правила текстов, мелкие проверки кода и сервисов. Не проверяет, что человек может нажать кнопки в кабинете.`;

const BROWSER_ONLY_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make playwright-e2e. Только сценарии в браузере (вход, заявка, роли). Нужна уже поднятая локальная среда (Docker). Не проверяет оформление текстов и не гоняет всю лестницу ролей.`;

const DOCS_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make docs-format-check. Только оформление документов: без таблиц, списков и выделения в операционных текстах.`;

const ENV_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make check-env-parity. Проверь, что на этой машине та же версия Node, что в проекте. Если нет — скажи, что сделать (nvm use / mise), без установки пакетов без спроса.`;

const SECRETS_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make check-deploy-secrets. Проверь, может ли компьютер отправить служебное сообщение о выкате. Не печатай токены и секреты. Если нет — объясни простым языком, какой файл создать, без значений.`;

const COMPOSE_UP_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make compose-up. Подними локальную среду (Docker). В конце коротко: поднялось или нет (по make compose-ps / health). Не трогай FE deps (compose-fe-refresh) без явного «да».`;

const ROBOT_BOTH_PROMPT = `${RUN} Pilot Robot Matrix — оба робота по очереди. Нужна уже поднятая среда (если нет — сначала make compose-up). Выполни строго по порядку, без обсуждения:
1) cd vdp && make compose-e2e
2) cd vdp && make playwright-pilot-matrix
Пакет данных: VDP_ROBOT_FIXTURE_PACK по умолчанию template (не переключай на customer, пока pack не ready). Красный на шаге 1 — шаг 2 не гоняй; скажи, что упало.`;

const ROBOT_LOGIC_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make compose-e2e. Это робот логики Pilot Robot Matrix: сценарии заявки через API (без кликов в кабинете). Нужна уже поднятая среда (make compose-up).`;

const ROBOT_CABINET_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make playwright-pilot-matrix. Это робот кабинетов Pilot Robot Matrix: клики по лестнице ролей в браузере (@pilot-matrix). Нужна уже поднятая среда. Пакет данных: VDP_ROBOT_FIXTURE_PACK=template по умолчанию; customer только если pack уже imported и status=ready.`;

const ROBOT_MATRIX_CHECK_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make robot-matrix-check. Быстрая проверка, что файлы матрицы и слоты фикстур на месте (без прогона сценариев). ~секунды.`;

const RELEASE_GATE_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make release-gate. Полный Local QG перед передачей/тегом: unit, compose-e2e, браузер, Pilot Robot Matrix. Долго. Не путать с «лестницей» перед push.`;

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
2. Какую кнопку нажать в Local QG (перед коммитом / без браузера / с браузером / документация / лестница / Pilot Robot Matrix).
3. Почему именно её, одной фразой.
Не коммить. Не пушь. Не запускай make.`;

export default function LocalQG() {
  const dispatch = useCanvasAction();

  return (
    <Stack gap={24} style={{ padding: 24, maxWidth: 720 }}>
      <Stack gap={6}>
        <H1>Local QG</H1>
        <Text tone="secondary">
          Локальный контроль качества. Нажмите кнопку — агент сам запустит
          проверку и напишет, прошло или нет. Команды знать не нужно. Не
          коммитит и не публикует сам.
        </Text>
      </Stack>

      <Callout tone="info" title="Сначала коммит, потом GitHub">
        GitHub Desktop при Commit уже гоняет короткий слой. Кнопка ниже — то же
        самое заранее, чтобы ошибка была в чате, а не в окне «Commit failed».
        Перед отправкой ветки на GitHub — «Лестница заявки». Роботы матрицы —
        отдельный блок ниже, когда нужно проверить путь заявки без полного PR
        gate.
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

      <Stack gap={8}>
        <H2>3. Pilot Robot Matrix</H2>
        <Text tone="secondary" size="small">
          Роботы матрицы: сначала логика заявки (API), затем клики в кабинетах.
          Нужна поднятая локальная среда. Данные по умолчанию — учебный пакет
          template (не данные заказчика).
        </Text>
        <Button
          onClick={() =>
            dispatch({ type: "newComposerChat", userPrompt: ROBOT_BOTH_PROMPT })
          }
        >
          Запустить обоих роботов
        </Button>
      </Stack>

      <Grid columns={2} gap={12}>
        <Card>
          <CardHeader>Робот логики</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text tone="secondary" size="small">
                Прогоняет сценарии матрицы через API: статусы, роли, переходы.
                Без открытия кабинетов. ~2–5 мин.
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({
                    type: "newComposerChat",
                    userPrompt: ROBOT_LOGIC_PROMPT,
                  })
                }
              >
                Запустить
              </Button>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Робот кабинетов</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text tone="secondary" size="small">
                Кликает лестницу ролей в браузере (метки @pilot-matrix). Нужен
                уже поднятый Docker. ~5–15 мин.
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({
                    type: "newComposerChat",
                    userPrompt: ROBOT_CABINET_PROMPT,
                  })
                }
              >
                Запустить
              </Button>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Поднять среду</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text tone="secondary" size="small">
                Docker compose-up. Делайте перед роботами, если стенд ещё не
                запущен.
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({
                    type: "newComposerChat",
                    userPrompt: COMPOSE_UP_PROMPT,
                  })
                }
              >
                Поднять
              </Button>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Файлы матрицы</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text tone="secondary" size="small">
                Быстро: на месте ли список сценариев и слоты фикстур. Сценарии
                не гоняет. ~секунды.
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({
                    type: "newComposerChat",
                    userPrompt: ROBOT_MATRIX_CHECK_PROMPT,
                  })
                }
              >
                Проверить
              </Button>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <Divider />

      <H2>4. Частичные проверки</H2>
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

        <Card>
          <CardHeader>Полный handover</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text tone="secondary" size="small">
                Самый длинный Local QG перед передачей или тегом: unit, API,
                браузер, матрица. Не для каждого коммита. ~20–40 мин.
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({
                    type: "newComposerChat",
                    userPrompt: RELEASE_GATE_PROMPT,
                  })
                }
              >
                Запустить
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
              Хотите только путь заявки роботами — «Запустить обоих роботов» или
              отдельно логика / кабинеты.
            </Text>
            <Text size="small">
              Меняли только текст инструкции — «Документация».
            </Text>
            <Text size="small">Не знаете — «Что мне запустить».</Text>
          </Stack>
        </CardBody>
      </Card>

      <Row justify="center">
        <Text tone="quaternary" size="small">
          Local QG · кнопка = запуск · агент не публикует сам
        </Text>
      </Row>
    </Stack>
  );
}
