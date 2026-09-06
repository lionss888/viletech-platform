package domain

type Account struct {
	ID               string `json:"id"`
	Email            string `json:"email"`
	PasswordHash     string `json:"-"`
	Role             Role   `json:"role"`
	AccountKind      AccountKind `json:"account_kind"`
	OrganizationID   string `json:"organization_id,omitempty"`
	FullName         string `json:"full_name,omitempty"`
	Phone            string `json:"phone,omitempty"`
	Passport         string `json:"passport,omitempty"`
	Blocked          bool   `json:"blocked"`
	Active           bool   `json:"active"`
	RefreshToken     string `json:"-"`
	Lang                   string `json:"lang,omitempty"`
	RateSettingsJSON       string `json:"rate_settings,omitempty"` // JSON []rate.Settings
	BankRateReadonly       bool   `json:"bank_rate_readonly,omitempty"`
	TelegramChatID         string `json:"telegram_chat_id,omitempty"`
	TelegramNotifyEnabled  bool   `json:"telegram_notify_enabled"`
	SMSNotifyEnabled       bool   `json:"sms_notify_enabled"`
	// BusinessCapOverrides / SystemCapOverrides: nil = use role template; non-nil = full replacement set.
	BusinessCapOverrides *[]string `json:"business_cap_overrides,omitempty"`
	SystemCapOverrides   *[]string `json:"system_cap_overrides,omitempty"`
}

// PublicAccount omits secrets for API responses.
func (a Account) Public() map[string]any {
	kind := a.AccountKind
	if kind == "" {
		kind = KindForRole(a.Role)
	}
	out := map[string]any{
		"id":                      a.ID,
		"email":                   a.Email,
		"role":                    a.Role,
		"account_kind":            kind,
		"organization_id":         a.OrganizationID,
		"full_name":               a.FullName,
		"phone":                   a.Phone,
		"blocked":                 a.Blocked,
		"active":                  a.Active,
		"lang":                    a.Lang,
		"telegram_linked":         a.TelegramChatID != "",
		"telegram_notify_enabled": a.TelegramNotifyEnabled,
		"sms_notify_enabled":      a.SMSNotifyEnabled,
	}
	if a.BusinessCapOverrides != nil {
		out["business_cap_overrides"] = *a.BusinessCapOverrides
	}
	if a.SystemCapOverrides != nil {
		out["system_cap_overrides"] = *a.SystemCapOverrides
	}
	return out
}

// EffectiveKind returns AccountKind with fallback from role.
func (a Account) EffectiveKind() AccountKind {
	if a.AccountKind != "" {
		return a.AccountKind
	}
	return KindForRole(a.Role)
}

type VerificationCodeKind string

const (
	CodeRegistration VerificationCodeKind = "registration"
	CodeRestore      VerificationCodeKind = "restore"
)

type VerificationCode struct {
	ID        string
	AccountID string
	Email     string
	Code      string
	Kind      VerificationCodeKind
	ExpiresAt int64 // unix seconds
}
