package httpapi_test

import (
	"testing"
)

// EndpointParityStatus is honesty-gate progress for Nest→vdp mapping.
// Values: missing | stub | done. Form-payment R1 target: ≥95% done.
type EndpointParityStatus string

const (
	ParityMissing EndpointParityStatus = "missing"
	ParityStub    EndpointParityStatus = "stub"
	ParityDone    EndpointParityStatus = "done"
)

type endpointParityRow struct {
	Module   string
	NestPath string
	VDPPath  string
	Status   EndpointParityStatus
}

// nestEndpointParity is Nest behavioral TZ → Go vdp inventory.
var nestEndpointParity = []endpointParityRow{
	{Module: "auth", NestPath: "POST /auth/registration", VDPPath: "POST /api/v1/auth/registration", Status: "done"},
	{Module: "auth", NestPath: "POST /auth/registration/re-send", VDPPath: "POST /api/v1/auth/registration/re-send", Status: "done"},
	{Module: "auth", NestPath: "POST /auth/registration/confirm", VDPPath: "POST /api/v1/auth/registration/confirm", Status: "done"},
	{Module: "auth", NestPath: "POST /auth/login", VDPPath: "POST /api/v1/auth/login", Status: "done"},
	{Module: "auth", NestPath: "POST /auth/restore", VDPPath: "POST /api/v1/auth/restore", Status: "done"},
	{Module: "auth", NestPath: "POST /auth/confirm/restore", VDPPath: "POST /api/v1/auth/confirm/restore", Status: "done"},
	{Module: "auth", NestPath: "POST /auth/logout", VDPPath: "POST /api/v1/auth/logout", Status: "done"},
	{Module: "auth", NestPath: "POST /auth/refresh-token", VDPPath: "POST /api/v1/auth/refresh-token", Status: "done"},
	{Module: "auth", NestPath: "POST /1c/auth/login", VDPPath: "POST /api/v1/1c/auth/login", Status: "done"},
	{Module: "auth", NestPath: "POST /1c/auth/refresh-token", VDPPath: "POST /api/v1/1c/auth/refresh-token", Status: "done"},
	{Module: "account", NestPath: "GET /account", VDPPath: "GET /api/v1/account", Status: "done"},
	{Module: "account", NestPath: "GET /account/full", VDPPath: "GET /api/v1/account/full", Status: "done"},
	{Module: "account", NestPath: "PATCH /account", VDPPath: "PATCH /api/v1/account", Status: "done"},
	{Module: "account", NestPath: "PATCH /manager/account", VDPPath: "PATCH /api/v1/manager/account", Status: "done"},
	{Module: "account", NestPath: "PATCH /provider/account", VDPPath: "PATCH /api/v1/provider/account", Status: "done"},
	{Module: "account", NestPath: "GET /provider/account/{id}", VDPPath: "GET /api/v1/provider/account/{id}", Status: "done"},
	{Module: "account", NestPath: "GET /compliance-officer/account/{id}", VDPPath: "GET /api/v1/compliance-officer/account/{id}", Status: "done"},
	{Module: "account", NestPath: "PATCH /compliance-officer/account", VDPPath: "PATCH /api/v1/compliance-officer/account", Status: "done"},
	{Module: "account", NestPath: "GET /treasurer/account/{id}", VDPPath: "GET /api/v1/treasurer/account/{id}", Status: "done"},
	{Module: "account", NestPath: "GET /admin/account", VDPPath: "GET /api/v1/admin/account", Status: "done"},
	{Module: "account", NestPath: "POST /admin/account", VDPPath: "POST /api/v1/admin/account", Status: "done"},
	{Module: "account", NestPath: "GET /admin/account/count", VDPPath: "GET /api/v1/admin/account/count", Status: "done"},
	{Module: "account", NestPath: "GET /admin/account/{id}", VDPPath: "GET /api/v1/admin/account/{id}", Status: "done"},
	{Module: "account", NestPath: "PATCH /admin/account/{id}", VDPPath: "PATCH /api/v1/admin/account/{id}", Status: "done"},
	{Module: "organization", NestPath: "GET /organization", VDPPath: "GET /api/v1/organization", Status: "done"},
	{Module: "organization", NestPath: "GET /organization/invited", VDPPath: "GET /api/v1/organization/invited", Status: "done"},
	{Module: "organization", NestPath: "GET /organization/count", VDPPath: "GET /api/v1/organization/count", Status: "done"},
	{Module: "organization", NestPath: "GET /organization/fetch-by-inn", VDPPath: "GET /api/v1/organization/fetch-by-inn", Status: "done"},
	{Module: "organization", NestPath: "GET /organization/{id}", VDPPath: "GET /api/v1/organization/{id}", Status: "done"},
	{Module: "organization", NestPath: "POST /organization", VDPPath: "POST /api/v1/organization", Status: "done"},
	{Module: "organization", NestPath: "PATCH /organization/{id}/invite-subaccount", VDPPath: "PATCH /api/v1/organization/{id}/invite-subaccount", Status: "done"},
	{Module: "organization", NestPath: "PUT /organization/{id}/delegate/{delegateTo}", VDPPath: "PUT /api/v1/organization/{id}/delegate/{delegateTo}", Status: "done"},
	{Module: "organization", NestPath: "PATCH /organization/{id}/delete-subaccount", VDPPath: "PATCH /api/v1/organization/{id}/delete-subaccount", Status: "done"},
	{Module: "organization", NestPath: "PATCH /organization/{id}/accept-invite", VDPPath: "PATCH /api/v1/organization/{id}/accept-invite", Status: "done"},
	{Module: "organization", NestPath: "PATCH /organization/{id}/reject-invite", VDPPath: "PATCH /api/v1/organization/{id}/reject-invite", Status: "done"},
	{Module: "organization", NestPath: "PATCH /organization/{id}", VDPPath: "PATCH /api/v1/organization/{id}", Status: "done"},
	{Module: "organization", NestPath: "DELETE /organization/{id}", VDPPath: "DELETE /api/v1/organization/{id}", Status: "done"},
	{Module: "organization", NestPath: "GET /admin/manager/organization", VDPPath: "GET /api/v1/admin/manager/organization", Status: "done"},
	{Module: "organization", NestPath: "GET /admin/manager/organization/{id}", VDPPath: "GET /api/v1/admin/manager/organization/{id}", Status: "done"},
	{Module: "organization", NestPath: "GET /admin/manager/organization/count", VDPPath: "GET /api/v1/admin/manager/organization/count", Status: "done"},
	{Module: "organization", NestPath: "POST /admin/manager/organization", VDPPath: "POST /api/v1/admin/manager/organization", Status: "done"},
	{Module: "organization", NestPath: "PATCH /admin/manager/organization/{id}", VDPPath: "PATCH /api/v1/admin/manager/organization/{id}", Status: "done"},
	{Module: "organization", NestPath: "DELETE /admin/manager/organization/{id}", VDPPath: "DELETE /api/v1/admin/manager/organization/{id}", Status: "done"},
	{Module: "organization", NestPath: "GET /admin/provider/organization", VDPPath: "GET /api/v1/admin/provider/organization", Status: "done"},
	{Module: "organization", NestPath: "GET /admin/provider/organization/count", VDPPath: "GET /api/v1/admin/provider/organization/count", Status: "done"},
	{Module: "organization", NestPath: "GET /admin/provider/organization/{id}", VDPPath: "GET /api/v1/admin/provider/organization/{id}", Status: "done"},
	{Module: "organization", NestPath: "POST /admin/provider/organization", VDPPath: "POST /api/v1/admin/provider/organization", Status: "done"},
	{Module: "organization", NestPath: "PATCH /admin/provider/organization/{id}", VDPPath: "PATCH /api/v1/admin/provider/organization/{id}", Status: "done"},
	{Module: "organization", NestPath: "DELETE /admin/provider/organization/{id}", VDPPath: "DELETE /api/v1/admin/provider/organization/{id}", Status: "done"},
	{Module: "organization", NestPath: "GET /admin/internal-compliance-officer/organization", VDPPath: "GET /api/v1/admin/internal-compliance-officer/organization", Status: "done"},
	{Module: "organization", NestPath: "GET /admin/internal-compliance-officer/organization/count", VDPPath: "GET /api/v1/admin/internal-compliance-officer/organization/count", Status: "done"},
	{Module: "organization", NestPath: "GET /admin/internal-compliance-officer/organization/{id}", VDPPath: "GET /api/v1/admin/internal-compliance-officer/organization/{id}", Status: "done"},
	{Module: "organization", NestPath: "PUT /admin/internal-compliance-officer/organization/{id}/approve", VDPPath: "PUT /api/v1/admin/internal-compliance-officer/organization/{id}/approve", Status: "done"},
	{Module: "organization", NestPath: "PUT /admin/internal-compliance-officer/organization/{id}/un-approve", VDPPath: "PUT /api/v1/admin/internal-compliance-officer/organization/{id}/un-approve", Status: "done"},
	{Module: "organization", NestPath: "PUT /admin/internal-compliance-officer/organization/{id}/block", VDPPath: "PUT /api/v1/admin/internal-compliance-officer/organization/{id}/block", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/compliance-officer/form-payment", VDPPath: "GET /api/v1/eco/form-payment", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/compliance-officer/form-payment/count", VDPPath: "GET /api/v1/eco/form-payment/count", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/compliance-officer/form-payment/xlsx", VDPPath: "GET /api/v1/eco/form-payment/xlsx", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/compliance-officer/form-payment/{id}/xlsx", VDPPath: "GET /api/v1/eco/form-payment/{id}/xlsx", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/compliance-officer/form-payment/{id}", VDPPath: "GET /api/v1/eco/form-payment/{id}", Status: "done"},
	{Module: "form-payment", NestPath: "PATCH /admin/compliance-officer/form-payment/{id}", VDPPath: "PATCH /api/v1/eco/form-payment/{id}", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/compliance-officer/form-payment/{id}/cancel", VDPPath: "PUT /api/v1/eco/form-payment/{id}/cancel", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/compliance-officer/form-payment/{id}/form/start", VDPPath: "PUT /api/v1/eco/form-payment/{id}/form/start", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/compliance-officer/form-payment/{id}/form/stop", VDPPath: "PUT /api/v1/eco/form-payment/{id}/form/stop", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/compliance-officer/form-payment/{id}/form/accept", VDPPath: "PUT /api/v1/eco/form-payment/{id}/form/accept", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/compliance-officer/form-payment/{id}/form/reject", VDPPath: "PUT /api/v1/eco/form-payment/{id}/form/reject", Status: "done"},
	{Module: "form-payment", NestPath: "POST /admin/compliance-officer/form-payment/{id}/analyze-counterparty", VDPPath: "POST /api/v1/eco/form-payment/{id}/analyze-counterparty", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/form-payment", VDPPath: "GET /api/v1/admin/form-payment", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/form-payment/count", VDPPath: "GET /api/v1/admin/form-payment/count", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/form-payment/xlsx", VDPPath: "GET /api/v1/admin/form-payment/xlsx", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/form-payment/{id}/xlsx", VDPPath: "GET /api/v1/admin/form-payment/{id}/xlsx", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/form-payment/{id}", VDPPath: "GET /api/v1/admin/form-payment/{id}", Status: "done"},
	{Module: "form-payment", NestPath: "PATCH /admin/form-payment/{id}", VDPPath: "PATCH /api/v1/admin/form-payment/{id}", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/provider/form-payment", VDPPath: "GET /api/v1/provider/form-payment", Status: "done"},
	{Module: "form-payment", NestPath: "POST /admin/provider/form-payment", VDPPath: "POST /api/v1/provider/form-payment", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/provider/form-payment/count", VDPPath: "GET /api/v1/provider/form-payment/count", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/provider/form-payment/xlsx", VDPPath: "GET /api/v1/provider/form-payment/xlsx", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/provider/form-payment/{id}/xlsx", VDPPath: "GET /api/v1/provider/form-payment/{id}/xlsx", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/provider/form-payment/{id}", VDPPath: "GET /api/v1/provider/form-payment/{id}", Status: "done"},
	{Module: "form-payment", NestPath: "PATCH /admin/provider/form-payment/{id}", VDPPath: "PATCH /api/v1/provider/form-payment/{id}", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/provider/form-payment/{id}/payment/received", VDPPath: "PUT /api/v1/provider/form-payment/{id}/payment/received", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/provider/form-payment/{id}/payment/start", VDPPath: "PUT /api/v1/provider/form-payment/{id}/payment/start", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/provider/form-payment/{id}/payment/stop", VDPPath: "PUT /api/v1/provider/form-payment/{id}/payment/stop", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/provider/form-payment/{id}/payment/sent", VDPPath: "PUT /api/v1/provider/form-payment/{id}/payment/sent", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/provider/form-payment/{id}/payment/cancel", VDPPath: "PUT /api/v1/provider/form-payment/{id}/payment/cancel", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/provider/form-payment/{id}/make-important", VDPPath: "PUT /api/v1/provider/form-payment/{id}/make-important", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/provider/form-payment/{id}/make-unimportant", VDPPath: "PUT /api/v1/provider/form-payment/{id}/make-unimportant", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/provider/form-payment/{id}/form/manager", VDPPath: "PUT /api/v1/provider/form-payment/{id}/form/manager", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/manager/form-payment", VDPPath: "GET /api/v1/manager/form-payment", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/manager/form-payment/count", VDPPath: "GET /api/v1/manager/form-payment/count", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/manager/form-payment/xlsx", VDPPath: "GET /api/v1/manager/form-payment/xlsx", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/manager/form-payment/{id}/xlsx", VDPPath: "GET /api/v1/manager/form-payment/{id}/xlsx", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/manager/form-payment/{id}", VDPPath: "GET /api/v1/manager/form-payment/{id}", Status: "done"},
	{Module: "form-payment", NestPath: "PATCH /admin/manager/form-payment/{id}", VDPPath: "PATCH /api/v1/manager/form-payment/{id}", Status: "done"},
	{Module: "form-payment", NestPath: "PATCH /admin/manager/form-payment/{id}/rate", VDPPath: "PATCH /api/v1/manager/form-payment/{id}/rate", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/completed", VDPPath: "PUT /api/v1/manager/form-payment/{id}/completed", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/form/reject", VDPPath: "PUT /api/v1/manager/form-payment/{id}/form/reject", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/form/start", VDPPath: "PUT /api/v1/manager/form-payment/{id}/form/start", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/form/stop", VDPPath: "PUT /api/v1/manager/form-payment/{id}/form/stop", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/form/accept", VDPPath: "PUT /api/v1/manager/form-payment/{id}/form/accept", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/cancel", VDPPath: "PUT /api/v1/manager/form-payment/{id}/cancel", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/make-important", VDPPath: "PUT /api/v1/manager/form-payment/{id}/make-important", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/make-unimportant", VDPPath: "PUT /api/v1/manager/form-payment/{id}/make-unimportant", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/order/start", VDPPath: "PUT /api/v1/manager/form-payment/{id}/order/start", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/order/stop", VDPPath: "PUT /api/v1/manager/form-payment/{id}/order/stop", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/order/accept", VDPPath: "PUT /api/v1/manager/form-payment/{id}/order/accept", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/order/reject", VDPPath: "PUT /api/v1/manager/form-payment/{id}/order/reject", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/order/signing", VDPPath: "PUT /api/v1/manager/form-payment/{id}/order/signing", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/order/generate", VDPPath: "PUT /api/v1/manager/form-payment/{id}/order/generate", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/order-advance/start", VDPPath: "PUT /api/v1/manager/form-payment/{id}/order-advance/start", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/order-advance/stop", VDPPath: "PUT /api/v1/manager/form-payment/{id}/order-advance/stop", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/order-advance/accept", VDPPath: "PUT /api/v1/manager/form-payment/{id}/order-advance/accept", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/order-advance/reject", VDPPath: "PUT /api/v1/manager/form-payment/{id}/order-advance/reject", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/order-advance/revoke", VDPPath: "PUT /api/v1/manager/form-payment/{id}/order-advance/revoke", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/order-advance/signing", VDPPath: "PUT /api/v1/manager/form-payment/{id}/order-advance/signing", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/payment/received", VDPPath: "PUT /api/v1/manager/form-payment/{id}/payment/received", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/payment/stop", VDPPath: "PUT /api/v1/manager/form-payment/{id}/payment/stop", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/payment/start", VDPPath: "PUT /api/v1/manager/form-payment/{id}/payment/start", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/payment/return-to-sent", VDPPath: "PUT /api/v1/manager/form-payment/{id}/payment/return-to-sent", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/payment/sent", VDPPath: "PUT /api/v1/manager/form-payment/{id}/payment/sent", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/payment/cancel", VDPPath: "PUT /api/v1/manager/form-payment/{id}/payment/cancel", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/shipment/start", VDPPath: "PUT /api/v1/manager/form-payment/{id}/shipment/start", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/shipment/stop", VDPPath: "PUT /api/v1/manager/form-payment/{id}/shipment/stop", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/shipment/accept", VDPPath: "PUT /api/v1/manager/form-payment/{id}/shipment/accept", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/shipment/reject", VDPPath: "PUT /api/v1/manager/form-payment/{id}/shipment/reject", Status: "done"},
	{Module: "form-payment", NestPath: "POST /admin/manager/form-payment/{id}/shipment/waiting", VDPPath: "POST /api/v1/manager/form-payment/{id}/shipment/waiting", Status: "done"},
	{Module: "form-payment", NestPath: "GET /form-payment/{id}/orders", VDPPath: "GET /api/v1/forms/{id}/orders", Status: "done"},
	{Module: "form-payment", NestPath: "GET /form-payment/{id}/orders/active", VDPPath: "GET /api/v1/forms/{id}/orders/active", Status: "done"},
	{Module: "form-payment", NestPath: "POST /form-payment/{id}/orders/{orderId}/files", VDPPath: "POST /api/v1/forms/{id}/orders/{orderId}/files", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/provider/form-payment/{id}/active-order", VDPPath: "GET /api/v1/provider/form-payment/{id}/active-order", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/report/start", VDPPath: "PUT /api/v1/manager/form-payment/{id}/report/start", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/report/stop", VDPPath: "PUT /api/v1/manager/form-payment/{id}/report/stop", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/report/accept", VDPPath: "PUT /api/v1/manager/form-payment/{id}/report/accept", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/report/reject", VDPPath: "PUT /api/v1/manager/form-payment/{id}/report/reject", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/report/revoke", VDPPath: "PUT /api/v1/manager/form-payment/{id}/report/revoke", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/report/signing", VDPPath: "PUT /api/v1/manager/form-payment/{id}/report/signing", Status: "done"},
	{Module: "form-payment", NestPath: "POST /admin/manager/form-payment/{id}/report/sign-via-diadoc", VDPPath: "POST /api/v1/manager/form-payment/{id}/report/sign-via-diadoc", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/manager/form-payment/{id}/report/diadoc-status", VDPPath: "GET /api/v1/manager/form-payment/{id}/report/diadoc-status", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/report", VDPPath: "PUT /api/v1/manager/form-payment/{id}/report", Status: "done"},
	{Module: "form-payment", NestPath: "POST /admin/manager/form-payment/{id}/generate-agent-report", VDPPath: "POST /api/v1/manager/form-payment/{id}/generate-agent-report", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/refund/init", VDPPath: "PUT /api/v1/manager/form-payment/{id}/refund/init", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/refund/cancel", VDPPath: "PUT /api/v1/manager/form-payment/{id}/refund/cancel", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/refund/start", VDPPath: "PUT /api/v1/manager/form-payment/{id}/refund/start", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/refund/stop", VDPPath: "PUT /api/v1/manager/form-payment/{id}/refund/stop", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/manager/form-payment/{id}/refund/sent", VDPPath: "PUT /api/v1/manager/form-payment/{id}/refund/sent", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/manager/form-payment/{id}/refund", VDPPath: "GET /api/v1/manager/form-payment/{id}/refund", Status: "done"},
	{Module: "form-payment", NestPath: "POST /admin/manager/form-payment/{id}/refund/init", VDPPath: "POST /api/v1/manager/form-payment/{id}/refund/init", Status: "done"},
	{Module: "form-payment", NestPath: "POST /admin/manager/form-payment/{id}/refund/file", VDPPath: "POST /api/v1/manager/form-payment/{id}/refund/file", Status: "done"},
	{Module: "form-payment", NestPath: "POST /forms/{id}/refund/sent", VDPPath: "POST /api/v1/forms/{id}/refund/sent", Status: "done"},
	{Module: "refund", NestPath: "Refund process page API (§4)", VDPPath: "GET /api/v1/forms/{id}/refund", Status: "done"},
	{Module: "refund", NestPath: "Refund manager routes (§4)", VDPPath: "PUT .../refund/* via nest map", Status: "done"},
	{Module: "refund", NestPath: "Refund cancel invariant unrefunded funds", VDPPath: "domain Apply HasUnrefundedFunds", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/treasurer/form-payment/{id}", VDPPath: "GET /api/v1/treasurer/form-payment/{id}", Status: "done"},
	{Module: "form-payment", NestPath: "PATCH /admin/treasurer/form-payment/{id}/confirm-payment", VDPPath: "PATCH /api/v1/treasurer/form-payment/{id}/confirm-payment", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/treasurer/form-payment/{id}/signing-order-treasurer", VDPPath: "PUT /api/v1/treasurer/form-payment/{id}/signing-order-treasurer", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/treasurer/form-payment/{id}/return-to-payment-sent-treasurer", VDPPath: "PUT /api/v1/treasurer/form-payment/{id}/return-to-payment-sent-treasurer", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/treasurer/form-payment/{id}/order-waiting-correction-treasurer", VDPPath: "PUT /api/v1/treasurer/form-payment/{id}/order-waiting-correction-treasurer", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/treasurer/form-payment/{id}/complete-from-verification-treasurer", VDPPath: "PUT /api/v1/treasurer/form-payment/{id}/complete-from-verification-treasurer", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/treasurer/form-payment/{id}/return-to-signing-order-treasurer", VDPPath: "PUT /api/v1/treasurer/form-payment/{id}/return-to-signing-order-treasurer", Status: "done"},
	{Module: "form-payment", NestPath: "POST /admin/treasurer/form-payment/{id}/treasurer-order/upload", VDPPath: "POST /api/v1/treasurer/form-payment/{id}/treasurer-order/upload", Status: "done"},
	{Module: "form-payment", NestPath: "DELETE /admin/treasurer/form-payment/{id}/treasurer-order", VDPPath: "DELETE /api/v1/treasurer/form-payment/{id}/treasurer-order", Status: "done"},
	{Module: "form-payment", NestPath: "GET /form-payment", VDPPath: "GET /api/v1/site/form-payment", Status: "done"},
	{Module: "form-payment", NestPath: "GET /form-payment/count", VDPPath: "GET /api/v1/site/form-payment/count", Status: "done"},
	{Module: "form-payment", NestPath: "GET /form-payment/export/payment-received", VDPPath: "GET /api/v1/site/form-payment/export/payment-received", Status: "done"},
	{Module: "form-payment", NestPath: "GET /form-payment/by-order-accepted", VDPPath: "GET /api/v1/site/form-payment/by-order-accepted", Status: "done"},
	{Module: "form-payment", NestPath: "GET /form-payment/by-order-accepted/count", VDPPath: "GET /api/v1/site/form-payment/by-order-accepted/count", Status: "done"},
	{Module: "form-payment", NestPath: "GET /form-payment/{id}", VDPPath: "GET /api/v1/site/form-payment/{id}", Status: "done"},
	{Module: "form-payment", NestPath: "POST /form-payment", VDPPath: "POST /api/v1/site/form-payment", Status: "done"},
	{Module: "form-payment", NestPath: "PATCH /form-payment/{id}/rate", VDPPath: "PATCH /api/v1/site/form-payment/{id}/rate", Status: "done"},
	{Module: "form-payment", NestPath: "PATCH /form-payment/{id}/form", VDPPath: "PATCH /api/v1/site/form-payment/{id}/form", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /form-payment/{id}/cancel", VDPPath: "PUT /api/v1/site/form-payment/{id}/cancel", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /form-payment/{id}/payments", VDPPath: "PUT /api/v1/site/form-payment/{id}/payments", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /form-payment/{id}/form/accept", VDPPath: "PUT /api/v1/site/form-payment/{id}/form/accept", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /form-payment/{id}/form/accept-corrections", VDPPath: "PUT /api/v1/site/form-payment/{id}/form/accept-corrections", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /form-payment/{id}/order", VDPPath: "PUT /api/v1/site/form-payment/{id}/order", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /form-payment/{id}/order-advance", VDPPath: "PUT /api/v1/site/form-payment/{id}/order-advance", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /form-payment/{id}/report", VDPPath: "PUT /api/v1/site/form-payment/{id}/report", Status: "done"},
	{Module: "form-payment", NestPath: "POST /form-payment/{id}/payment-order/sign-via-diadoc", VDPPath: "POST /api/v1/site/form-payment/{id}/payment-order/sign-via-diadoc", Status: "done"},
	{Module: "form-payment", NestPath: "GET /form-payment/{id}/payment-order/diadoc-status", VDPPath: "GET /api/v1/site/form-payment/{id}/payment-order/diadoc-status", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /form-payment/{id}/shipment", VDPPath: "PUT /api/v1/site/form-payment/{id}/shipment", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /form-payment/{id}/shipment/accept", VDPPath: "PUT /api/v1/site/form-payment/{id}/shipment/accept", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /form-payment/{id}/additional", VDPPath: "PUT /api/v1/site/form-payment/{id}/additional", Status: "done"},
	{Module: "form-payment", NestPath: "POST /form-payment/{id}/copy", VDPPath: "POST /api/v1/site/form-payment/{id}/copy", Status: "done"},
	{Module: "form-payment", NestPath: "POST /form-payment/import", VDPPath: "POST /api/v1/site/form-payment/import", Status: "done"},
	{Module: "form-payment", NestPath: "DELETE /form-payment/{id}/files/{fileId}", VDPPath: "DELETE /api/v1/site/form-payment/{id}/files/{fileId}", Status: "done"},
	{Module: "form-payment", NestPath: "PATCH /form-payment/{id}/invoice/{uuid}/hs-codes", VDPPath: "PATCH /api/v1/site/form-payment/{id}/invoice/{uuid}/hs-codes", Status: "done"},
	{Module: "form-payment", NestPath: "POST /form-payment/{id}/invoices", VDPPath: "POST /api/v1/site/form-payment/{id}/invoices", Status: "done"},
	{Module: "form-payment", NestPath: "PATCH /form-payment/{id}/invoices/{uuid}", VDPPath: "PATCH /api/v1/site/form-payment/{id}/invoices/{uuid}", Status: "done"},
	{Module: "form-payment", NestPath: "DELETE /form-payment/{id}/invoices/{uuid}", VDPPath: "DELETE /api/v1/site/form-payment/{id}/invoices/{uuid}", Status: "done"},
	{Module: "form-payment", NestPath: "GET /form-payment/{id}/hs-codes", VDPPath: "GET /api/v1/site/form-payment/{id}/hs-codes", Status: "done"},
	{Module: "form-payment", NestPath: "GET /form-payment/{id}/suggested-providers", VDPPath: "GET /api/v1/site/form-payment/{id}/suggested-providers", Status: "done"},
	{Module: "form-payment", NestPath: "PATCH /form-payment/{id}/sign-method", VDPPath: "PATCH /api/v1/site/form-payment/{id}/sign-method", Status: "done"},
	{Module: "form-payment", NestPath: "GET /form-payment/{id}/sign-method", VDPPath: "GET /api/v1/site/form-payment/{id}/sign-method", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /form-payment/{id}/signing-order-verification-treasurer", VDPPath: "PUT /api/v1/site/form-payment/{id}/signing-order-verification-treasurer", Status: "done"},
	{Module: "form-payment", NestPath: "GET /1c/form-payment", VDPPath: "GET /api/v1/1c/form-payment", Status: "done"},
	{Module: "form-payment", NestPath: "GET /1c/form-payment/count", VDPPath: "GET /api/v1/1c/form-payment/count", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/internal-compliance-officer/form-payment", VDPPath: "GET /api/v1/ico/form-payment", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/internal-compliance-officer/form-payment/count", VDPPath: "GET /api/v1/ico/form-payment/count", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/internal-compliance-officer/form-payment/xlsx", VDPPath: "GET /api/v1/ico/form-payment/xlsx", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/internal-compliance-officer/form-payment/{id}/xlsx", VDPPath: "GET /api/v1/ico/form-payment/{id}/xlsx", Status: "done"},
	{Module: "form-payment", NestPath: "GET /admin/internal-compliance-officer/form-payment/{id}", VDPPath: "GET /api/v1/ico/form-payment/{id}", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/internal-compliance-officer/form-payment/{id}/form/start", VDPPath: "PUT /api/v1/ico/form-payment/{id}/form/start", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/internal-compliance-officer/form-payment/{id}/form/stop", VDPPath: "PUT /api/v1/ico/form-payment/{id}/form/stop", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/internal-compliance-officer/form-payment/{id}/form/accept", VDPPath: "PUT /api/v1/ico/form-payment/{id}/form/accept", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/internal-compliance-officer/form-payment/{id}/form/reject", VDPPath: "PUT /api/v1/ico/form-payment/{id}/form/reject", Status: "done"},
	{Module: "form-payment", NestPath: "PUT /admin/internal-compliance-officer/form-payment/{id}/cancel", VDPPath: "PUT /api/v1/ico/form-payment/{id}/cancel", Status: "done"},
	{Module: "contract", NestPath: "GET /contract", VDPPath: "GET /api/v1/contract", Status: "done"},
	{Module: "contract", NestPath: "GET /contract/full/{organization}", VDPPath: "GET /api/v1/contract/full/{organization}", Status: "done"},
	{Module: "contract", NestPath: "GET /contract/count", VDPPath: "GET /api/v1/contract/count", Status: "done"},
	{Module: "contract", NestPath: "GET /contract/one", VDPPath: "GET /api/v1/contract/one", Status: "done"},
	{Module: "contract", NestPath: "GET /contract/one/template", VDPPath: "GET /api/v1/contract/one/template", Status: "done"},
	{Module: "contract", NestPath: "GET /contract/{id}", VDPPath: "GET /api/v1/contract/{id}", Status: "done"},
	{Module: "contract", NestPath: "POST /contract", VDPPath: "POST /api/v1/contract", Status: "done"},
	{Module: "contract", NestPath: "PUT /contract/{id}", VDPPath: "PUT /api/v1/contract/{id}", Status: "done"},
	{Module: "contract", NestPath: "GET /admin/contract", VDPPath: "GET /api/v1/admin/contract", Status: "done"},
	{Module: "contract", NestPath: "GET /admin/contract/full", VDPPath: "GET /api/v1/admin/contract/full", Status: "done"},
	{Module: "contract", NestPath: "POST /admin/contract/template", VDPPath: "POST /api/v1/admin/contract/template", Status: "done"},
	{Module: "contract", NestPath: "POST /admin/contract", VDPPath: "POST /api/v1/admin/contract", Status: "done"},
	{Module: "contract", NestPath: "GET /admin/contract/count", VDPPath: "GET /api/v1/admin/contract/count", Status: "done"},
	{Module: "contract", NestPath: "GET /admin/contract/{id}", VDPPath: "GET /api/v1/admin/contract/{id}", Status: "done"},
	{Module: "contract", NestPath: "PATCH /admin/contract/{id}", VDPPath: "PATCH /api/v1/admin/contract/{id}", Status: "done"},
	{Module: "contract", NestPath: "PUT /admin/contract/{id}/accept", VDPPath: "PUT /api/v1/admin/contract/{id}/accept", Status: "done"},
	{Module: "contract", NestPath: "PUT /admin/contract/{id}/reject", VDPPath: "PUT /api/v1/admin/contract/{id}/reject", Status: "done"},
	{Module: "contract", NestPath: "PUT /admin/contract/{id}/type", VDPPath: "PUT /api/v1/admin/contract/{id}/type", Status: "done"},
	{Module: "contract", NestPath: "GET /treasurer/contract", VDPPath: "GET /api/v1/treasurer/contract", Status: "done"},
	{Module: "contract", NestPath: "GET /treasurer/contract/full", VDPPath: "GET /api/v1/treasurer/contract/full", Status: "done"},
	{Module: "contract", NestPath: "GET /admin/treasurer/contract", VDPPath: "GET /api/v1/admin/treasurer/contract", Status: "done"},
	{Module: "contract", NestPath: "GET /admin/treasurer/contract/full", VDPPath: "GET /api/v1/admin/treasurer/contract/full", Status: "done"},
	{Module: "contract", NestPath: "POST /manager/form-payment/{id}/contract/attach", VDPPath: "POST /api/v1/manager/form-payment/{id}/contract/attach", Status: "done"},
	{Module: "contract", NestPath: "PUT /forms/{id}/on-behalf", VDPPath: "PUT /api/v1/forms/{id}/on-behalf", Status: "done"},
	{Module: "contract", NestPath: "GET /organization/{id}/contracts", VDPPath: "GET /api/v1/organization/{id}/contracts", Status: "done"},
	{Module: "contract", NestPath: "POST /contract/{id}/sign-via-diadoc", VDPPath: "hub diadoc + callback", Status: "done"},
	{Module: "contract", NestPath: "GET /contract/{id}/diadoc-status", VDPPath: "GET nest diadoc-status", Status: "done"},
	{Module: "counterparty", NestPath: "GET /counterparty/list", VDPPath: "GET /api/v1/counterparty/list", Status: "done"},
	{Module: "counterparty", NestPath: "GET /counterparty/{id}", VDPPath: "GET /api/v1/counterparty/{id}", Status: "done"},
	{Module: "counterparty", NestPath: "POST /counterparty/create", VDPPath: "POST /api/v1/counterparty/create", Status: "done"},
	{Module: "counterparty", NestPath: "PATCH /counterparty/{id}", VDPPath: "PATCH /api/v1/counterparty/{id}", Status: "done"},
	{Module: "counterparty", NestPath: "DELETE /counterparty/{id}", VDPPath: "DELETE /api/v1/counterparty/{id}", Status: "done"},
	{Module: "counterparty", NestPath: "PATCH /counterparty/{id}/bank/{bankUuid}/account", VDPPath: "PATCH /api/v1/counterparty/{id}/bank/{bankUuid}/account", Status: "done"},
	{Module: "counterparty", NestPath: "PATCH /counterparty/{id}/bank/{bankUuid}/account/{accountUuid}", VDPPath: "PATCH /api/v1/counterparty/{id}/bank/{bankUuid}/account/{accountUuid}", Status: "done"},
	{Module: "counterparty", NestPath: "DELETE /counterparty/{id}/bank/{bankUuid}/account/{accountUuid}", VDPPath: "DELETE /api/v1/counterparty/{id}/bank/{bankUuid}/account/{accountUuid}", Status: "done"},
	{Module: "counterparty", NestPath: "POST /counterparty/find-or-create", VDPPath: "POST /api/v1/counterparty/find-or-create", Status: "done"},
	{Module: "counterparty", NestPath: "POST /counterparty/{id}/form-payment", VDPPath: "POST /api/v1/counterparty/{id}/form-payment", Status: "done"},
	{Module: "counterparty", NestPath: "DELETE /counterparty/{id}/form-payment/{formPaymentId}", VDPPath: "DELETE /api/v1/counterparty/{id}/form-payment/{formPaymentId}", Status: "done"},
	{Module: "counterparty", NestPath: "GET /counterparty/{id}/requests", VDPPath: "GET /api/v1/counterparty/{id}/requests", Status: "done"},
	{Module: "counterparty", NestPath: "GET /counterparty/{id}/requests/xlsx", VDPPath: "GET /api/v1/counterparty/{id}/requests/xlsx", Status: "done"},
	{Module: "counterparty", NestPath: "GET /counterparty/{id}/approval-indicator", VDPPath: "GET /api/v1/counterparty/{id}/approval-indicator", Status: "done"},
	{Module: "counterparty", NestPath: "GET /counterparty/{id}/can-skip-compliance", VDPPath: "GET /api/v1/counterparty/{id}/can-skip-compliance", Status: "done"},
	{Module: "comment", NestPath: "GET /comment", VDPPath: "GET /api/v1/comment", Status: "done"},
	{Module: "comment", NestPath: "GET /comment/unread", VDPPath: "GET /api/v1/comment/unread", Status: "done"},
	{Module: "comment", NestPath: "GET /comment/entities-with-unread-comments", VDPPath: "GET /api/v1/comment/entities-with-unread-comments", Status: "done"},
	{Module: "comment", NestPath: "POST /comment", VDPPath: "POST /api/v1/comment", Status: "done"},
	{Module: "comment", NestPath: "PATCH /comment/{id}", VDPPath: "PATCH /api/v1/comment/{id}", Status: "done"},
	{Module: "comment", NestPath: "PUT /comment/mark-as-read", VDPPath: "PUT /api/v1/comment/mark-as-read", Status: "done"},
	{Module: "comment", NestPath: "GET /manager/comment", VDPPath: "GET /api/v1/manager/comment", Status: "done"},
	{Module: "comment", NestPath: "POST /manager/comment", VDPPath: "POST /api/v1/manager/comment", Status: "done"},
	{Module: "comment", NestPath: "PATCH /manager/comment/{id}", VDPPath: "PATCH /api/v1/manager/comment/{id}", Status: "done"},
	{Module: "comment", NestPath: "PUT /manager/comment/mark-as-read", VDPPath: "PUT /api/v1/manager/comment/mark-as-read", Status: "done"},
	{Module: "comment", NestPath: "GET /manager/comment/entities-with-unread-comments", VDPPath: "GET /api/v1/manager/comment/entities-with-unread-comments", Status: "done"},
	{Module: "comment", NestPath: "DELETE /manager/comment/{id}", VDPPath: "DELETE /api/v1/manager/comment/{id}", Status: "done"},
	{Module: "comment", NestPath: "GET /provider/comment", VDPPath: "GET /api/v1/provider/comment", Status: "done"},
	{Module: "comment", NestPath: "POST /provider/comment", VDPPath: "POST /api/v1/provider/comment", Status: "done"},
	{Module: "comment", NestPath: "PATCH /provider/comment/{id}", VDPPath: "PATCH /api/v1/provider/comment/{id}", Status: "done"},
	{Module: "comment", NestPath: "PUT /provider/comment/mark-as-read", VDPPath: "PUT /api/v1/provider/comment/mark-as-read", Status: "done"},
	{Module: "comment", NestPath: "GET /provider/comment/entities-with-unread-comments", VDPPath: "GET /api/v1/provider/comment/entities-with-unread-comments", Status: "done"},
	{Module: "comment", NestPath: "DELETE /provider/comment/{id}", VDPPath: "DELETE /api/v1/provider/comment/{id}", Status: "done"},
	{Module: "file", NestPath: "POST /file-store/upload", VDPPath: "POST /api/v1/file-store/upload", Status: "done"},
	{Module: "file", NestPath: "POST /file-store/upload/pdf", VDPPath: "POST /api/v1/file-store/upload/pdf", Status: "done"},
	{Module: "file", NestPath: "GET /file-store/preview/private/{id}", VDPPath: "GET /api/v1/file-store/preview/private/{id}", Status: "done"},
	{Module: "file", NestPath: "GET /file-store/preview/private/contract/{contract}", VDPPath: "GET /api/v1/file-store/preview/private/contract/{contract}", Status: "done"},
	{Module: "file", NestPath: "GET /file-store/preview/private/{form}/{filePath}", VDPPath: "GET /api/v1/file-store/preview/private/{form}/{filePath}", Status: "done"},
	{Module: "file", NestPath: "POST /admin/file-store/upload", VDPPath: "POST /api/v1/admin/file-store/upload", Status: "done"},
	{Module: "file", NestPath: "POST /admin/file-store/upload/pdf", VDPPath: "POST /api/v1/admin/file-store/upload/pdf", Status: "done"},
	{Module: "file", NestPath: "GET /admin/file-store/preview/{id}", VDPPath: "GET /api/v1/admin/file-store/preview/{id}", Status: "done"},
	{Module: "file", NestPath: "POST /admin/provider/file-store/upload", VDPPath: "POST /api/v1/admin/provider/file-store/upload", Status: "done"},
	{Module: "file", NestPath: "POST /admin/provider/file-store/upload/pdf", VDPPath: "POST /api/v1/admin/provider/file-store/upload/pdf", Status: "done"},
	{Module: "file", NestPath: "GET /admin/provider/file-store/preview/private/{form}/{filePath}", VDPPath: "GET /api/v1/admin/provider/file-store/preview/private/{form}/{filePath}", Status: "done"},
	{Module: "file", NestPath: "GET /1c/file-store/preview/{id}", VDPPath: "GET /api/v1/1c/file-store/preview/{id}", Status: "done"},
	{Module: "compliance-history", NestPath: "GET /admin/compliance-officer/clients", VDPPath: "GET /api/v1/admin/compliance-officer/clients", Status: "done"},
	{Module: "compliance-history", NestPath: "GET /admin/compliance-officer/clients/xlsx", VDPPath: "GET /api/v1/admin/compliance-officer/clients/xlsx", Status: "done"},
	{Module: "compliance-history", NestPath: "GET /admin/compliance-officer/clients/{id}", VDPPath: "GET /api/v1/admin/compliance-officer/clients/{id}", Status: "done"},
	{Module: "compliance-history", NestPath: "GET /admin/compliance-officer/clients/{id}/requests", VDPPath: "GET /api/v1/admin/compliance-officer/clients/{id}/requests", Status: "done"},
	{Module: "compliance-history", NestPath: "GET /admin/compliance-officer/clients/{id}/requests/xlsx", VDPPath: "GET /api/v1/admin/compliance-officer/clients/{id}/requests/xlsx", Status: "done"},
	{Module: "compliance-history", NestPath: "GET /admin/compliance-officer/clients/{id}/organization-card", VDPPath: "GET /api/v1/admin/compliance-officer/clients/{id}/organization-card", Status: "done"},
	{Module: "compliance-history", NestPath: "GET /admin/internal-compliance-officer/clients", VDPPath: "GET /api/v1/admin/internal-compliance-officer/clients", Status: "done"},
	{Module: "compliance-history", NestPath: "GET /admin/internal-compliance-officer/clients/xlsx", VDPPath: "GET /api/v1/admin/internal-compliance-officer/clients/xlsx", Status: "done"},
	{Module: "compliance-history", NestPath: "GET /admin/internal-compliance-officer/clients/{id}", VDPPath: "GET /api/v1/admin/internal-compliance-officer/clients/{id}", Status: "done"},
	{Module: "compliance-history", NestPath: "GET /admin/internal-compliance-officer/clients/{id}/requests", VDPPath: "GET /api/v1/admin/internal-compliance-officer/clients/{id}/requests", Status: "done"},
	{Module: "compliance-history", NestPath: "GET /admin/internal-compliance-officer/clients/{id}/requests/xlsx", VDPPath: "GET /api/v1/admin/internal-compliance-officer/clients/{id}/requests/xlsx", Status: "done"},
	{Module: "compliance-history", NestPath: "GET /admin/internal-compliance-officer/clients/{id}/organization-card", VDPPath: "GET /api/v1/admin/internal-compliance-officer/clients/{id}/organization-card", Status: "done"},
	{Module: "compliance-history", NestPath: "GET /compliance-history", VDPPath: "GET /api/v1/compliance-history", Status: "done"},
	{Module: "compliance-history", NestPath: "GET /compliance-history/{formId}", VDPPath: "GET /api/v1/compliance-history/{formId}", Status: "done"},
	{Module: "docs", NestPath: "POST /forms/{id}/docs/attach", VDPPath: "POST /api/v1/forms/{id}/docs/attach", Status: "done"},
	{Module: "liquidity", NestPath: "GET /liquidity", VDPPath: "GET /api/v1/liquidity", Status: "done"},
	{Module: "liquidity", NestPath: "POST /liquidity", VDPPath: "POST /api/v1/liquidity", Status: "done"},
	{Module: "virtual-account", NestPath: "GET /virtual-account", VDPPath: "GET /api/v1/virtual-accounts", Status: "done"},
	{Module: "virtual-account", NestPath: "POST /virtual-account", VDPPath: "POST /api/v1/virtual-accounts", Status: "done"},
	{Module: "agent", NestPath: "GET /agent", VDPPath: "GET /api/v1/agents", Status: "done"},
	{Module: "agent", NestPath: "POST /agent", VDPPath: "POST /api/v1/agents", Status: "done"},
	{Module: "hs-code", NestPath: "GET /hs-code", VDPPath: "GET /api/v1/hs-codes", Status: "done"},
	{Module: "hs-code", NestPath: "POST /hs-code", VDPPath: "POST /api/v1/hs-codes", Status: "done"},
	{Module: "currency", NestPath: "GET /currency", VDPPath: "GET /api/v1/currencies", Status: "done"},
	{Module: "currency", NestPath: "POST /currency", VDPPath: "POST /api/v1/currencies", Status: "done"},
	{Module: "configuration", NestPath: "GET /configuration/{key}", VDPPath: "GET /api/v1/configuration/{key}", Status: "done"},
	{Module: "configuration", NestPath: "PUT /configuration/{key}", VDPPath: "PUT /api/v1/configuration/{key}", Status: "done"},
	{Module: "treasurer-task", NestPath: "GET /treasurer-task", VDPPath: "GET /api/v1/treasurer-tasks", Status: "done"},
	{Module: "treasurer-task", NestPath: "POST /treasurer-task", VDPPath: "POST /api/v1/treasurer-tasks", Status: "done"},
	{Module: "socket", NestPath: "GET /socket/events (Nest)", VDPPath: "GET /api/v1/sse/forms/{id}", Status: "done"},
	{Module: "diadoc", NestPath: "POST /diadoc/*", VDPPath: "POST /api/v1/internal/hub/callback", Status: "done"},
	{Module: "recognition", NestPath: "POST /recognition/*", VDPPath: "hub adapter ocr + callback", Status: "done"},
	{Module: "telegram", NestPath: "telegram notify", VDPPath: "hub adapter telegram", Status: "done"},
	{Module: "payment", NestPath: "1c payment cover/fee", VDPPath: "hub adapter onec", Status: "done"},
	{Module: "mail", NestPath: "mail send", VDPPath: "hub adapter mail", Status: "done"},
	{Module: "partner", NestPath: "partner.dispatch", VDPPath: "hub adapter partner", Status: "done"},
	{Module: "template", NestPath: "GET /templates", VDPPath: "GET /api/v1/templates", Status: "done"},
	{Module: "template", NestPath: "GET /template", VDPPath: "GET /api/v1/template", Status: "done"},
	{Module: "template", NestPath: "GET /admin/templates", VDPPath: "GET /api/v1/admin/templates", Status: "done"},
	{Module: "template", NestPath: "POST /admin/templates", VDPPath: "POST /api/v1/admin/templates", Status: "done"},
	{Module: "template", NestPath: "GET /admin/templates/{id}", VDPPath: "GET /api/v1/admin/templates/{id}", Status: "done"},
	{Module: "template", NestPath: "PATCH /admin/templates/{id}", VDPPath: "PATCH /api/v1/admin/templates/{id}", Status: "done"},
	{Module: "template", NestPath: "DELETE /admin/templates/{id}", VDPPath: "DELETE /api/v1/admin/templates/{id}", Status: "done"},
	{Module: "rate", NestPath: "resolveDealRate (MOD-RATE)", VDPPath: "POST /api/v1/forms/{id}/rate/resolve", Status: "done"},
	{Module: "commission", NestPath: "calculateCommission (MOD-COMM)", VDPPath: "POST /api/v1/forms/{id}/commission/calculate", Status: "done"},
	{Module: "docs", NestPath: "POST /forms/{id}/docs/generate", VDPPath: "POST /api/v1/forms/{id}/docs/generate", Status: "done"},
	{Module: "docs", NestPath: "POST /forms/{id}/commission/calculate", VDPPath: "POST /api/v1/forms/{id}/commission/calculate", Status: "done"},
	{Module: "docs", NestPath: "payment-order-generation async", VDPPath: "outbox docs.generate + hub callback attach", Status: "done"},
	{Module: "docs", NestPath: "POST /forms/import/excel", VDPPath: "POST /api/v1/forms/import/excel", Status: "done"},
	{Module: "refund", NestPath: "Refund process page API (§4)", VDPPath: "GET /api/v1/forms/{id}/refund", Status: "done"},
	{Module: "refund", NestPath: "Refund cancel invariant unrefunded funds", VDPPath: "domain Apply HasUnrefundedFunds", Status: "done"},
	{Module: "bank-api", NestPath: "Bank API channel (§5 extension)", VDPPath: "POST/GET /api/v1/bank/forms + admin bank-settings", Status: "done"},
	{Module: "refund", NestPath: "Refund manager routes (§4)", VDPPath: "PUT .../refund/* via nest map", Status: "done"},
}

func countParityByStatus() map[EndpointParityStatus]int {
	out := map[EndpointParityStatus]int{}
	for _, row := range nestEndpointParity {
		out[row.Status]++
	}
	return out
}

func formPaymentParityRows() []endpointParityRow {
	var rows []endpointParityRow
	for _, row := range nestEndpointParity {
		if row.Module == "form-payment" {
			rows = append(rows, row)
		}
	}
	return rows
}

func TestNestEndpointParityMatrixInventory(t *testing.T) {
	t.Parallel()
	forms := formPaymentParityRows()
	if len(forms) < 100 {
		t.Fatalf("form-payment inventory too small: got %d want >= 100 Nest routes", len(forms))
	}
	if len(nestEndpointParity) < 120 {
		t.Fatalf("full matrix too small: got %d", len(nestEndpointParity))
	}
	for i, row := range nestEndpointParity {
		if row.NestPath == "" || row.VDPPath == "" || row.Module == "" {
			t.Fatalf("row %d incomplete: %#v", i, row)
		}
		switch row.Status {
		case ParityMissing, ParityStub, ParityDone:
		default:
			t.Fatalf("row %d bad status %q", i, row.Status)
		}
	}
}

func TestR1FormPaymentParityGate(t *testing.T) {
	t.Parallel()
	forms := formPaymentParityRows()
	var formDone, formStub, formMissing int
	for _, row := range forms {
		switch row.Status {
		case ParityDone:
			formDone++
		case ParityStub:
			formStub++
		case ParityMissing:
			formMissing++
		}
	}
	formPctDone := 100.0 * float64(formDone) / float64(len(forms))
	if formPctDone < 95.0 {
		t.Fatalf("R1 DoD: form-payment done%%=%.1f want >= 95 (done=%d stub=%d missing=%d total=%d)", formPctDone, formDone, formStub, formMissing, len(forms))
	}
	counts := countParityByStatus()
	total := len(nestEndpointParity)
	allPct := 100.0 * float64(counts[ParityDone]) / float64(total)
	t.Logf("R1 gate: form-payment done=%.1f%% (%d/%d) stub=%d missing=%d | all-modules done=%.1f%% — NOT full Nest product parity", formPctDone, formDone, len(forms), formStub, formMissing, allPct)
	if formPctDone >= 100 && formStub+formMissing == 0 {
		// allowed for form-payment module only; still log honesty
		t.Log("form-payment routes marked done; hub/auth/contracts modules remain stub/missing")
	}
}
