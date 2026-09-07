package formpayment

// CapabilityLabel is a human-readable catalog entry for admin UI.
type CapabilityLabel struct {
	ID          Capability `json:"id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
}

// CapabilitiesCatalog returns RU titles/descriptions for all business capabilities.
func CapabilitiesCatalog() []CapabilityLabel {
	return []CapabilityLabel{
		{ID: CapFormView, Title: "Просмотр заявки", Description: "Видеть карточку и статус заявки без смены статуса."},
		{ID: CapFormSubmit, Title: "Отправка заявки", Description: "Создавать черновик и отправлять заявку дальше по процессу."},
		{ID: CapFormCancelUser, Title: "Отмена клиентом", Description: "Клиент может отменить свою заявку на допустимых этапах."},
		{ID: CapFormRecognize, Title: "Распознавание документов", Description: "Запускать и подтверждать распознавание вложений."},
		{ID: CapOrgCompliance, Title: "Проверка организации", Description: "Internal compliance: проверка организации и связанные решения."},
		{ID: CapFormCompliance, Title: "Проверка сделки", Description: "External compliance: проверка документов и условий сделки."},
		{ID: CapManagerOps, Title: "Операции менеджера", Description: "Ревью, возврат на доработку, назначение и операционные шаги менеджера."},
		{ID: CapManagerPayment, Title: "Платежи менеджера", Description: "Действия менеджера вокруг оплаты и согласования платежного пути."},
		{ID: CapProviderPayment, Title: "Исполнение провайдером", Description: "Принять в работу, исполнить платёж и подтвердить исполнение."},
		{ID: CapTreasurerOps, Title: "Операции казначея", Description: "Казначейский контроль и связанные подтверждения."},
		{ID: CapUserDocs, Title: "Документы клиента", Description: "Загрузка и подтверждение документов со стороны клиента."},
		{ID: CapInternalCallback, Title: "Внутренний callback", Description: "Служебные колбэки внутренних интеграций (например 1С)."},
		{ID: CapSalesAttribution, Title: "Атрибуция продаж", Description: "Учёт привлечения клиента / участия sales без смены статуса."},
		{ID: CapBankChannel, Title: "Банковский канал", Description: "Действия банковского клиента в своём канале подачи."},
	}
}
