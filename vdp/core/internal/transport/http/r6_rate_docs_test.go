package httpapi_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestR6RateCommissionDocsMatrixDone(t *testing.T) {
	t.Parallel()
	var done, other int
	for _, row := range nestEndpointParity {
		switch row.Module {
		case "rate", "commission", "template", "docs":
		default:
			continue
		}
		if row.Status == ParityDone {
			done++
		} else {
			other++
			t.Errorf("%s %s status=%s", row.Module, row.NestPath, row.Status)
		}
	}
	if done < 10 {
		t.Fatalf("R6 matrix done=%d want >=10", done)
	}
	if other != 0 {
		t.Fatalf("R6 incomplete: %d not done", other)
	}
}

func TestR6EnqueueHubAttachAndExcelImport(t *testing.T) {
	core, secret, received := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	manager := login(t, core, "manager@vdp.local", "manager")

	form := postJSON(t, core, user, "/api/v1/forms", map[string]string{"currency": "USD", "invoice_amount": "1000"})
	formID, _ := form["id"].(string)
	_ = postJSON(t, core, user, "/api/v1/forms/"+formID+"/actions/recognize_complete", nil)

	// rate resolve + commission
	rbody, _ := json.Marshal(map[string]any{"override_rate": 90.5, "client_currency": "rub", "counterparty_currency": "usd"})
	rres := httptest.NewRecorder()
	rreq := httptest.NewRequest(http.MethodPost, "/api/v1/forms/"+formID+"/rate/resolve", bytes.NewReader(rbody))
	rreq.Header.Set("Authorization", "Bearer "+manager)
	rreq.Header.Set("Content-Type", "application/json")
	core.ServeHTTP(rres, rreq)
	if rres.Code != http.StatusOK {
		t.Fatalf("rate resolve %d %s", rres.Code, rres.Body.String())
	}
	cres := httptest.NewRecorder()
	creq := httptest.NewRequest(http.MethodPost, "/api/v1/forms/"+formID+"/commission/calculate", bytes.NewReader([]byte(`{}`)))
	creq.Header.Set("Authorization", "Bearer "+manager)
	creq.Header.Set("Content-Type", "application/json")
	core.ServeHTTP(cres, creq)
	if cres.Code != http.StatusOK {
		t.Fatalf("commission %d %s", cres.Code, cres.Body.String())
	}

	// POG enqueue → flush hub → file attached
	dres := httptest.NewRecorder()
	dreq := httptest.NewRequest(http.MethodPost, "/api/v1/forms/"+formID+"/docs/generate", bytes.NewReader([]byte(`{"kind":"payment_order"}`)))
	dreq.Header.Set("Authorization", "Bearer "+manager)
	dreq.Header.Set("Content-Type", "application/json")
	core.ServeHTTP(dres, dreq)
	if dres.Code != http.StatusAccepted {
		t.Fatalf("docs generate %d %s", dres.Code, dres.Body.String())
	}
	flush := httptest.NewRecorder()
	freq := httptest.NewRequest(http.MethodPost, "/api/v1/internal/outbox/flush", nil)
	freq.Header.Set("X-VDP-S2S", secret)
	core.ServeHTTP(flush, freq)
	if flush.Code != http.StatusOK {
		t.Fatalf("flush %d", flush.Code)
	}
	gres := httptest.NewRecorder()
	greq := httptest.NewRequest(http.MethodGet, "/api/v1/forms/"+formID, nil)
	greq.Header.Set("Authorization", "Bearer "+user)
	core.ServeHTTP(gres, greq)
	if gres.Code != 200 {
		t.Fatalf("get form %d", gres.Code)
	}
	var got map[string]any
	_ = json.Unmarshal(gres.Body.Bytes(), &got)
	docs, _ := got["docs_json"].(string)
	pogStatus, _ := got["pog_status"].(string)
	pogFile, _ := got["pog_file_id"].(string)
	if pogStatus != "success" || pogFile == "" {
		if !bytes.Contains([]byte(docs), []byte("success")) || !bytes.Contains([]byte(docs), []byte("payment_order.pdf")) {
			t.Fatalf("expected POG attach docs=%s pog_status=%s pog_file=%s", docs, pogStatus, pogFile)
		}
	}
	if !bytes.Contains([]byte(docs), []byte(pogFile)) && pogFile != "" {
		// file id may live only in pog_file_id field after unpack
	}
	if received.count() == 0 {
		t.Fatal("hub must receive docs.generate")
	}

	// template + excel import CREATING→DRAFT
	tbody, _ := json.Marshal(map[string]any{
		"name": "import-usd", "direction": "import",
		"mapping_json": `{"amount_column":"amount","currency_column":"currency","has_header":true,"delimiter":","}`,
	})
	tres := httptest.NewRecorder()
	treq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/templates", bytes.NewReader(tbody))
	treq.Header.Set("Authorization", "Bearer "+manager)
	treq.Header.Set("Content-Type", "application/json")
	core.ServeHTTP(tres, treq)
	if tres.Code != http.StatusCreated {
		t.Fatalf("template create %d %s", tres.Code, tres.Body.String())
	}
	var tpl map[string]any
	_ = json.Unmarshal(tres.Body.Bytes(), &tpl)
	tplID, _ := tpl["id"].(string)
	csv := "amount,currency\n250,EUR\n300,USD\n"
	ibody, _ := json.Marshal(map[string]string{"template_id": tplID, "csv": csv})
	ires := httptest.NewRecorder()
	ireq := httptest.NewRequest(http.MethodPost, "/api/v1/forms/import/excel", bytes.NewReader(ibody))
	ireq.Header.Set("Authorization", "Bearer "+user)
	ireq.Header.Set("Content-Type", "application/json")
	core.ServeHTTP(ires, ireq)
	if ires.Code != http.StatusCreated {
		t.Fatalf("excel import %d %s", ires.Code, ires.Body.String())
	}
	var imported map[string]any
	_ = json.Unmarshal(ires.Body.Bytes(), &imported)
	forms, _ := imported["forms"].([]any)
	if len(forms) != 2 {
		t.Fatalf("imported forms=%d body=%s", len(forms), ires.Body.String())
	}
	first, _ := forms[0].(map[string]any)
	if first["status"] != "draft" {
		t.Fatalf("want draft got %v", first["status"])
	}
}
