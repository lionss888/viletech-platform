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

func TestRobotMatrixRowsCoverCatalogSpine(t *testing.T) {
	t.Parallel()
	raw, err := os.ReadFile(filepath.Join(robotFixturesDir(t), "matrix-rows.json"))
	if err != nil {
		t.Fatal(err)
	}
	var doc struct {
		Rows []struct {
			ID string `json:"id"`
		} `json:"rows"`
	}
	if err := json.Unmarshal(raw, &doc); err != nil {
		t.Fatal(err)
	}
	have := map[string]bool{}
	for _, r := range doc.Rows {
		have[r.ID] = true
	}
	required := []string{
		IDHappyPathToCompleted,
		IDContinuityManagerForm,
		IDManagerRejectCorrections,
		IDUserResubmitAfterReject,
		IDManagerPaymentAssignProvider,
		IDProviderPaymentNoPII,
		IDRootCancel,
		IDDocPreviewVisible,
		IDExtractionConfirmAmount,
		IDManagerHidesDrafts,
		IDRefundSmoke,
		IDBankChannelBadge,
	}
	for _, id := range required {
		if !have[id] {
			t.Errorf("matrix-rows missing catalog id %s", id)
		}
	}
	if !have["happy_path_shipment_branch"] {
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
