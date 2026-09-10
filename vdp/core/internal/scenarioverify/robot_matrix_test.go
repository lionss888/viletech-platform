package scenarioverify

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func robotFixturesDir(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	dir := filepath.Clean(filepath.Join(filepath.Dir(file), "..", "..", "..", "testdata", "robot-fixtures"))
	if _, err := os.Stat(dir); err != nil {
		t.Fatalf("robot fixtures dir: %v", err)
	}
	return dir
}

func TestRobotMatrixRowsCoverFullCatalog(t *testing.T) {
	t.Parallel()
	raw, err := os.ReadFile(filepath.Join(robotFixturesDir(t), "matrix-rows.json"))
	if err != nil {
		t.Fatal(err)
	}
	var doc struct {
		Rows []struct {
			ID   string `json:"id"`
			Note string `json:"note"`
		} `json:"rows"`
	}
	if err := json.Unmarshal(raw, &doc); err != nil {
		t.Fatal(err)
	}
	have := map[string]string{}
	for _, r := range doc.Rows {
		have[r.ID] = r.Note
	}
	for _, s := range Catalog() {
		if _, ok := have[s.ID]; !ok {
			t.Errorf("matrix-rows missing catalog id %s", s.ID)
		}
	}
	if have[IDIcoOrgPendingApprove] != "soft_skip_forbidden" {
		t.Errorf("ico_org_pending_approve note want soft_skip_forbidden got %q", have[IDIcoOrgPendingApprove])
	}
	if _, ok := have["happy_path_shipment_branch"]; !ok {
		t.Error("matrix-rows missing happy_path_shipment_branch")
	}
}

func TestRobotTemplatePackHasNoDemoMocks(t *testing.T) {
	t.Parallel()
	raw, err := os.ReadFile(filepath.Join(robotFixturesDir(t), "packs", "template", "pack.json"))
	if err != nil {
		t.Fatal(err)
	}
	forbidden := []string{"Shenzhen Kaiyuan", "Anadolu Makina", "Emirates General Trading", "Hanoi Agro"}
	for _, name := range forbidden {
		if bytes.Contains(raw, []byte(name)) {
			t.Errorf("template pack contains forbidden mock %q", name)
		}
	}
	var pack struct {
		DealFields struct {
			InvoiceAmount string `json:"invoice_amount"`
		} `json:"deal_fields"`
		Counterparty struct {
			Name string `json:"name"`
		} `json:"counterparty"`
	}
	if err := json.Unmarshal(raw, &pack); err != nil {
		t.Fatal(err)
	}
	if pack.Counterparty.Name == "" || pack.DealFields.InvoiceAmount == "" || pack.DealFields.InvoiceAmount == "0" {
		t.Fatal("template pack must have realistic counterparty and amount")
	}
}

func TestHandbookMentionsEveryCatalogID(t *testing.T) {
	t.Parallel()
	handbook := filepath.Clean(filepath.Join(robotFixturesDir(t), "..", "..", "docs", "pilot", "scenario-role-directory.md"))
	raw, err := os.ReadFile(handbook)
	if err != nil {
		t.Fatal(err)
	}
	for _, s := range Catalog() {
		if !bytes.Contains(raw, []byte(s.ID)) {
			t.Errorf("handbook missing id %s", s.ID)
		}
	}
}
