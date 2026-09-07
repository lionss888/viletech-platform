// Package extraction defines ExtractionResult schema v1 and GoldRecord for document IE.
package extraction

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

const SchemaVersion = "v1"

// Result is the canonical extraction output for PRIMARY, SHADOW, HITL gold, and own models.
type Result struct {
	SchemaVersion string     `json:"schema_version"`
	DocType       string     `json:"doc_type,omitempty"`
	Language      string     `json:"language,omitempty"`
	Confidence    float64    `json:"confidence,omitempty"`
	Header        Header     `json:"header"`
	LineItems     []LineItem `json:"line_items"`
	Meta          Meta       `json:"meta"`
	Warnings      []string   `json:"warnings,omitempty"`
}

// Header holds document-level commercial fields.
type Header struct {
	ContractNumber string   `json:"contract_number,omitempty"`
	ContractDate   string   `json:"contract_date,omitempty"`
	InvoiceNumber  string   `json:"invoice_number,omitempty"`
	InvoiceDate    string   `json:"invoice_date,omitempty"`
	InvoiceAmount  string   `json:"invoice_amount,omitempty"`
	Currency       string   `json:"currency,omitempty"`
	CompanyName    string   `json:"company_name,omitempty"`
	CompanyAddress string   `json:"company_address,omitempty"`
	BankName       string   `json:"bank_name,omitempty"`
	BankCountry    string   `json:"bank_country,omitempty"`
	BankAddress    string   `json:"bank_address,omitempty"`
	BankAccount    string   `json:"bank_account,omitempty"`
	SwiftCode      string   `json:"swift_code,omitempty"`
	HsCodes        []string `json:"hs_codes,omitempty"`
	PaymentNumber  string   `json:"payment_number,omitempty"`
	PaymentDate    string   `json:"payment_date,omitempty"`
}

// LineItem is one invoice/goods row.
type LineItem struct {
	LineNo      int     `json:"line_no,omitempty"`
	Description string  `json:"description,omitempty"`
	Qty         string  `json:"qty,omitempty"`
	Unit        string  `json:"unit,omitempty"`
	UnitPrice   string  `json:"unit_price,omitempty"`
	LineAmount  string  `json:"line_amount,omitempty"`
	Currency    string  `json:"currency,omitempty"`
	HsCode      string  `json:"hs_code,omitempty"`
	Confidence  float64 `json:"confidence,omitempty"`
}

// Meta identifies the extraction engine run.
type Meta struct {
	EngineID      string `json:"engine_id,omitempty"`
	ModelVersion  string `json:"model_version,omitempty"`
	SourceFileID  string `json:"source_file_id,omitempty"`
	FormPaymentID string `json:"form_payment_id,omitempty"`
	EventID       string `json:"event_id,omitempty"`
	Confirmed     bool   `json:"confirmed,omitempty"`
	ContentHash   string `json:"content_hash,omitempty"`
}

// GoldRecord is one flywheel row for offline train (JSONL).
type GoldRecord struct {
	GoldID         string    `json:"gold_id"`
	FormPaymentID  string    `json:"form_payment_id"`
	OrganizationID string    `json:"organization_id,omitempty"`
	SourceFileID   string    `json:"source_file_id,omitempty"`
	ContentHash    string    `json:"content_hash,omitempty"`
	SchemaVersion  string    `json:"schema_version"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at,omitempty"`
	EventID        string    `json:"event_id,omitempty"`
	PrimaryEngine  string    `json:"primary_engine,omitempty"`
	ShadowEngine   string    `json:"shadow_engine,omitempty"`
	PrimaryOut     Result    `json:"primary_out"`
	ShadowOut      Result    `json:"shadow_out"`
	HumanOut       *Result   `json:"human_out,omitempty"`
}

// FixtureResult returns a valid schema v1 payload for offline/dev.
func FixtureResult(formID string) Result {
	r := Result{
		SchemaVersion: SchemaVersion,
		DocType:       "invoice",
		Language:      "en",
		Confidence:    0.5,
		Header: Header{
			ContractNumber: "OCR-" + formID,
			ContractDate:   "2026-01-15",
			InvoiceNumber:  "INV-" + formID,
			InvoiceDate:    "2026-01-16",
			InvoiceAmount:  "1000",
			Currency:       "USD",
			CompanyName:    "Fixture Counterparty",
			HsCodes:        []string{"847130"},
		},
		LineItems: []LineItem{
			{
				LineNo: 1, Description: "Fixture goods", Qty: "1", Unit: "pcs",
				UnitPrice: "1000", LineAmount: "1000", Currency: "USD", HsCode: "847130", Confidence: 0.5,
			},
		},
		Meta: Meta{
			EngineID:      "fixture",
			ModelVersion:  "fixture-0",
			FormPaymentID: formID,
		},
		Warnings: []string{"fixture_mode"},
	}
	r.Meta.ContentHash = ContentHash(r)
	return r
}

// Validate checks required schema fields.
func Validate(r Result) error {
	if r.SchemaVersion != SchemaVersion {
		return fmt.Errorf("schema_version must be %s", SchemaVersion)
	}
	if r.Meta.EngineID == "" {
		return fmt.Errorf("meta.engine_id required")
	}
	return nil
}

// ParseResult unmarshals JSON into Result.
func ParseResult(raw []byte) (Result, error) {
	var r Result
	if err := json.Unmarshal(raw, &r); err != nil {
		return Result{}, err
	}
	if r.SchemaVersion == "" {
		r.SchemaVersion = SchemaVersion
	}
	if r.LineItems == nil {
		r.LineItems = []LineItem{}
	}
	return r, Validate(r)
}

// ParseFromInvoiceJSON reads ExtractionResult from form invoice_json.
func ParseFromInvoiceJSON(invoiceJSON string) (Result, bool) {
	invoiceJSON = strings.TrimSpace(invoiceJSON)
	if invoiceJSON == "" {
		return Result{}, false
	}
	r, err := ParseResult([]byte(invoiceJSON))
	if err == nil {
		return r, true
	}
	var wrap map[string]json.RawMessage
	if json.Unmarshal([]byte(invoiceJSON), &wrap) != nil {
		return Result{}, false
	}
	if raw, ok := wrap["extraction"]; ok {
		r, err = ParseResult(raw)
		if err == nil {
			return r, true
		}
	}
	return Result{}, false
}

// ToInvoiceJSON serializes Result for form.invoice_json storage.
func ToInvoiceJSON(r Result) string {
	if r.SchemaVersion == "" {
		r.SchemaVersion = SchemaVersion
	}
	if r.LineItems == nil {
		r.LineItems = []LineItem{}
	}
	raw, err := json.Marshal(r)
	if err != nil {
		return "{}"
	}
	return string(raw)
}

// HubFields maps Result to hub/core flat callback fields plus invoice_json.
func HubFields(r Result) map[string]any {
	return map[string]any{
		"contract_number": r.Header.ContractNumber,
		"contract_date":   r.Header.ContractDate,
		"invoice_amount":  r.Header.InvoiceAmount,
		"currency":        r.Header.Currency,
		"invoice_json":    ToInvoiceJSON(r),
	}
}

// ContentHash is used for OCR callback idempotency.
func ContentHash(r Result) string {
	cp := r
	cp.Meta.ContentHash = ""
	raw, _ := json.Marshal(cp)
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:16])
}

// NewGoldID builds a stable gold id from form and event.
func NewGoldID(formID, eventID string) string {
	if eventID == "" {
		eventID = "noevent"
	}
	sum := sha256.Sum256([]byte(formID + "|" + eventID))
	return hex.EncodeToString(sum[:12])
}
