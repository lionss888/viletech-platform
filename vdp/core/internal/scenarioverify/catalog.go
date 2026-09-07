package scenarioverify

// Tag classifies how a scenario is consumed by gates.
type Tag string

const (
	TagAPI   Tag = "api"
	TagUI    Tag = "ui"
	TagSmoke Tag = "smoke"
)

// Mode is the execution mode for a scenario run.
type Mode string

const (
	ModeMutating Mode = "mutating"
	ModeDryRun   Mode = "dry_run"
	ModeHealth   Mode = "health"
)

// Step is one named check or transition in a scenario.
type Step struct {
	ID             string `json:"id"`
	Title          string `json:"title"`
	ExpectedStatus string `json:"expected_status,omitempty"`
	Role           string `json:"role,omitempty"`
}

// Scenario is a named journey in the shared verification catalog.
type Scenario struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Tags        []Tag  `json:"tags"`
	Steps       []Step `json:"steps"`
}

// Catalog IDs — single source of truth for compose-e2e, Playwright, and Root UI.
const (
	IDHappyPathToCompleted         = "happy_path_to_completed"
	IDEcoRejectResubmit            = "eco_reject_resubmit"
	IDIcoOrgPendingApprove         = "ico_org_pending_approve"
	IDManagerPaymentAssignProvider = "manager_payment_assign_provider"
	IDProviderPaymentNoPII         = "provider_payment_no_pii"
	IDBankChannelBadge             = "bank_channel_badge"
	IDRootCancel                   = "root_cancel"
	IDRefundSmoke                  = "refund_smoke"
	IDManagerHidesDrafts           = "manager_hides_drafts"
	IDDocPreviewVisible            = "doc_preview_visible"
	IDHealthCore                   = "health_core"
)

// Catalog returns the fixed scenario list.
func Catalog() []Scenario {
	return []Scenario{
		{
			ID:          IDHappyPathToCompleted,
			Title:       "Полный путь заявки до закрытия",
			Description: "Клиент подаёт заявку → проверки → менеджер → оплата через провайдера → отчёт → заявка закрыта",
			Tags:        []Tag{TagAPI, TagUI, TagSmoke},
			Steps: []Step{
				{ID: "create_submit", Title: "Клиент создал и отправил заявку", Role: "user", ExpectedStatus: "form_waiting_verification"},
				{ID: "compliance", Title: "Комплаенс подтвердил заявку", Role: "compliance_officer", ExpectedStatus: "form_accepted"},
				{ID: "order_payment", Title: "Менеджер принял средства от клиента", Role: "manager", ExpectedStatus: "payment_received"},
				{ID: "provider_sent", Title: "Провайдер отправил платёж", Role: "provider", ExpectedStatus: "payment_sent"},
				{ID: "completed", Title: "Менеджер закрыл заявку", Role: "manager", ExpectedStatus: "completed"},
			},
		},
		{
			ID:          IDEcoRejectResubmit,
			Title:       "Возврат на доработку и повторная подача",
			Description: "Внешний комплаенс вернул заявку клиенту → клиент исправил и отправил снова",
			Tags:        []Tag{TagAPI, TagUI},
			Steps: []Step{
				{ID: "reject", Title: "Комплаенс вернул на доработку", Role: "compliance_officer", ExpectedStatus: "form_waiting_corrections"},
				{ID: "resubmit", Title: "Клиент отправил исправления", Role: "user", ExpectedStatus: "form_waiting_verification"},
			},
		},
		{
			ID:          IDIcoOrgPendingApprove,
			Title:       "Проверка организации клиента",
			Description: "Если организация ещё не одобрена — внутренний комплаенс одобряет организацию и заявку",
			Tags:        []Tag{TagAPI, TagUI},
			Steps: []Step{
				{ID: "org_waiting", Title: "Заявка ждёт проверки организации", Role: "user", ExpectedStatus: "organization_waiting_verification"},
				{ID: "ico_accept", Title: "Внутренний комплаенс одобрил", Role: "internal_compliance_officer", ExpectedStatus: "form_waiting_verification"},
			},
		},
		{
			ID:          IDManagerPaymentAssignProvider,
			Title:       "Приём оплаты и передача провайдеру",
			Description: "Менеджер фиксирует поступление средств, назначает провайдера и запускает исполнение",
			Tags:        []Tag{TagAPI, TagUI},
			Steps: []Step{
				{ID: "payment_received", Title: "Средства от клиента получены", Role: "manager", ExpectedStatus: "payment_received"},
				{ID: "assign_provider", Title: "Провайдер назначен, платёж в работе", Role: "manager", ExpectedStatus: "payment_processing"},
			},
		},
		{
			ID:          IDProviderPaymentNoPII,
			Title:       "Провайдер не видит личные данные клиента",
			Description: "В кабинете провайдера есть платёж, но нет персональных данных клиента (ФИО, паспорт и т.п.)",
			Tags:        []Tag{TagAPI, TagUI, TagSmoke},
			Steps: []Step{
				{ID: "provider_view", Title: "Карточка провайдера без личных данных", Role: "provider", ExpectedStatus: "payment_processing"},
			},
		},
		{
			ID:          IDBankChannelBadge,
			Title:       "Заявка от банка (не из кабинета клиента)",
			Description: "Иногда заявки приходят от банка-партнёра, а не из кабинета клиента. Проверяем, что такая заявка создаётся и в реестре видна метка «от банка»",
			Tags:        []Tag{TagAPI, TagUI},
			Steps: []Step{
				{ID: "bank_create", Title: "Тестовая заявка от банка создана и помечена", Role: "bank", ExpectedStatus: "draft"},
			},
		},
		{
			ID:          IDRootCancel,
			Title:       "Отмена заявки суперадмином",
			Description: "Суперадмин отменяет тестовую заявку",
			Tags:        []Tag{TagAPI},
			Steps: []Step{
				{ID: "cancel", Title: "Заявка отменена", Role: "root", ExpectedStatus: "canceled_by_manager"},
			},
		},
		{
			ID:          IDRefundSmoke,
			Title:       "Нельзя отменить заявку при незавершённом возврате",
			Description: "После запуска возврата средств отмена заявки блокируется системой",
			Tags:        []Tag{TagAPI, TagSmoke},
			Steps: []Step{
				{ID: "refund_init", Title: "Отмена заявки корректно запрещена", Role: "manager"},
			},
		},
		{
			ID:          IDManagerHidesDrafts,
			Title:       "Менеджер не видит черновики клиента",
			Description: "В очереди менеджера нет клиентских черновиков — только заявки, требующие его действий",
			Tags:        []Tag{TagUI},
			Steps: []Step{
				{ID: "no_draft_cta", Title: "Черновик не в очереди менеджера", Role: "manager"},
			},
		},
		{
			ID:          IDDocPreviewVisible,
			Title:       "Просмотр документа в карточке",
			Description: "У документа есть кнопка «Посмотреть», а не только «Скачать»",
			Tags:        []Tag{TagUI},
			Steps: []Step{
				{ID: "view_button", Title: "Кнопка «Посмотреть» доступна", Role: "user"},
			},
		},
		{
			ID:          IDHealthCore,
			Title:       "Платформа отвечает",
			Description: "Базовая проверка: сервис заявок доступен и отвечает «всё в порядке»",
			Tags:        []Tag{TagAPI, TagSmoke},
			Steps: []Step{
				{ID: "health", Title: "Сервис доступен"},
			},
		},
	}
}

// ByID returns a scenario or false.
func ByID(id string) (Scenario, bool) {
	for _, s := range Catalog() {
		if s.ID == id {
			return s, true
		}
	}
	return Scenario{}, false
}

// IDsWithTag returns scenario ids that include tag.
func IDsWithTag(tag Tag) []string {
	var out []string
	for _, s := range Catalog() {
		for _, t := range s.Tags {
			if t == tag {
				out = append(out, s.ID)
				break
			}
		}
	}
	return out
}

// HasTag reports whether scenario carries tag.
func HasTag(s Scenario, tag Tag) bool {
	for _, t := range s.Tags {
		if t == tag {
			return true
		}
	}
	return false
}
