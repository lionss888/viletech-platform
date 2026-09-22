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

const PRECOMMIT_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make precommit-gate. Это тот же слой, что GitHub Desktop при Commit и .githooks/pre-commit: версии программ, оформление текстов, автоматические проверки кода.`;

const PREPUSH_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make prepush-gate. Это тот же слой, что GitHub Desktop при Push и .githooks/pre-push: path-aware — e2e вне узкого smoke → ci-main; лестница заявки → ci-pr-pilot; иначе ci-pr. Аварийный обход только SKIP_PREPUSH_GATE=1 (не рекомендуй без крайней нужды). Не коммить и не пушь сам.`;

const PILOT_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make ci-pr-pilot. Это проверка перед публикацией на GitHub: код, тексты, поднятие локальной среды и проход сценариев в браузере по заявке (включая длинную лестницу ролей и Pilot Robot Matrix). Тот же уровень, что pre-push при касании ladder paths без e2e вне smoke.`;

const SMOKE_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make ci-pr. Это короткая проверка с браузером (несколько ключевых сценариев). Если меняли экраны заявки, кнопки ролей или файлы e2e — этого мало: лестница → ci-pr-pilot; e2e вне smoke → ci-main.`;

const MAIN_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make ci-main. Паритет полного Playwright как на push в main (все e2e без узкого фильтра). Долго. Нужно перед merge/после правок e2e вне smoke, чтобы не повторить красный VDP CI на main. Не путать с ci-pr-pilot и с release-gate.`;

const ALPHA_STATUS_PROMPT = `${RUN} Диагностика цепочки до alpha. Не коммить и не пушь. Не запускай compose-fe-refresh.

1) PATH: добавь $HOME/.local/bin если нужен gh. Если gh auth сломан — скажи перелогиниться (gh auth login), не выдумывай статусы.
2) На main: последние run VDP CI, VDP Images, VDP Deploy (gh run list --branch main --limit 12). Кратко: зелёный / красный / skip и почему Deploy не шёл (Images/CI).
3) Живая проверка: открой https://alpha.vedy.io/login (браузер или curl HTML) и сравни placeholder e-mail с локальным каноном «ваша @ почта». Скажи: alpha свежий или отстаёт.
4) Если CI/Images красные — назови упавший шаг простым языком и что чинить. Не утверждай «выкатил», пока alpha не совпал с каноном.
Deploy из canvas не делай молча (нужны secrets/SSH); только диагностика и следующий шаг человеку.`;

const NO_BROWSER_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make ci-pr-fast. Без открытия браузера: правила текстов, мелкие проверки кода и сервисов. Не проверяет, что человек может нажать кнопки в кабинете.`;

const BROWSER_ONLY_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make playwright-e2e. Только сценарии в браузере (вход, заявка, роли). Нужна уже поднятая локальная среда (Docker). Не проверяет оформление текстов и не гоняет всю лестницу ролей.`;

const ENV_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make check-env-parity. Проверь, что на этой машине те же версии Node (fe/.nvmrc) и Go (vdp/.go-version), что в проекте. Если нет — скажи, что сделать (nvm use / mise; Go 1.22.x на PATH), без установки пакетов без спроса.`;

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
const DOCS_CREATE_PROMPT = `Local QG — создание документации. Это не make-gate. Не коммить и не пушь.

По git status и git diff найди публичные места без документации и добавь только недостающее:
- JSDoc (TypeScript) или GoDoc у публичных функций и типов;
- короткое «зачем» у неочевидных правил домена (роль, статус, деньги);
- новые .md не создавай без явной дыры в уже существующем how-to под docs/development/;
- не трогай чужой код вне diff.
В конце: список файлов и что добавил. Процент не считай — для процента есть кнопка «Документация · тест».`;

const DOCS_TEST_PROMPT = `${RUN} Документация · тест. Сделай два шага по порядку, без обсуждения.

1) Команда (ровно одна): cd vdp && make docs-format-check. Оформление рабочих текстов: без таблиц, списков и «жирного». Красный — скажи отдельно простым языком.
2) Затем (не make): по git status и git diff посчитай наличие документации в незакоммиченных правках.
   - Знаменатель Y: публичные функции/типы/экспорты в diff (+ изменённые файлы docs, если есть).
   - Числитель X: у скольких уже есть JSDoc/GoDoc или осмысленный блок docs.
   - В ответе первой строкой: «Документация: N% (X из Y)».
   - Ниже — короткий список пробелов (файл · символ).
Ничего не правь и не коммить.`;

const PERF_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make perf-gate. Замер скорости проверки перехода статуса заявки. Если дольше бюджета — скажи простым языком, что тормозит (не проценты комментариев). Не коммить.`;

const TRIAGE_PROMPT = `Local QG — подскажи проверку. Не запускай тесты, пока человек не нажмёт другую кнопку.

По git status и git diff скажи простым языком:
1. Что менялось (экраны, правила заявки, тексты, только план).
2. Какую кнопку нажать в Local QG (перед коммитом / перед Push / лестница / Main push полный браузер / без браузера / с браузером / До alpha / документация создать или тест / производительность / Pilot Robot Matrix).
3. Почему именно её, одной фразой.
Если в diff есть vdp/fe/e2e/** вне login-form, user-submit, provider-acl, reject-path — рекомендуй «Main push (полный браузер)» (ci-main), не только лестницу.
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

      <Callout tone="neutral" title="Единица готовности — запрос заказчика / срез дня">
        Не строки кода. Готово = Acceptance у роли + зелёная кнопка DoD из
        плана. Эталон: заметки/ориентир-скорости-запросов-заказчика-2026-09-21.md.
        Шаблон среза и онбординг: заметки/шаблон-среза-запроса-заказчика.md.
        Замер недели: заметки/замер-lead-time-неделя-2026-09-22.md.
        Неожиданный красный main → postmortem по
        vdp/docs/postmortems/TEMPLATE.txt + один prevention item в план.
      </Callout>

      <Callout tone="info" title="Commit короткий · Push = gate · alpha отдельно">
        GitHub Desktop при Commit гоняет короткий слой (как кнопка ниже). При
        Push — path-aware: e2e вне smoke → ci-main; лестница → ci-pr-pilot;
        иначе ci-pr. Это паритет PR/main на GitHub, не гарантия уже выкатанной
        alpha. После merge смотрите «До alpha»: CI → Images → Deploy. Обход
        Push только SKIP_PREPUSH_GATE=1. Не пушьте поверх уже идущего длинного
        ci-pr-pilot / ci-main без крайней нужды.
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
        <H2>2. Перед Push на GitHub</H2>
        <Text tone="secondary" size="small">
          То же, что .githooks/pre-push: сам выбирает ci-main / ci-pr-pilot /
          ci-pr по путям. Нажмите до Push в Desktop, чтобы ошибка была в чате.
          ~15–40 мин при полном браузере или лестнице, меньше без них.
        </Text>
        <Button
          onClick={() =>
            dispatch({ type: "newComposerChat", userPrompt: PREPUSH_PROMPT })
          }
        >
          Проверить перед Push
        </Button>
        <Text tone="tertiary" size="small">
          Явно выбрать уровень:
        </Text>
        <Button
          onClick={() =>
            dispatch({ type: "newComposerChat", userPrompt: MAIN_PROMPT })
          }
        >
          Main push (полный браузер)
        </Button>
        <Button
          onClick={() =>
            dispatch({ type: "newComposerChat", userPrompt: PILOT_PROMPT })
          }
        >
          Лестница заявки
        </Button>
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
        <H2>3. До alpha</H2>
        <Text tone="secondary" size="small">
          После merge в main: статусы VDP CI / Images / Deploy и живая проверка
          login на alpha. Не заменяет Push-gate. Выкат из Local QG сам не
          запускается — только диагностика.
        </Text>
        <Button
          onClick={() =>
            dispatch({ type: "newComposerChat", userPrompt: ALPHA_STATUS_PROMPT })
          }
        >
          Статус main → alpha
        </Button>
      </Stack>

      <Divider />

      <Stack gap={8}>
        <H2>4. Pilot Robot Matrix</H2>
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

      <H2>5. Частичные проверки</H2>
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
      </Grid>

      <Stack gap={6}>
        <Text size="small">Документация</Text>
        <Text tone="secondary" size="small">
          Создание — дописать JSDoc/GoDoc. Тест — оформление текстов и процент
          наличия по diff («Документация: N%»).
        </Text>
      </Stack>

      <Grid columns={2} gap={12}>
        <Card>
          <CardHeader>Документация · создать</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text tone="secondary" size="small">
                Допишет JSDoc/GoDoc и короткие пояснения «зачем» в ваших
                незакоммиченных правках. Процент не считает.
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({
                    type: "newComposerChat",
                    userPrompt: DOCS_CREATE_PROMPT,
                  })
                }
              >
                Создать
              </Button>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Документация · тест</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text tone="secondary" size="small">
                Сначала оформление текстов (как на GitHub), затем процент
                наличия документации по diff: «Документация: N% (X из Y)».
                Ничего не правит. ~10–30 сек.
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({
                    type: "newComposerChat",
                    userPrompt: DOCS_TEST_PROMPT,
                  })
                }
              >
                Показать %
              </Button>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <Grid columns={2} gap={12}>
        <Card>
          <CardHeader>Производительность</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text tone="secondary" size="small">
                Замер: сколько занимает проверка «можно ли перевести заявку в
                этот статус». Если дольше бюджета — gate красный. ~10–30 сек.
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({
                    type: "newComposerChat",
                    userPrompt: PERF_PROMPT,
                  })
                }
              >
                Запустить
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
                Часто коммит падает сразу: другая версия Node или Go. Эта
                кнопка проверяет совпадение с проектом. ~5 сек.
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
              Перед Push — «Проверить перед Push» (сам выберет ci-pr или
              лестницу). Явно: «Лестница заявки» или короткая с браузером.
            </Text>
            <Text size="small">
              После merge, alpha отстаёт — «Статус main → alpha».
            </Text>
            <Text size="small">
              Хотите только путь заявки роботами — «Запустить обоих роботов» или
              отдельно логика / кабинеты.
            </Text>
            <Text size="small">
              Нужны docs — сначала «· создать», потом «· тест».
            </Text>
            <Text size="small">
              Трогали статусы заявки / переходы — «Производительность».
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
