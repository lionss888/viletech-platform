package domain

import "context"

type Status string

const (
	StatusActive   Status = "active"
	StatusInactive Status = "inactive"
	StatusError    Status = "error"
)

type Type string

const (
	TypeCommunication Type = "communication"
	TypePayment       Type = "payment"
	TypeEDO           Type = "edo"
	TypeOCR           Type = "ocr"
	TypePartner       Type = "partner"
)

type Plugin interface {
	Name() string
	Version() string
	Type() Type
	Actions() []string
	Execute(ctx context.Context, action string, params map[string]any) (map[string]any, error)
	HealthCheck(ctx context.Context) error
}
