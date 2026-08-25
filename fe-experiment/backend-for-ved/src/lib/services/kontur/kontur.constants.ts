export const KONTUR_API_ENDPOINT = '/req';

export const KONTUR_HTTP_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0',
};

export const KONTUR_HTTP_CONFIG = {
  proxy: false as const,
};

// Organization active status keyword (Russian)
export const KONTUR_ACTIVE_STATUS_RU = 'действующее';

export const BUSINESS_FORM_KEYWORDS = {
  PAO: ['публичные акционерные общества', 'публичное акционерное общество', 'пао'],
  OAO: ['открытые акционерные общества', 'открытое акционерное общество', 'оао'],
  OOO: ['общество с ограниченной ответственностью', 'общества с ограниченной ответственностью', 'ооо'],
  NPAO: ['непубличные акционерные общества', 'непубличное акционерное общество'],
  AO: ['акционерное общество'],
  IP: ['индивидуальный предприниматель', 'индивидуальные предприниматели', 'ип'],
} as const;

export const CEO_POSITION_KEYWORDS = {
  GENERAL_DIRECTOR: ['генеральный директор'],
  EXECUTIVE_DIRECTOR: ['исполнительный директор'],
  MANAGING_DIRECTOR: ['управляющий директор'],
  FINANCE_DIRECTOR: ['финансовый директор'],
  COMMERCIAL_DIRECTOR: ['коммерческий директор'],
  CHIEF_ACCOUNTANT: ['главный бухгалтер'],
} as const;

// Validation patterns for organization identifiers
export const OGRN_PATTERN = /^\d{13}$|^\d{15}$/;
export const KPP_PATTERN = /^\d{9}$/;
