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
			Title:       "Happy path to completed",
			Description: "User submit → compliance → manager → provider → report → completed",
			Tags:        []Tag{TagAPI, TagUI, TagSmoke},
			Steps: []Step{
				{ID: "create_submit", Title: "User create and submit", Role: "user", ExpectedStatus: "form_waiting_verification"},
				{ID: "compliance", Title: "ICO/ECO accept", Role: "compliance_officer", ExpectedStatus: "form_accepted"},
				{ID: "order_payment", Title: "Manager order and payment_received", Role: "manager", ExpectedStatus: "payment_received"},
				{ID: "provider_sent", Title: "Provider payment sent", Role: "provider", ExpectedStatus: "payment_sent"},
				{ID: "completed", Title: "Manager close", Role: "manager", ExpectedStatus: "completed"},
			},
		},
		{
			ID:          IDEcoRejectResubmit,
			Title:       "ECO reject and user resubmit",
			Description: "ECO reject → form_waiting_corrections → user accept-corrections",
			Tags:        []Tag{TagAPI, TagUI},
			Steps: []Step{
				{ID: "reject", Title: "ECO reject", Role: "compliance_officer", ExpectedStatus: "form_waiting_corrections"},
				{ID: "resubmit", Title: "User resubmit corrections", Role: "user", ExpectedStatus: "form_waiting_verification"},
			},
		},
		{
			ID:          IDIcoOrgPendingApprove,
			Title:       "ICO org pending approve",
			Description: "When org pending: ICO approve org and form",
			Tags:        []Tag{TagAPI, TagUI},
			Steps: []Step{
				{ID: "org_waiting", Title: "Submit lands on org waiting", Role: "user", ExpectedStatus: "organization_waiting_verification"},
				{ID: "ico_accept", Title: "ICO start and accept", Role: "internal_compliance_officer", ExpectedStatus: "form_waiting_verification"},
			},
		},
		{
			ID:          IDManagerPaymentAssignProvider,
			Title:       "Manager payment and assign provider",
			Description: "form_accepted → order → payment_received → assign provider → payment start",
			Tags:        []Tag{TagAPI, TagUI},
			Steps: []Step{
				{ID: "payment_received", Title: "Manager payment received", Role: "manager", ExpectedStatus: "payment_received"},
				{ID: "assign_provider", Title: "Assign provider and start", Role: "manager", ExpectedStatus: "payment_processing"},
			},
		},
		{
			ID:          IDProviderPaymentNoPII,
			Title:       "Provider payment without client PII",
			Description: "Provider view has no client PII fields",
			Tags:        []Tag{TagAPI, TagUI, TagSmoke},
			Steps: []Step{
				{ID: "provider_view", Title: "Provider GET form has no PII keys", Role: "provider", ExpectedStatus: "payment_processing"},
			},
		},
		{
			ID:          IDBankChannelBadge,
			Title:       "Bank channel badge",
			Description: "Bank API create yields channel=bank",
			Tags:        []Tag{TagAPI, TagUI},
			Steps: []Step{
				{ID: "bank_create", Title: "POST bank forms", Role: "bank", ExpectedStatus: "draft"},
			},
		},
		{
			ID:          IDRootCancel,
			Title:       "Root cancel form",
			Description: "Root cancels a draft/probe form",
			Tags:        []Tag{TagAPI},
			Steps: []Step{
				{ID: "cancel", Title: "Root cancel", Role: "root", ExpectedStatus: "canceled_by_manager"},
			},
		},
		{
			ID:          IDRefundSmoke,
			Title:       "Refund cancel invariant smoke",
			Description: "Refund init then cancel returns 409",
			Tags:        []Tag{TagAPI, TagSmoke},
			Steps: []Step{
				{ID: "refund_init", Title: "Refund init then cancel blocked", Role: "manager"},
			},
		},
		{
			ID:          IDManagerHidesDrafts,
			Title:       "Manager hides client drafts",
			Description: "UI: manager registry does not list creating/draft as actionable queue items",
			Tags:        []Tag{TagUI},
			Steps: []Step{
				{ID: "no_draft_cta", Title: "Manager does not see draft primary CTA", Role: "manager"},
			},
		},
		{
			ID:          IDDocPreviewVisible,
			Title:       "Document preview visible",
			Description: "UI: document row exposes View control",
			Tags:        []Tag{TagUI},
			Steps: []Step{
				{ID: "view_button", Title: "Посмотреть control present", Role: "user"},
			},
		},
		{
			ID:          IDHealthCore,
			Title:       "Core health",
			Description: "GET /api/v1/health returns ok",
			Tags:        []Tag{TagAPI, TagSmoke},
			Steps: []Step{
				{ID: "health", Title: "Health ok"},
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
