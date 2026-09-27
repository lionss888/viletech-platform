package openapi

import (
	"strings"
	"testing"
)

func TestValidateNamedSchema_FormValid(t *testing.T) {
	doc, err := Load("forms.yaml")
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	inputJSON := []byte(`{
		"id": "form-1",
		"account_id": "acc-1",
		"organization_id": "org-1",
		"status": "draft",
		"direction": "import",
		"kind": "goods",
		"created_at": "2026-09-26T12:00:00Z",
		"updated_at": "2026-09-26T12:00:00Z"
	}`)
	if err := doc.ValidateNamedSchema("Form", inputJSON); err != nil {
		t.Fatalf("expected valid Form JSON, got: %v", err)
	}
}

func TestValidateNamedSchema_FormMissingStatus(t *testing.T) {
	doc, err := Load("forms.yaml")
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	inputJSON := []byte(`{
		"id": "form-1",
		"account_id": "acc-1",
		"organization_id": "org-1",
		"direction": "import",
		"kind": "goods",
		"created_at": "2026-09-26T12:00:00Z",
		"updated_at": "2026-09-26T12:00:00Z"
	}`)
	err = doc.ValidateNamedSchema("Form", inputJSON)
	if err == nil {
		t.Fatal("expected error when status is missing")
	}
	if !strings.Contains(err.Error(), "status") {
		t.Fatalf("expected error to mention status, got: %v", err)
	}
}
