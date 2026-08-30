/** Bank API channel copy (manager/root UI). Source: glossariy + интеграция-и-события (correlation, idempotency). */
export const BANK_CHANNEL_BADGE = {
  bankLabeled: "Канал: Bank API",
  bankShort: "Bank API",
  bankTitle: "Заявка создана через интеграционный канал Bank API",
  uiLabeled: "Канал: UI",
  uiShort: "UI",
  uiTitle: "Заявка создана через кабинет пользователя",
} as const;

export const BANK_CORRELATION = {
  /** Visible prefix on form card (trace id for bank request). */
  prefix: "Корр. ID: ",
  title: "Correlation ID — сквозная трассировка запроса Bank API через шлюз",
} as const;

export function formatBankCorrelationId(correlationId: string): string {
  return `${BANK_CORRELATION.prefix}${correlationId}`;
}

export const BANK_SETTINGS_PANEL = {
  openButton: "Настройки Bank API",
  openButtonActive: "Настройки Bank API · подключён",
  modalTitle: (orgName: string) => `Интеграция Bank API · ${orgName}`,
  modalDescription:
    "Тип подключения «Bank API»: фиксированная комиссия, webhook уведомления о статусе и платёжный агент по умолчанию.",
  clientTypeLabel: "Тип подключения",
  clientTypeUi: "Кабинет UI",
  clientTypeBank: "Bank API (машинный канал)",
  commissionLabel: "Фиксированная комиссия, %",
  markupLabel: "Применять наценку платформы",
  defaultAgentLabel: "Платёжный агент по умолчанию",
  defaultAgentEmpty: "—",
  webhookUrlLabel: "URL webhook для уведомлений о статусе",
  webhookSecretLabel: "Секрет подписи webhook",
  cancel: "Отмена",
  save: "Сохранить",
  saving: "Сохранение…",
  saveError: "Не удалось сохранить настройки Bank API",
} as const;

export const BANK_ORGANIZATIONS = {
  sectionTitle: "Организации с каналом Bank API",
  clientBadge: "Клиент Bank API",
} as const;

export const BANK_TESTING = {
  smokeTitle: "Проверка канала Bank API",
  smokeHint: (orgId: string) =>
    `Токен bank@vdp.local (сессия кабинета не меняется) · организация ${orgId} · Idempotency-Key на каждый запрос`,
  simulateButton: "Создать заявку через Bank API",
  simulateBusy: "Отправка запроса…",
  simulateError: "Ошибка Bank API",
  scenarioTitle: "Канал Bank API",
  scenarioSteps: [
    "POST /api/v1/bank/forms от bank@vdp.local с Idempotency-Key и correlation_id.",
    "На карточке заявки: badge «Канал: Bank API» и корреляционный ID.",
    "В /organizations (manager/root): настройки Bank API для org с client_type=bank.",
  ],
} as const;

export function formatBankCreateSuccess(formId: string, correlationId: string): string {
  return `Заявка ${formId} создана через Bank API · корр. ID ${correlationId} · откройте карточку для проверки badge`;
}

export function collectBankCopyStrings(): string[] {
  const buckets: string[] = [
    ...Object.values(BANK_CHANNEL_BADGE),
    BANK_CORRELATION.prefix,
    BANK_CORRELATION.title,
    BANK_SETTINGS_PANEL.modalDescription,
    BANK_SETTINGS_PANEL.clientTypeLabel,
    BANK_SETTINGS_PANEL.clientTypeUi,
    BANK_SETTINGS_PANEL.clientTypeBank,
    BANK_SETTINGS_PANEL.commissionLabel,
    BANK_SETTINGS_PANEL.markupLabel,
    BANK_SETTINGS_PANEL.defaultAgentLabel,
    BANK_SETTINGS_PANEL.webhookUrlLabel,
    BANK_SETTINGS_PANEL.webhookSecretLabel,
    ...Object.values(BANK_ORGANIZATIONS),
    BANK_TESTING.smokeTitle,
    BANK_TESTING.simulateButton,
    BANK_TESTING.scenarioTitle,
    ...BANK_TESTING.scenarioSteps,
    formatBankCreateSuccess("00000000-0000-0000-0000-000000000000", "corr-sample"),
  ];
  return buckets.filter(Boolean);
}
