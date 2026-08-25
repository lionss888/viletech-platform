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
	{Module: "form-payment", NestPath: "GET /admin/treasurer/form-payment", VDPPath: "GET /api/v1/treasurer/form-payment", Status: "done"},
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
	{Module: "auth", NestPath: "POST /auth/login", VDPPath: "POST /api/v1/auth/login", Status: "stub"},
	{Module: "auth", NestPath: "POST /auth/register", VDPPath: "POST /api/v1/auth/register", Status: "stub"},
	{Module: "auth", NestPath: "POST /auth/refresh", VDPPath: "POST /api/v1/auth/refresh", Status: "stub"},
	{Module: "account", NestPath: "GET /account", VDPPath: "GET /api/v1/account", Status: "stub"},
	{Module: "organization", NestPath: "GET /organization", VDPPath: "GET /api/v1/organizations", Status: "stub"},
	{Module: "organization", NestPath: "GET /organization/{id}", VDPPath: "GET /api/v1/organizations/{id}", Status: "stub"},
	{Module: "organization", NestPath: "PATCH /organization/{id}", VDPPath: "PATCH /api/v1/organizations/{id}", Status: "stub"},
	{Module: "organization", NestPath: "PUT /admin/internal-compliance-officer/organization/{id}/approve", VDPPath: "PUT /api/v1/admin/internal-compliance-officer/organization/{id}/approve", Status: "stub"},
	{Module: "organization", NestPath: "PUT /admin/internal-compliance-officer/organization/{id}/un-approve", VDPPath: "PUT /api/v1/admin/internal-compliance-officer/organization/{id}/un-approve", Status: "stub"},
	{Module: "organization", NestPath: "PUT /admin/internal-compliance-officer/organization/{id}/block", VDPPath: "PUT /api/v1/admin/internal-compliance-officer/organization/{id}/block", Status: "stub"},
	{Module: "contract", NestPath: "GET /contract", VDPPath: "GET /api/v1/contracts", Status: "stub"},
	{Module: "contract", NestPath: "POST /contract", VDPPath: "POST /api/v1/contracts", Status: "stub"},
	{Module: "counterparty", NestPath: "GET /counterparty", VDPPath: "GET /api/v1/counterparties", Status: "stub"},
	{Module: "counterparty", NestPath: "POST /counterparty", VDPPath: "POST /api/v1/counterparties", Status: "stub"},
	{Module: "comment", NestPath: "GET /comment", VDPPath: "GET /api/v1/comments", Status: "stub"},
	{Module: "comment", NestPath: "POST /comment", VDPPath: "POST /api/v1/comments", Status: "stub"},
	{Module: "file", NestPath: "POST /file-store/upload", VDPPath: "POST /api/v1/file-store/upload", Status: "stub"},
	{Module: "liquidity", NestPath: "GET /liquidity", VDPPath: "GET /api/v1/liquidity", Status: "stub"},
	{Module: "liquidity", NestPath: "POST /liquidity", VDPPath: "POST /api/v1/liquidity", Status: "stub"},
	{Module: "virtual-account", NestPath: "GET /virtual-account", VDPPath: "GET /api/v1/virtual-accounts", Status: "stub"},
	{Module: "virtual-account", NestPath: "POST /virtual-account", VDPPath: "POST /api/v1/virtual-accounts", Status: "stub"},
	{Module: "agent", NestPath: "GET /agent", VDPPath: "GET /api/v1/agents", Status: "stub"},
	{Module: "agent", NestPath: "POST /agent", VDPPath: "POST /api/v1/agents", Status: "stub"},
	{Module: "hs-code", NestPath: "GET /hs-code", VDPPath: "GET /api/v1/hs-codes", Status: "stub"},
	{Module: "hs-code", NestPath: "POST /hs-code", VDPPath: "POST /api/v1/hs-codes", Status: "stub"},
	{Module: "currency", NestPath: "GET /currency", VDPPath: "GET /api/v1/currencies", Status: "stub"},
	{Module: "currency", NestPath: "POST /currency", VDPPath: "POST /api/v1/currencies", Status: "stub"},
	{Module: "configuration", NestPath: "GET /configuration/{key}", VDPPath: "GET /api/v1/configuration/{key}", Status: "stub"},
	{Module: "configuration", NestPath: "PUT /configuration/{key}", VDPPath: "PUT /api/v1/configuration/{key}", Status: "stub"},
	{Module: "treasurer-task", NestPath: "GET /treasurer-task", VDPPath: "GET /api/v1/treasurer-tasks", Status: "stub"},
	{Module: "treasurer-task", NestPath: "POST /treasurer-task", VDPPath: "POST /api/v1/treasurer-tasks", Status: "stub"},
	{Module: "socket", NestPath: "GET /socket/events (Nest)", VDPPath: "GET /api/v1/sse/forms/{id}", Status: "stub"},
	{Module: "diadoc", NestPath: "POST /diadoc/*", VDPPath: "POST /api/v1/internal/hub/callback", Status: "stub"},
	{Module: "recognition", NestPath: "POST /recognition/*", VDPPath: "hub adapter ocr", Status: "missing"},
	{Module: "telegram", NestPath: "telegram notify", VDPPath: "hub adapter telegram", Status: "missing"},
	{Module: "payment", NestPath: "1c payment cover/fee", VDPPath: "hub adapter onec", Status: "missing"},
	{Module: "mail", NestPath: "mail send", VDPPath: "hub adapter mail", Status: "stub"},
	{Module: "template", NestPath: "GET /template", VDPPath: "—", Status: "missing"},
	{Module: "docs", NestPath: "POST /forms/{id}/docs/generate", VDPPath: "POST /api/v1/forms/{id}/docs/generate", Status: "stub"},
	{Module: "docs", NestPath: "POST /forms/{id}/commission/calculate", VDPPath: "POST /api/v1/forms/{id}/commission/calculate", Status: "stub"},
	{Module: "bank-api", NestPath: "Bank API channel (§5 extension)", VDPPath: "—", Status: "missing"},
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

