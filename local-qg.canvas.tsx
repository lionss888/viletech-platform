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

const PREPUSH_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make prepush-gate. Умная проверка: сам выбирает уровень по изменённым файлам (только тексты → секунды; код без UI → без браузера; обычный UI → короткий браузер; лестница/e2e → полный). Для принудительной полной страховки перед main: FULL_PREPUSH_GATE=1. Аварийный обход: SKIP_PREPUSH_GATE=1 (не рекомендуй). Не коммить и не пушь сам.`;

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

const OCR_PATH_PROMPT = `${RUN} Команда (ровно одна): cd vdp && make ocr-path-gate. Путь распознавания до ручной проверки клиентом: Docling smoke + один сценарий в мастере (баннер уходит в done или честный fail, не вечный pending). Нужна уже поднятая среда (make compose-up). Не заменяет лестницу ролей и не утверждает качество IE. Красный → чинить продукт, не звать человека.`;

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

const FULL_PUSH_PROMPT = `${RUN} Команда (ровно одна): cd vdp && FULL_PREPUSH_GATE=1 make prepush-gate. Полная страховка: postgres integration + ci-main (весь Playwright). ~15–40 мин. Гоняй перед merge в main или когда сомневаешься в умном выборе. Не коммить и не пушь сам.`;

const TRIAGE_PROMPT = `Local QG — подскажи проверку. Не запускай тесты, пока человек не нажмёт другую кнопку.

По git status и git diff скажи простым языком:
1. Что менялось (экраны, правила заявки, тексты, только план).
2. Какую кнопку нажать в Local QG (Что мне запустить / по типу работы / перед коммитом / по изменениям / Полная страховка / OCR / alpha / роботы / Документация · создать или · тест / производительность / handover).
3. Почему именно её, одной фразой.
Если в diff есть forms-new, extraction, ocr-progress, create-review-copy, ocr-readiness, extraction-docling или e2e/ocr-wizard-path — первой рекомендуй «Путь распознавания» (ocr-path-gate) до ручного UAT клиента.
Если готовитесь к Push — обычно достаточно «Проверить по изменениям» (умный prepush-gate). «Полная страховка» только перед merge в main или при сомнениях.
Если в diff есть vdp/fe/e2e/** вне login-form, user-submit, provider-acl, reject-path — для merge-ready упомяни «Main push» или «Полная страховка».
Не коммить. Не пушь. Не запускай make.`;

export default function LocalQG() {
  const dispatch = useCanvasAction();

  return (
      <Stack gap={24} style={{ padding: 24, maxWidth: 720 }}>
      <Stack gap={6}>
        <H1>Local QG</H1>
        <Text tone="secondary">
          Проверка качества работы перед коммитом и публикацией. 
          Нажмите кнопку — агент сам запустит нужные тесты и скажет: прошло или нет.
        </Text>
      </Stack>

      <Callout tone="info" title="Не знаете, что запустить?">
        Начните с кнопки «Что мне запустить?» ниже. Агент посмотрит ваши изменения 
        и подскажет нужную проверку.
      </Callout>

      <Stack gap={8}>
        <Button
          variant="primary"
          onClick={() =>
            dispatch({ type: "newComposerChat", userPrompt: TRIAGE_PROMPT })
          }
        >
          Что мне запустить?
        </Button>
        <Text tone="tertiary" size="small">
          Агент посмотрит, что вы меняли, и скажет какую кнопку нажать. Тесты не запустит.
        </Text>
      </Stack>

      <Divider />

      <Stack gap={8}>
        <H2>По типу работы</H2>
        <Text tone="secondary" size="small">
          Выберите то, что делали. Если не уверены — жмите «Что мне запустить?» выше.
        </Text>
      </Stack>

      <Stack gap={12}>
        <Card>
          <CardHeader>Меняли только тексты / планы / заметки</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text size="small">
                Проверка оформления текстов. Быстро, ~5–10 секунд.
              </Text>
              <Button
                onClick={() =>
                  dispatch({ type: "newComposerChat", userPrompt: `${RUN} Команда: cd vdp && make docs-format-check` })
                }
              >
                Проверить тексты
              </Button>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Код без экранов (backend, API, логика)</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text size="small">
                Проверка кода без открытия браузера. ~3–7 минут.
              </Text>
              <Button
                onClick={() =>
                  dispatch({ type: "newComposerChat", userPrompt: NO_BROWSER_PROMPT })
                }
              >
                Проверить код
              </Button>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Экраны и кнопки (UI, кабинеты)</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text size="small">
                Проверка с браузером: заходит в кабинет, кликает кнопки. ~10–15 минут.
              </Text>
              <Button
                onClick={() =>
                  dispatch({ type: "newComposerChat", userPrompt: SMOKE_PROMPT })
                }
              >
                Проверить экраны
              </Button>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Заявка, роли, статусы (лестница)</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text size="small">
                Полная проверка сценариев заявки по всем ролям. ~15–25 минут.
              </Text>
              <Button
                onClick={() =>
                  dispatch({ type: "newComposerChat", userPrompt: PILOT_PROMPT })
                }
              >
                Проверить заявку
              </Button>
            </Stack>
          </CardBody>
        </Card>
      </Stack>

      <Divider />

      <Stack gap={8}>
        <H2>Стандартные этапы</H2>
      </Stack>

      <Stack gap={12}>
        <Card>
          <CardHeader>Перед коммитом</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text size="small">
                Базовые проверки: версии программ, оформление, быстрые тесты. 
                Запускается автоматически при Commit в GitHub Desktop. ~2–5 минут.
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({ type: "newComposerChat", userPrompt: PRECOMMIT_PROMPT })
                }
              >
                Запустить
              </Button>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Перед Push (умная проверка)</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text size="small">
                Сама выбирает нужный уровень по вашим изменениям. Время зависит от объёма: 
                от секунд (тексты) до 20 минут (экраны и заявка).
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({ type: "newComposerChat", userPrompt: PREPUSH_PROMPT })
                }
              >
                Запустить
              </Button>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Полная проверка (перед merge в main)</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text size="small">
                Всё подряд: код, браузер, вся заявка. Долго, ~15–40 минут. 
                Запускайте перед влиянием в главную ветку или когда сомневаетесь.
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({ type: "newComposerChat", userPrompt: FULL_PUSH_PROMPT })
                }
              >
                Запустить
              </Button>
            </Stack>
          </CardBody>
        </Card>
      </Stack>

      <Divider />

      <Stack gap={8}>
        <H2>Специальные проверки</H2>
        <Text tone="secondary" size="small">
          Нужны редко, только в конкретных ситуациях.
        </Text>
      </Stack>

      <Grid columns={2} gap={12}>
        <Card>
          <CardHeader>Распознавание документов (OCR)</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text size="small">
                Если меняли мастер заявки или систему распознавания: проверить, 
                что баннер исчезает после загрузки документа. ~3–7 минут.
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({ type: "newComposerChat", userPrompt: OCR_PATH_PROMPT })
                }
              >
                Проверить OCR
              </Button>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Статус выката на alpha</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text size="small">
                После влития в main: проверить, дошли ли изменения до тестового 
                сервера. Сам не выкатывает — только диагностика.
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({ type: "newComposerChat", userPrompt: ALPHA_STATUS_PROMPT })
                }
              >
                Проверить alpha
              </Button>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Роботы полного цикла</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text size="small">
                Автопрогон всей заявки: API и клики в кабинетах. 
                Нужен запущенный Docker (кнопка ниже). ~7–20 минут.
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({ type: "newComposerChat", userPrompt: ROBOT_BOTH_PROMPT })
                }
              >
                Запустить роботов
              </Button>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Запустить Docker</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text size="small">
                Поднять локальную среду с базой данных и сервисами. 
                Нужно перед роботами и некоторыми проверками.
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({ type: "newComposerChat", userPrompt: COMPOSE_UP_PROMPT })
                }
              >
                Запустить Docker
              </Button>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <Divider />

      <Stack gap={8}>
        <H2>Утилиты</H2>
        <Text tone="secondary" size="small">
          Дополнительные проверки и инструменты.
        </Text>
      </Stack>

      <Grid columns={2} gap={12}>
        <Card>
          <CardHeader>Версии программ</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text size="small">
                Проверить, что Node.js и Go той же версии, что в проекте. 
                Если нет — скажет как исправить. ~5 секунд.
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
          <CardHeader>Настройки уведомлений</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text size="small">
                Проверить, может ли компьютер отправлять служебные сообщения 
                о выкате. Не печатает токены. ~5 секунд.
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

        <Card>
          <CardHeader>Производительность</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text size="small">
                Замер скорости проверки статуса заявки. 
                Если медленно — скажет что тормозит. ~10–30 секунд.
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({ type: "newComposerChat", userPrompt: PERF_PROMPT })
                }
              >
                Замерить
              </Button>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Полный handover</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text size="small">
                Всё подряд перед передачей: unit, API, браузер, роботы. 
                Долго, ~20–40 минут. Не для каждого коммита.
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({ type: "newComposerChat", userPrompt: RELEASE_GATE_PROMPT })
                }
              >
                Запустить
              </Button>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <Divider />

      <Stack gap={8}>
        <H2>Документация</H2>
        <Text tone="secondary" size="small">
          Дописать комментарии в коде и проверить, сколько уже покрыто в ваших правках.
        </Text>
      </Stack>

      <Grid columns={2} gap={12}>
        <Card>
          <CardHeader>Документация · создать</CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text size="small">
                Допишет пояснения к публичным функциям и типам в незакоммиченных
                правках (JSDoc / GoDoc). Процент не считает.
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
              <Text size="small">
                Сначала оформление текстов, затем процент покрытия по diff:
                «Документация: N% (X из Y)». Ничего не правит. ~10–30 секунд.
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

      <Divider />

      <Stack gap={8}>
        <H2>Справка</H2>
        <Text tone="secondary" size="small">
          Пояснения и советы по использованию.
        </Text>
      </Stack>

      <Card collapsible defaultOpen={false}>
        <CardHeader>Частые вопросы</CardHeader>
        <CardBody>
          <Stack gap={12}>
            <Stack gap={4}>
              <Text size="small" weight="semibold">
                Не знаю, что запустить
              </Text>
              <Text size="small" tone="secondary">
                Жмите «Что мне запустить?» в самом начале. Агент посмотрит ваши 
                изменения и скажет нужную кнопку.
              </Text>
            </Stack>

            <Stack gap={4}>
              <Text size="small" weight="semibold">
                Перед Commit в GitHub Desktop
              </Text>
              <Text size="small" tone="secondary">
                Ничего не нажимайте — проверка запустится автоматически. 
                Если хотите проверить заранее — «Проверить перед коммитом».
              </Text>
            </Stack>

            <Stack gap={4}>
              <Text size="small" weight="semibold">
                Перед Push на GitHub
              </Text>
              <Text size="small" tone="secondary">
                Обычно: «Проверить по изменениям» (умная, быстрая). 
                Перед слиянием в main: «Полная страховка».
              </Text>
            </Stack>

            <Stack gap={4}>
              <Text size="small" weight="semibold">
                Долго выполняется
              </Text>
              <Text size="small" tone="secondary">
                Время зависит от объёма изменений: от секунд (тексты) до 40 минут 
                (полная проверка). Прервать нельзя — дождитесь результата.
              </Text>
            </Stack>
          </Stack>
        </CardBody>
      </Card>

      <Row justify="center">
        <Text tone="tertiary" size="small">
          Local QG · кнопка = запуск · агент не публикует сам
        </Text>
      </Row>
    </Stack>
  );
}
