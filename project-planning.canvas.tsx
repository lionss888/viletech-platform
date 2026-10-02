import {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  CollapsibleSection,
  Divider,
  H1,
  H2,
  Pill,
  Row,
  Select,
  Stack,
  Text,
  TextArea,
  TextInput,
  useCanvasAction,
  useCanvasState,
} from "cursor/canvas";

type LayerId =
  | "ui"
  | "fe"
  | "domain"
  | "api"
  | "unit"
  | "e2e"
  | "compose"
  | "docs";

type LayersState = Record<LayerId, boolean>;

type Draft = {
  title: string;
  goal: string;
  problem: string;
  outOfScope: string;
  decisions: string;
  /** Виды работы: не только разработка */
  workKinds: string[];
  gates: string[];
  primaryGate: string;
  contour: string;
};

type ReadyChecks = {
  rules: boolean;
  layers: boolean;
  dodGate: boolean;
  honesty: boolean;
  decomp: boolean;
};

type LayerMeta = {
  id: LayerId;
  label: string;
  hint: string;
  meaning: string;
  turnOn: string;
  turnOff: string;
  example: string;
};

type GateItem = {
  value: string;
  label: string;
  when: string;
  cmd: string;
};

const LAYER_META: LayerMeta[] = [
  {
    id: "ui",
    label: "UI / IA",
    hint: "экраны, CTA, паттерн",
    meaning:
      "Как выглядит и устроен экран для человека: куда зайти, что главное на экране, текст кнопки, мастер шагов.",
    turnOn:
      "Меняешь экраны кабинета, консоли, навигацию, копирайт CTA, empty state, модалки.",
    turnOff:
      "Только бэкенд/бот/скрипты без нового экрана; или UI уже есть и не трогаешь.",
    example:
      "Новая панель Knowledge в консоли vedy_bot; кнопка «Следующий шаг» на заявке.",
  },
  {
    id: "fe",
    label: "Компонент / FE",
    hint: "файлы, жесты",
    meaning:
      "Код фронта: React-компоненты, формы, загрузка файла, клики. Не «картинка», а реализация.",
    turnOn:
      "Правишь .tsx/.ts во frontend, shared-кнопки, file picker, клиент API.",
    turnOff: "Нет правок UI-кода (только Go/скрипты/документы).",
    example: "HitlPanel, FilePickButton, map ответа /api/agent в клиенте.",
  },
  {
    id: "domain",
    label: "Домен / use cases",
    hint: "статусы, роли",
    meaning:
      "Бизнес-правила: кто что может, какие статусы и переходы (заявка, HITL-карточка, approve).",
    turnOn:
      "Меняешь статусы, матрицу ролей, политику «когда спросить / принять в работу».",
    turnOff:
      "Только отображение/обёртка без смены правил; или чистый ops/скрипт.",
    example: "HITL: rules → cursor primary; новый статус awaiting_agent.",
  },
  {
    id: "api",
    label: "API / адаптеры",
    hint: "или «без API» явно",
    meaning:
      "HTTP/эндпоинты, контракт запросов, адаптеры к Telegram/Cursor/VDP. Граница снаружи.",
    turnOn:
      "Новый или изменённый endpoint, DTO, вызов внешнего API, bridge.",
    turnOff:
      "Только внутренняя логика без смены контракта; тогда в плане напиши «без API».",
    example: "POST /api/agent status=error; /api/knowledge/search; stand start.",
  },
  {
    id: "unit",
    label: "Unit",
    hint: "какие тесты",
    meaning:
      "Автотесты маленьких кусков (функция/сервис) без браузера. Быстрый сигнал «сломали правило».",
    turnOn:
      "Почти всегда, если есть код. В плане: какие тесты добавить/обновить.",
    turnOff:
      "Только черновик плана без кода; или чисто ручной ops без логики. Редко.",
    example: "runner_test: fail → error; knowledge retrieve; sanitize.",
  },
  {
    id: "e2e",
    label: "E2E / journey",
    hint: "Playwright / ручной",
    meaning:
      "Сквозной сценарий как у человека: клики в браузере или явный ручной journey (TG → ответ).",
    turnOn:
      "Меняешь кабинетный путь, upload, кнопки ролей; или нужен ручной DoD «менеджер написал → …».",
    turnOff:
      "Только unit/API без UI journey; для vedy_bot часто хватает smoke + ручной TG.",
    example: "Playwright login→заявка; ручной ask_agent в консоли.",
  },
  {
    id: "compose",
    label: "Compose / repro",
    hint: "localhost",
    meaning:
      "Как поднять и проверить локально: Docker compose, порты, env, «открой localhost».",
    turnOn:
      "Нужен живой стек (бот :8787, vdp compose) или новый сервис в compose.",
    turnOff: "Только правки текста/плана/unit без запуска среды.",
    example: "make up vedy_bot; make compose-up vdp; ~/.vedy_bot/env.",
  },
  {
    id: "docs",
    label: "Docs / notify",
    hint: "mgmt-tg при done",
    meaning:
      "Документация для людей и/или сообщение менеджменту в Telegram о результате волны.",
    turnOn:
      "Закрытие волны с notify; правка README/ops docs; новый how-to.",
    turnOff:
      "Внутренняя техволна без продуктового done и без правок docs.",
    example: "README Honesty gaps; notify-mgmt kind=done без jargon.",
  },
];

const DEFAULT_LAYERS: LayersState = {
  ui: false,
  fe: false,
  domain: false,
  api: false,
  unit: false,
  e2e: false,
  compose: false,
  docs: false,
};

const GATE_CATALOG: GateItem[] = [
  {
    value: "human_accept",
    label: "Приёмка человеком",
    cmd: "(без make) — ты читаешь результат и говоришь «ок» / правки",
    when: "Исследование, анализ, расчёты, тексты: «готово» = ты принял вывод.",
  },
  {
    value: "numbers_check",
    label: "Цифры сверены",
    cmd: "(без make) — повторный счёт / сверка допущений",
    when: "Вычисления, прогноз, статистика: цифры перепроверены.",
  },
  {
    value: "written_deliverable",
    label: "Есть готовый текст / таблица",
    cmd: "(без make) — файл или сообщение с результатом",
    when: "Нужен артефакт: отчёт, сводка, рекомендация — не только «поговорили».",
  },
  {
    value: "vedy_bot_test",
    label: "Бот: быстрые автопроверки",
    cmd: "cd инструменты/vedy_bot && make test && make smoke",
    when: "Меняли бота или его консоль. Не проверяет кабинеты продукта.",
  },
  {
    value: "check-env-parity",
    label: "Продукт: совпала ли версия Node",
    cmd: "cd vdp && make check-env-parity",
    when: "Перед любыми тяжёлыми проверками продукта — чтобы среда как на сервере проверок.",
  },
  {
    value: "precommit-gate",
    label: "Перед сохранением в git",
    cmd: "cd vdp && make precommit-gate",
    when: "Короткая проверка перед коммитом.",
  },
  {
    value: "ci-pr-fast",
    label: "Продукт: без браузера",
    cmd: "cd vdp && make ci-pr-fast",
    when: "Меняли сервер/API, экраны руками не трогали.",
  },
  {
    value: "ci-pr",
    label: "Продукт: несколько сценариев в браузере",
    cmd: "cd vdp && make ci-pr",
    when: "Меняли экраны, но не всю длинную лестницу ролей.",
  },
  {
    value: "ci-pr-pilot",
    label: "Продукт: полная лестница ролей",
    cmd: "cd vdp && make ci-pr-pilot",
    when: "Трогали заявку, роли, длинные сценарии в браузере.",
  },
  {
    value: "release-gate",
    label: "Полная приёмка перед передачей",
    cmd: "cd vdp && make release-gate",
    when: "Редко: перед тегом / большой сдачей. Долго.",
  },
];

const CONTOUR_OPTIONS = [
  { value: "vedy_bot", label: "Бот и консоль (vedy_bot)" },
  { value: "vdp", label: "Продукт кабинетов (vdp)" },
  { value: "both", label: "И бот, и продукт" },
  { value: "workspace", label: "Весь workspace / заметки" },
  { value: "other", label: "Другое" },
];

/** Справочник видов работы — мультивыбор */
const WORK_KIND_CATALOG: {
  value: string;
  label: string;
  meaning: string;
  deliverable: string;
}[] = [
  {
    value: "dev",
    label: "Разработка / доработка кода",
    meaning: "Пишем или меняем программу, бота, экраны.",
    deliverable: "Работающий код + проверки.",
  },
  {
    value: "research",
    label: "Исследование",
    meaning: "Разобраться в теме, сравнить варианты, найти ответы в коде/доках/сети.",
    deliverable: "Краткий вывод: что узнали и что рекомендовать.",
  },
  {
    value: "analysis",
    label: "Анализ",
    meaning: "Разобрать ситуацию, причины, риски, расхождения (без обязательного кода).",
    deliverable: "Разбор с выводами и следующим шагом.",
  },
  {
    value: "calc",
    label: "Вычисления",
    meaning: "Посчитать по формулам, сметам, ориентирам скорости, объёмам.",
    deliverable: "Цифры + как считали + допущения.",
  },
  {
    value: "forecast",
    label: "Прогнозирование",
    meaning: "Оценка сроков, нагрузки, «что будет если».",
    deliverable: "Прогноз с диапазоном и оговорками.",
  },
  {
    value: "stats",
    label: "Статистика / сводка",
    meaning: "Собрать и упорядочить факты, частоты, таблицы из данных или логов.",
    deliverable: "Сводка / таблица / картинка «как есть».",
  },
  {
    value: "design",
    label: "Проектирование / схема",
    meaning: "Набросать устройство решения: потоки, границы, экраны (ещё не код).",
    deliverable: "Схема или описание устройства.",
  },
  {
    value: "docs",
    label: "Документы / тексты",
    meaning: "Инструкции, ответы менеджменту, README, заметки.",
    deliverable: "Готовый текст без лишнего жаргона.",
  },
  {
    value: "ops",
    label: "Запуск / проверка среды",
    meaning: "Поднять стенд, прогнать проверки, посмотреть статус.",
    deliverable: "Статус: прошло / не прошло и что смотреть.",
  },
  {
    value: "decision",
    label: "Решение / согласование",
    meaning: "Сформулировать варианты и помочь выбрать.",
    deliverable: "Варианты + рекомендация + что утвердить.",
  },
];

const EMPTY_DRAFT: Draft = {
  title: "",
  goal: "",
  problem: "",
  outOfScope: "",
  decisions: "",
  workKinds: ["research"],
  gates: ["human_accept"],
  primaryGate: "human_accept",
  contour: "workspace",
};

const EMPTY_READY: ReadyChecks = {
  rules: false,
  layers: false,
  dodGate: false,
  honesty: false,
  decomp: false,
};

const READY_ITEMS: { id: keyof ReadyChecks; title: string; detail: string }[] =
  [
    {
      id: "rules",
      title: "Правила проекта учтены",
      detail: "В плане ясно: что обязательно, чего не делаем, как проверим.",
    },
    {
      id: "layers",
      title: "Виды работы и границы ясны",
      detail: "Исследование / анализ / счёт / код — отмечено; лишнее явно вне scope.",
    },
    {
      id: "dodGate",
      title: "Есть главная приёмка",
      detail: "Человек принял вывод, цифры сверены, текст готов — или проверка продукта.",
    },
    {
      id: "honesty",
      title: "Без ложного «всё готово»",
      detail: "Не пишем «готово», пока главная проверка не прошла.",
    },
    {
      id: "decomp",
      title: "Разбито на шаги",
      detail: "Крупные этапы и мелкие подзадачи понятны.",
    },
  ];

const ACTIONS: {
  mode: "draft" | "split" | "rules" | "execute";
  title: string;
  when: string;
  does: string;
  variant: "primary" | "secondary";
}[] = [
  {
    mode: "draft",
    title: "1. Составить план",
    when: "Задача и виды работы отмечены.",
    does: "План шагов: исследование, анализ, расчёты или разработка — не обязательно код.",
    variant: "primary",
  },
  {
    mode: "split",
    title: "2. Разрезать на этапы",
    when: "Работа большая — лучше несколькими заходами.",
    does: "Общий план и отдельные куски по этапам.",
    variant: "secondary",
  },
  {
    mode: "rules",
    title: "3. Проверить план",
    when: "План уже есть, хочешь убедиться перед стартом.",
    does: "Покажет дыры в плане. Ничего в проекте не меняет.",
    variant: "secondary",
  },
  {
    mode: "execute",
    title: "4. Начать делать",
    when: "План согласован.",
    does: "Поиск, анализ, счёт, тексты или код — по отмеченным видам работы.",
    variant: "secondary",
  },
];

function selectedLayers(layers: LayersState): string[] {
  return LAYER_META.filter((m) => layers[m.id]).map((m) => m.label);
}

function outLayers(layers: LayersState): string[] {
  return LAYER_META.filter((m) => !layers[m.id]).map((m) => m.label);
}

function gateLabel(id: string): string {
  return GATE_CATALOG.find((g) => g.value === id)?.label ?? id;
}

function normalizeDraft(raw: Draft): Draft {
  const gates =
    Array.isArray(raw.gates) && raw.gates.length > 0
      ? raw.gates
      : EMPTY_DRAFT.gates;
  let primary = raw.primaryGate || EMPTY_DRAFT.primaryGate;
  if (!gates.includes(primary)) {
    primary = gates[0] ?? EMPTY_DRAFT.primaryGate;
  }
  const workKinds =
    Array.isArray(raw.workKinds) && raw.workKinds.length > 0
      ? raw.workKinds
      : EMPTY_DRAFT.workKinds;
  return { ...EMPTY_DRAFT, ...raw, gates, primaryGate: primary, workKinds };
}

function buildPlanPrompt(
  draft: Draft,
  layers: LayersState,
  mode: "draft" | "split" | "rules" | "execute",
): string {
  const d = normalizeDraft(draft);
  const title = d.title.trim() || "без названия";
  const inLayers = selectedLayers(layers);
  const outL = outLayers(layers);
  const primary = gateLabel(d.primaryGate);
  const kinds = d.workKinds.map((id) => {
    const w = WORK_KIND_CATALOG.find((x) => x.value === id);
    return w ? `${w.label} — итог: ${w.deliverable}` : id;
  });
  const allGates = d.gates.map((id) => {
    const g = GATE_CATALOG.find((x) => x.value === id);
    const mark = id === d.primaryGate ? " [главная приёмка]" : "";
    return `${g?.label ?? id}${mark}${g ? ` → ${g.cmd}` : ""}`;
  });
  const contour =
    CONTOUR_OPTIONS.find((c) => c.value === d.contour)?.label ?? d.contour;
  const needsCode = d.workKinds.includes("dev") || d.workKinds.includes("ops");

  const base = `Планирование работ (не только разработка). Canvas Project Planning.

Контур: ${contour}
Название: ${title}
Виды работы (мульти):
${kinds.map((l) => `- ${l}`).join("\n")}
Цель: ${d.goal.trim() || "—"}
Проблема / зачем: ${d.problem.trim() || "—"}
Вне scope: ${d.outOfScope.trim() || "—"}
Уже решено: ${d.decisions.trim() || "—"}
Части системы IN (если разработка): ${inLayers.length ? inLayers.join("; ") : "не отмечены / не нужны"}
Части OUT: ${outL.join("; ")}
Проверки «готово»:
${allGates.map((l) => `- ${l}`).join("\n")}
Главная приёмка: ${primary}

Важно:
- План может быть про исследование, анализ, расчёты, прогноз, статистику, тексты, решения — не только код.
- Если нет вида «Разработка» — не предлагай писать код без явной просьбы; итог = выводы / цифры / текст / схема.
- Код нужен только если отмечена разработка или запуск среды (или пользователь явно просит). Сейчас needsCode=${needsCode}.
- Не утверждай «готово» без главной приёмки. Не коммить без просьбы.
`;

  if (mode === "draft") {
    return `${base}
Задача: создай ОДИН plan-файл в .cursor/plans/ под эти виды работы.
Структура: цель, виды работы, шаги, критерии готово, вне scope. Код в плане не пиши.`;
  }
  if (mode === "split") {
    return `${base}
Задача: разбей на мастер + этапы. Этапы могут быть «собрать данные → посчитать → вывод», не только код.`;
  }
  if (mode === "rules") {
    return `${base}
Задача: проверь план: хватает ли шагов под выбранные виды работы, ясен ли итог, нет ли лишнего кода.`;
  }
  return `${base}
Задача: ВЫПОЛНИ план по видам работы. Для research/analysis/calc/forecast/stats — результат текстом/таблицей/файлом; код только если нужен.`;
}

export default function ProjectPlanningTool() {
  const dispatch = useCanvasAction();
  const [draftRaw, setDraft] = useCanvasState<Draft>("draft_v3", EMPTY_DRAFT);
  const [layers, setLayers] = useCanvasState<LayersState>(
    "layers_v3",
    DEFAULT_LAYERS,
  );
  const [ready, setReady] = useCanvasState<ReadyChecks>("ready", EMPTY_READY);
  const draft = normalizeDraft(draftRaw);

  function patchDraft(partial: Partial<Draft>): void {
    setDraft((prev) => normalizeDraft({ ...prev, ...partial }));
  }

  function toggleLayer(id: LayerId, checked: boolean): void {
    setLayers((prev) => ({ ...prev, [id]: checked }));
  }

  function toggleWorkKind(id: string, checked: boolean): void {
    setDraft((prev) => {
      const cur = normalizeDraft(prev);
      let workKinds = checked
        ? [...new Set([...cur.workKinds, id])]
        : cur.workKinds.filter((k) => k !== id);
      if (workKinds.length === 0) {
        workKinds = [id];
      }
      return { ...cur, workKinds };
    });
  }

  function toggleGate(id: string, checked: boolean): void {
    setDraft((prev) => {
      const cur = normalizeDraft(prev);
      let gates = checked
        ? [...new Set([...cur.gates, id])]
        : cur.gates.filter((g) => g !== id);
      if (gates.length === 0) {
        gates = [id];
      }
      let primary = cur.primaryGate;
      if (!gates.includes(primary)) {
        primary = gates[0];
      }
      return { ...cur, gates, primaryGate: primary };
    });
  }

  function run(mode: "draft" | "split" | "rules" | "execute"): void {
    dispatch({
      type: "newComposerChat",
      userPrompt: buildPlanPrompt(draft, layers, mode),
    });
  }

  const primaryOptions = draft.gates.map((id) => ({
    value: id,
    label: gateLabel(id),
  }));

  return (
    <Stack gap={24} style={{ padding: 20, maxWidth: 880 }}>
      <Stack gap={6}>
        <H1>Планирование работ</H1>
        <Text tone="secondary">
          Не только код: исследование, анализ, расчёты, прогноз, статистика,
          тексты, решения. Опиши задачу → виды работы → при необходимости части
          системы → как поймём «готово» → действие.
        </Text>
      </Stack>

      <Callout tone="info" title="Как этим пользоваться">
        Сверху вниз. Кнопка внизу открывает чат с помощником: план или выполнение.
        Сам экран ничего в проекте не меняет.
      </Callout>

      <Stack gap={10}>
        <H2>1. О задаче</H2>
        <Text size="small" tone="secondary">
          Где работаем
        </Text>
        <Select
          value={draft.contour}
          onChange={(v) => patchDraft({ contour: v })}
          options={CONTOUR_OPTIONS}
        />
        <Text size="small" weight="semibold">
          Виды работы (можно несколько)
        </Text>
        <Callout tone="neutral" title="Не только разработка">
          Отметь всё нужное: исследование, анализ, счёт, прогноз и т.д. Код —
          только если включил «Разработка».
        </Callout>
        <Stack gap={4}>
          {WORK_KIND_CATALOG.map((w) => (
            <CollapsibleSection
              key={w.value}
              title={w.label}
              defaultOpen={false}
              trailing={
                <Checkbox
                  checked={draft.workKinds.includes(w.value)}
                  onChange={(v) => toggleWorkKind(w.value, v)}
                />
              }
            >
              <Stack gap={4} style={{ paddingBottom: 8 }}>
                <Text size="small">{w.meaning}</Text>
                <Text size="small" tone="tertiary">
                  Итог: {w.deliverable}
                </Text>
              </Stack>
            </CollapsibleSection>
          ))}
        </Stack>
        {draft.workKinds.length > 0 ? (
          <Row gap={6} style={{ flexWrap: "wrap" }}>
            {draft.workKinds.map((id) => (
              <Pill key={id} size="sm" tone="info">
                {WORK_KIND_CATALOG.find((w) => w.value === id)?.label ?? id}
              </Pill>
            ))}
          </Row>
        ) : null}
        <Text size="small" tone="secondary">
          Короткое название
        </Text>
        <TextInput
          value={draft.title}
          onChange={(v) => patchDraft({ title: v })}
          placeholder="например: починить ответ бота менеджеру"
        />
        <Text size="small" tone="secondary">
          Что должно стать лучше для человека
        </Text>
        <TextArea
          value={draft.goal}
          onChange={(v) => patchDraft({ goal: v })}
          rows={2}
          placeholder="Менеджер сможет… / оператор увидит…"
        />
        <Text size="small" tone="secondary">
          В чём боль сейчас
        </Text>
        <TextArea
          value={draft.problem}
          onChange={(v) => patchDraft({ problem: v })}
          rows={3}
          placeholder="Сейчас не работает… / приходится вручную…"
        />
        <Text size="small" tone="secondary">
          Что сознательно не делаем в этой волне
        </Text>
        <TextArea
          value={draft.outOfScope}
          onChange={(v) => patchDraft({ outOfScope: v })}
          rows={2}
          placeholder="Не трогаем кабинеты / не удаляем старый путь…"
        />
        <Text size="small" tone="secondary">
          Уже решили заранее
        </Text>
        <TextArea
          value={draft.decisions}
          onChange={(v) => patchDraft({ decisions: v })}
          rows={2}
          placeholder="например: умный поиск через облако; старые правила оставить запасным путём"
        />
      </Stack>

      <Divider />

      <Stack gap={10}>
        <H2>2. Части системы (если пишем код)</H2>
        <Callout tone="neutral" title="Для исследования часто пусто">
          Если работа — анализ или счёт, галочки здесь можно не ставить. Нужны,
          когда трогаем экраны, API, тесты. Раскрой строку — когда включать.
        </Callout>
        <Stack gap={4}>
          {LAYER_META.map((m) => (
            <CollapsibleSection
              key={m.id}
              title={`${m.label} — ${m.hint}`}
              defaultOpen={false}
              trailing={
                <Checkbox
                  checked={layers[m.id]}
                  onChange={(v) => toggleLayer(m.id, v)}
                />
              }
            >
              <Stack gap={6} style={{ paddingBottom: 8 }}>
                <Text size="small">{m.meaning}</Text>
                <Text size="small" weight="semibold">
                  Включить, если
                </Text>
                <Text size="small" tone="secondary">
                  {m.turnOn}
                </Text>
                <Text size="small" weight="semibold">
                  Выключить, если
                </Text>
                <Text size="small" tone="secondary">
                  {m.turnOff}
                </Text>
                <Text size="small" weight="semibold">
                  Пример
                </Text>
                <Text size="small" tone="tertiary">
                  {m.example}
                </Text>
              </Stack>
            </CollapsibleSection>
          ))}
        </Stack>
      </Stack>

      <Divider />

      <Stack gap={12}>
        <H2>3. Как поймём, что готово</H2>
        <Callout tone="neutral" title="Можно отметить несколько">
          Для исследования часто хватает «приёмка человеком». Для кода —
          проверки продукта. Одну отметь как главную.
        </Callout>
        <Stack gap={4}>
          {GATE_CATALOG.map((g) => {
            const on = draft.gates.includes(g.value);
            const isPrimary = draft.primaryGate === g.value;
            return (
              <CollapsibleSection
                key={g.value}
                title={g.label}
                defaultOpen={false}
                trailing={
                  <Row gap={8}>
                    {isPrimary && on ? (
                      <Pill tone="info" size="sm">
                        главная
                      </Pill>
                    ) : null}
                    <Checkbox
                      checked={on}
                      onChange={(v) => toggleGate(g.value, v)}
                    />
                  </Row>
                }
              >
                <Stack gap={4} style={{ paddingBottom: 8 }}>
                  <Text size="small">{g.when}</Text>
                  <Text size="small" tone="tertiary">
                    Команда для инженера: {g.cmd}
                  </Text>
                </Stack>
              </CollapsibleSection>
            );
          })}
        </Stack>
        <Stack gap={6}>
          <Text size="small" weight="semibold">
            Главная проверка «волна готова»
          </Text>
          <Select
            value={draft.primaryGate}
            onChange={(v) => patchDraft({ primaryGate: v })}
            options={
              primaryOptions.length > 0
                ? primaryOptions
                : [{ value: "human_accept", label: gateLabel("human_accept") }]
            }
          />
        </Stack>
        {draft.gates.length > 0 ? (
          <Row gap={6} style={{ flexWrap: "wrap" }}>
            {draft.gates.map((id) => (
              <Pill
                key={id}
                tone={id === draft.primaryGate ? "info" : "neutral"}
                size="sm"
              >
                {gateLabel(id)}
              </Pill>
            ))}
          </Row>
        ) : null}
      </Stack>

      <Divider />

      <Stack gap={14}>
        <H2>4. Что сделать дальше</H2>
        <Text tone="secondary">
          Выбери шаг. Откроется чат — напиши туда файлы через @, если нужно.
        </Text>
        <Stack gap={10}>
          {ACTIONS.map((a) => (
            <Card key={a.mode}>
              <CardHeader>{a.title}</CardHeader>
              <CardBody>
                <Stack gap={8}>
                  <Text size="small" tone="secondary">
                    Когда нажимать: {a.when}
                  </Text>
                  <Text size="small">Что произойдёт: {a.does}</Text>
                  <Button variant={a.variant} onClick={() => run(a.mode)}>
                    {a.title.replace(/^\d+\.\s*/, "")}
                  </Button>
                </Stack>
              </CardBody>
            </Card>
          ))}
        </Stack>
        <Button
          variant="ghost"
          onClick={() => {
            setDraft(EMPTY_DRAFT);
            setLayers(DEFAULT_LAYERS);
            setReady(EMPTY_READY);
          }}
        >
          Очистить форму
        </Button>
      </Stack>

      <Card>
        <CardHeader>Перед стартом работ — проверь себя</CardHeader>
        <CardBody>
          <Stack gap={8}>
            {READY_ITEMS.map((item) => (
              <Checkbox
                key={item.id}
                checked={ready[item.id]}
                onChange={(v) =>
                  setReady((prev) => ({ ...prev, [item.id]: v }))
                }
                label={`${item.title} — ${item.detail}`}
              />
            ))}
          </Stack>
        </CardBody>
      </Card>

      <Stack gap={8}>
        <Text weight="semibold" size="small">
          Опора на правила проекта
        </Text>
        <Text size="small" tone="tertiary">
          Планы сверяем с правилами в папке .cursor/rules: честное «готово»,
          слои и проверки с самого начала, локальная страховка перед сдачей.
        </Text>
      </Stack>
    </Stack>
  );
}
