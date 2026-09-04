package formpayment

import (
	"encoding/json"
	"strings"
)

type DocFileRef struct {
	FileID string `json:"file_id"`
	Kind   string `json:"kind,omitempty"`
	Label  string `json:"label,omitempty"`
}

type POGState struct {
	Status   string `json:"status"`
	FileID   string `json:"file_id,omitempty"`
	Attempts int    `json:"attempts,omitempty"`
	Kind     string `json:"kind,omitempty"`
}

type DocsBundle struct {
	Files                []DocFileRef `json:"files,omitempty"`
	POG                  *POGState    `json:"pog,omitempty"`
	Refund               *RefundState `json:"refund,omitempty"`
	Channel              string       `json:"channel,omitempty"`
	CorrelationID        string       `json:"correlation_id,omitempty"`
	IdempotencyKey       string       `json:"idempotency_key,omitempty"`
	ProcessPolicyVersion int          `json:"process_policy_version,omitempty"`
	ReferredByAccountID  string       `json:"referred_by_account_id,omitempty"`
}

// PackDocsJSON merges file refs + POG + refund fields into DocsJSON.
func (f *Form) PackDocsJSON() {
	bundle := DocsBundle{Files: ParseDocRefs(f.DocsJSON)}
	if f.POGStatus != "" || f.POGFileID != "" || f.POGAttempts > 0 || f.POGKind != "" {
		bundle.POG = &POGState{Status: f.POGStatus, FileID: f.POGFileID, Attempts: f.POGAttempts, Kind: f.POGKind}
	}
	if f.FundsHeld || f.FundsRefunded || f.RefundAmount != "" || f.RefundFileID != "" || f.FundsReceivedAmount != "" {
		bundle.Refund = &RefundState{
			Amount: f.RefundAmount, Currency: f.RefundCurrency,
			ReceivedAmount: f.FundsReceivedAmount, ReceivedCurrency: f.FundsReceivedCurrency,
			FileID: f.RefundFileID, InitiatedBy: f.RefundInitiatedBy, ConfirmedBy: f.RefundConfirmedBy,
			FundsHeld: f.FundsHeld, FundsRefunded: f.FundsRefunded,
		}
	}
	bundle.Channel = f.Channel
	bundle.CorrelationID = f.CorrelationID
	bundle.IdempotencyKey = f.IdempotencyKey
	bundle.ProcessPolicyVersion = f.ProcessPolicyVersion
	bundle.ReferredByAccountID = f.ReferredByAccountID
	raw, err := json.Marshal(bundle)
	if err != nil {
		return
	}
	f.DocsJSON = string(raw)
}

// UnpackDocsJSON loads POG + refund + normalizes DocsJSON files from stored JSON.
func (f *Form) UnpackDocsJSON() {
	if strings.TrimSpace(f.DocsJSON) == "" {
		return
	}
	var bundle DocsBundle
	if err := json.Unmarshal([]byte(f.DocsJSON), &bundle); err == nil && (bundle.Files != nil || bundle.POG != nil || bundle.Refund != nil || bundle.Channel != "" || bundle.CorrelationID != "" || strings.HasPrefix(strings.TrimSpace(f.DocsJSON), "{")) {
		if bundle.POG != nil {
			f.POGStatus = bundle.POG.Status
			f.POGFileID = bundle.POG.FileID
			f.POGAttempts = bundle.POG.Attempts
			f.POGKind = bundle.POG.Kind
		}
		if bundle.Refund != nil {
			f.RefundAmount = bundle.Refund.Amount
			f.RefundCurrency = bundle.Refund.Currency
			f.FundsReceivedAmount = bundle.Refund.ReceivedAmount
			f.FundsReceivedCurrency = bundle.Refund.ReceivedCurrency
			f.RefundFileID = bundle.Refund.FileID
			f.RefundInitiatedBy = bundle.Refund.InitiatedBy
			f.RefundConfirmedBy = bundle.Refund.ConfirmedBy
			f.FundsHeld = bundle.Refund.FundsHeld
			f.FundsRefunded = bundle.Refund.FundsRefunded
		}
		if bundle.Channel != "" {
			f.Channel = bundle.Channel
		}
		if bundle.ProcessPolicyVersion > 0 {
			f.ProcessPolicyVersion = bundle.ProcessPolicyVersion
		}
		if bundle.ReferredByAccountID != "" {
			f.ReferredByAccountID = bundle.ReferredByAccountID
		}
		if bundle.CorrelationID != "" {
			f.CorrelationID = bundle.CorrelationID
		}
		if bundle.IdempotencyKey != "" {
			f.IdempotencyKey = bundle.IdempotencyKey
		}
		if bundle.Files == nil {
			bundle.Files = []DocFileRef{}
		}
		raw, _ := json.Marshal(bundle)
		f.DocsJSON = string(raw)
		return
	}
	// legacy bare array
	refs := ParseDocRefs(f.DocsJSON)
	raw, _ := json.Marshal(DocsBundle{Files: refs})
	f.DocsJSON = string(raw)
}

func ParseDocRefs(raw string) []DocFileRef {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return []DocFileRef{}
	}
	var bundle DocsBundle
	if err := json.Unmarshal([]byte(raw), &bundle); err == nil && strings.HasPrefix(raw, "{") {
		if bundle.Files == nil {
			return []DocFileRef{}
		}
		return bundle.Files
	}
	var refs []DocFileRef
	if err := json.Unmarshal([]byte(raw), &refs); err != nil {
		return []DocFileRef{}
	}
	return refs
}

func EncodeDocRefs(refs []DocFileRef, pog *POGState) string {
	return EncodeDocsBundle(DocsBundle{Files: refs, POG: pog})
}

func EncodeDocsBundle(bundle DocsBundle) string {
	if bundle.Files == nil {
		bundle.Files = []DocFileRef{}
	}
	raw, err := json.Marshal(bundle)
	if err != nil {
		return `{"files":[]}`
	}
	return string(raw)
}
