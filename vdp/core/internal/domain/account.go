package domain

type Account struct {
	ID               string `json:"id"`
	Email            string `json:"email"`
	PasswordHash     string `json:"-"`
	Role             Role   `json:"role"`
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
}

// PublicAccount omits secrets for API responses.
func (a Account) Public() map[string]any {
	return map[string]any{
		"id":                      a.ID,
		"email":                   a.Email,
		"role":                    a.Role,
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
