/** Описание справочников платформы: поля, валидация, импорт и экспорт CSV. */

import { ROLES } from "./roles";

export type RegistryKey =
  | "organizations"
  | "counterparties"
  | "providers"
  | "currencies"
  | "hsCodes"
  | "countries"
  | "complianceTools";


export type RegistryField = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "boolean";
  options?: { value: string; label: string }[];
  mono?: boolean;
  required?: boolean;
  placeholder?: string;
  /** Не показывать в таблице (например длинный адрес на узких экранах). */
  hint?: string;
};

export type RegistryDef = {
  key: RegistryKey;
  title: string;
  subtitle: string;
  singular: string;
  idField: string;
  /** Генерировать id автоматически (иначе id вводит пользователь — например код валюты). */
  autoId: boolean;
  fields: RegistryField[];
};

export type RefRecord = Record<string, string | number | boolean | undefined>;

const STATUS_APPROVAL = [
  { value: "approved", label: "Одобрен" },
  { value: "not_approved", label: "Не одобрен" },
];

export const REGISTRIES: Record<RegistryKey, RegistryDef> = {
  organizations: {
    key: "organizations",
    title: "Организации клиентов",
    subtitle: "Юридические лица клиентов, от имени которых создаются заявки",
    singular: "организацию",
    idField: "id",
    autoId: true,
    fields: [
      { key: "name", label: "Организация", type: "text", required: true, placeholder: 'ООО "Северный Импорт"' },
      { key: "inn", label: "ИНН", type: "text", required: true, mono: true, placeholder: "7701234567" },
      { key: "legalAddress", label: "Юридический адрес", type: "text", placeholder: "г. Москва, ул. Тверская, 1" },
      {
        key: "status",
        label: "Статус",
        type: "select",
        options: [
          { value: "approved", label: "Одобрена" },
          { value: "waiting_verification", label: "Ожидает проверки" },
          { value: "not_approved", label: "Не одобрена" },
        ],
      },
      {
        key: "rating",
        label: "Рейтинг",
        type: "select",
        options: [
          { value: "", label: "—" },
          { value: "yellow", label: "Жёлтый" },
          { value: "red", label: "Красный" },
        ],
      },
    ],
  },
  counterparties: {
    key: "counterparties",
    title: "Контрагенты",
    subtitle: "Иностранные и российские контрагенты по сделкам",
    singular: "контрагента",
    idField: "id",
    autoId: true,
    fields: [
      { key: "name", label: "Наименование", type: "text", required: true, placeholder: "Shenzhen Kaiyuan Electronics" },
      { key: "country", label: "Страна", type: "text", required: true, placeholder: "Китай" },
      { key: "countryCode", label: "Код страны", type: "text", mono: true, placeholder: "CN" },
      { key: "bank", label: "Банк", type: "text", placeholder: "Bank of China" },
      { key: "swift", label: "SWIFT", type: "text", mono: true, placeholder: "BKCHCNBJ" },
      {
        key: "scope",
        label: "Тип",
        type: "select",
        options: [
          { value: "foreign", label: "Иностранный" },
          { value: "russian", label: "Российский" },
        ],
      },
      { key: "status", label: "Проверка", type: "select", options: STATUS_APPROVAL },
    ],
  },
  providers: {
    key: "providers",
    title: "Провайдеры платежей",
    subtitle: "Партнёры, исполняющие платежи в валютных коридорах",
    singular: "провайдера",
    idField: "id",
    autoId: true,
    fields: [
      { key: "name", label: "Провайдер", type: "text", required: true, placeholder: "Sunrise Payments Ltd" },
      { key: "country", label: "Страна", type: "text", placeholder: "Гонконг" },
      { key: "corridors", label: "Коридоры", type: "text", mono: true, placeholder: "CNY, USD" },
      { key: "contact", label: "Контакт", type: "text", mono: true, placeholder: "ops@provider.com" },
      { key: "slaHours", label: "SLA, ч", type: "number", mono: true, placeholder: "24" },
      {
        key: "status",
        label: "Статус",
        type: "select",
        options: [
          { value: "active", label: "Активен" },
          { value: "paused", label: "Приостановлен" },
        ],
      },
    ],
  },
  currencies: {
    key: "currencies",
    title: "Валюты расчётов",
    subtitle: "Валюты, доступные для платежей, и их курсы",
    singular: "валюту",
    idField: "code",
    autoId: false,
    fields: [
      { key: "code", label: "Код", type: "text", required: true, mono: true, placeholder: "USD" },
      { key: "title", label: "Наименование", type: "text", required: true, placeholder: "Доллар США" },
      { key: "rate", label: "Курс", type: "text", mono: true, placeholder: "81,40 ₽" },
      {
        key: "status",
        label: "Статус",
        type: "select",
        options: [
          { value: "active", label: "Доступна" },
          { value: "restricted", label: "С ограничениями" },
        ],
      },
    ],
  },
  hsCodes: {
    key: "hsCodes",
    title: "Коды ТН ВЭД",
    subtitle: "Товарная номенклатура, пошлины и лицензирование",
    singular: "код",
    idField: "code",
    autoId: false,
    fields: [
      { key: "code", label: "Код", type: "text", required: true, mono: true, placeholder: "8471300000" },
      { key: "title", label: "Наименование", type: "text", required: true, placeholder: "Вычислительная техника" },
      { key: "duty", label: "Пошлина", type: "text", mono: true, placeholder: "5 %" },
      { key: "license", label: "Лицензия", type: "boolean" },
    ],
  },
  countries: {
    key: "countries",
    title: "Страны и риски",
    subtitle: "Уровень риска страны для комплаенс-проверки",
    singular: "страну",
    idField: "code",
    autoId: false,
    fields: [
      { key: "code", label: "Код", type: "text", required: true, mono: true, placeholder: "CN" },
      { key: "title", label: "Страна", type: "text", required: true, placeholder: "Китай" },
      {
        key: "risk",
        label: "Уровень риска",
        type: "select",
        options: [
          { value: "low", label: "Низкий" },
          { value: "medium", label: "Средний" },
          { value: "high", label: "Высокий" },
        ],
      },
    ],
  },
  complianceTools: {
    key: "complianceTools",
    title: "Инструменты комплаенс",
    subtitle: "Отметки, которыми комплаенс возвращает заявку или организацию на доработку",
    singular: "отметку",
    idField: "id",
    autoId: true,
    fields: [
      { key: "code", label: "Код", type: "text", required: true, mono: true, placeholder: "DOC-INVOICE" },
      { key: "title", label: "Отметка", type: "text", required: true, placeholder: "Некорректный инвойс" },
      {
        key: "instruction",
        label: "Что сделать клиенту",
        type: "text",
        required: true,
        placeholder: "Загрузите инвойс с подписью поставщика",
      },
      {
        key: "scope",
        label: "Применяется к",
        type: "select",
        options: [
          { value: "form", label: "Заявке" },
          { value: "organization", label: "Организации" },
          { value: "both", label: "Заявке и организации" },
        ],
      },
      { key: "active", label: "Активна", type: "boolean" },
    ],
  },
};


/** Поля для импорта/экспорта пользователей (CSV). */
export const USER_IMPORT_FIELDS: RegistryField[] = [
  { key: "name", label: "Имя", type: "text", required: true, placeholder: "И. Иванов" },
  { key: "email", label: "Email", type: "text", required: true, mono: true, placeholder: "user@company.ru" },
  {
    key: "role",
    label: "Роль",
    type: "select",
    required: true,
    options: ROLES.map((r) => ({ value: r.id, label: r.title })),
  },
  { key: "organization", label: "Организация", type: "text", placeholder: 'ООО "Северный Импорт"' },
];

export function emptyRecord(def: Pick<RegistryDef, "fields">): RefRecord {
  const draft: RefRecord = {};
  for (const field of def.fields) {
    if (field.type === "boolean") draft[field.key] = false;
    else if (field.type === "select") draft[field.key] = field.options?.[0]?.value ?? "";
    else if (field.type === "number") draft[field.key] = 0;
    else draft[field.key] = "";
  }
  return draft;
}

export function labelFor(field: RegistryField, value: unknown): string {
  if (field.type === "boolean") return value ? "Да" : "Нет";
  if (field.type === "select") return field.options?.find((o) => o.value === value)?.label ?? String(value ?? "—");
  const text = value === undefined || value === null || value === "" ? "—" : String(value);
  return text;
}

export function validate(def: Pick<RegistryDef, "fields">, draft: RefRecord): string | null {
  for (const field of def.fields) {
    if (!field.required) continue;
    if (String(draft[field.key] ?? "").trim().length === 0) return `Заполните поле «${field.label}»`;
  }
  return null;
}

/* ── CSV ────────────────────────────────────────────────────────── */

function splitCsvLine(line: string, sep: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else current += char;
    } else if (char === '"') quoted = true;
    else if (char === sep) {
      cells.push(current.trim());
      current = "";
    } else current += char;
  }
  cells.push(current.trim());
  return cells;
}

/** Разбор CSV/TSV: заголовки сопоставляются с ключами или подписями полей. */
export function parseRecords(def: Pick<RegistryDef, "fields">, text: string): { records: RefRecord[]; error: string | null } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return { records: [], error: "Нужны строка заголовков и хотя бы одна строка данных" };

  const first = lines[0]!;
  const sep = first.includes("\t") ? "\t" : first.includes(";") ? ";" : ",";
  const headers = splitCsvLine(first, sep).map((h) => h.toLowerCase());

  const mapped = headers.map((header) => {
    const field = def.fields.find(
      (f) => f.key.toLowerCase() === header || f.label.toLowerCase() === header,
    );
    return field ?? null;
  });
  if (!mapped.some(Boolean))
    return {
      records: [],
      error: `Заголовки не распознаны. Ожидаются: ${def.fields.map((f) => f.label).join(", ")}`,
    };

  const records: RefRecord[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line, sep);
    const draft = emptyRecord(def);
    mapped.forEach((field, index) => {
      if (!field) return;
      const raw = cells[index] ?? "";
      if (field.type === "number") draft[field.key] = Number(raw.replace(",", ".")) || 0;
      else if (field.type === "boolean") draft[field.key] = /^(да|yes|true|1|требуется)$/i.test(raw.trim());
      else if (field.type === "select") {
        const match = field.options?.find(
          (o) => o.value.toLowerCase() === raw.toLowerCase() || o.label.toLowerCase() === raw.toLowerCase(),
        );
        draft[field.key] = match?.value ?? field.options?.[0]?.value ?? "";
      } else draft[field.key] = raw;
    });
    const invalid = validate(def, draft);
    if (!invalid) records.push(draft);
  }

  if (records.length === 0) return { records: [], error: "Не найдено строк с заполненными обязательными полями" };
  return { records, error: null };
}

export function toCsv(def: Pick<RegistryDef, "fields">, records: RefRecord[]): string {
  const escape = (value: string) => (/[",;\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  const header = def.fields.map((f) => escape(f.label)).join(";");
  const rows = records.map((record) =>
    def.fields
      .map((f) => {
        const value = record[f.key];
        if (f.type === "boolean") return value ? "Да" : "Нет";
        return escape(String(value ?? ""));
      })
      .join(";"),
  );
  return [header, ...rows].join("\n");
}

export function templateCsv(def: Pick<RegistryDef, "fields">): string {
  return toCsv(def, [emptyRecord(def)]);
}
