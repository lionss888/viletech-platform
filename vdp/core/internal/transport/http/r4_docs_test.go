package httpapi_test

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestR4DocsDomainMatrixAllDone(t *testing.T) {
	t.Parallel()
	var done, other int
	for _, row := range nestEndpointParity {
		switch row.Module {
		case "counterparty", "comment", "file", "compliance-history", "docs":
		default:
			continue
		}
		if row.Status == ParityDone {
			done++
		} else {
			other++
			t.Errorf("%s %s status=%s want done", row.Module, row.NestPath, row.Status)
		}
	}
	if done < 40 {
		t.Fatalf("R4 docs modules done=%d want >=40 Nest web routes", done)
	}
	if other != 0 {
		t.Fatalf("R4 docs matrix incomplete: %d not done", other)
	}
}

func TestR4CounterpartyCRUDAndBanksRBAC(t *testing.T) {
	core, _, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	other := login(t, core, "manager@vdp.local", "manager")
	banks := []map[string]any{{"uuid": "bank-1", "name": "Test Bank", "accounts": []any{}}}
	body, _ := json.Marshal(map[string]any{"name": "ACME GmbH", "inn": "DE123", "banks": banks})
	res := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/counterparty/create", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+user)
	req.Header.Set("Content-Type", "application/json")
	core.ServeHTTP(res, req)
	if res.Code != http.StatusCreated {
		t.Fatalf("create %d %s", res.Code, res.Body.String())
	}
	var cp map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &cp)
	id, _ := cp["id"].(string)
	if id == "" {
		t.Fatal("missing id")
	}
	accBody, _ := json.Marshal(map[string]string{"number": "40817810", "currency": "EUR"})
	ares := httptest.NewRecorder()
	areq := httptest.NewRequest(http.MethodPatch, "/api/v1/counterparty/"+id+"/bank/bank-1/account", bytes.NewReader(accBody))
	areq.Header.Set("Authorization", "Bearer "+user)
	areq.Header.Set("Content-Type", "application/json")
	core.ServeHTTP(ares, areq)
	if ares.Code != http.StatusOK {
		t.Fatalf("add account %d %s", ares.Code, ares.Body.String())
	}
	fres := httptest.NewRecorder()
	freq := httptest.NewRequest(http.MethodDelete, "/api/v1/counterparty/"+id, nil)
	freq.Header.Set("Authorization", "Bearer "+other)
	core.ServeHTTP(fres, freq)
	if fres.Code != http.StatusForbidden {
		t.Fatalf("other delete want 403 got %d", fres.Code)
	}
}

func TestR4UploadAttachHistorySmoke(t *testing.T) {
	core, _, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	ico := login(t, core, "ico@vdp.local", "ico")
	form := postJSON(t, core, user, "/api/v1/forms", map[string]string{"currency": "USD", "invoice_amount": "50"})
	formID, _ := form["id"].(string)
	_ = postJSON(t, core, user, "/api/v1/forms/"+formID+"/actions/recognize_complete", nil)
	_ = postJSON(t, core, user, "/api/v1/forms/"+formID+"/actions/submit", nil)
	_ = postJSON(t, core, ico, "/api/v1/forms/"+formID+"/actions/ico_start", nil)

	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	_ = mw.WriteField("form_id", formID)
	part, _ := mw.CreateFormFile("file", "invoice.pdf")
	_, _ = part.Write([]byte("%PDF-1.4 fake content"))
	_ = mw.Close()
	ures := httptest.NewRecorder()
	ureq := httptest.NewRequest(http.MethodPost, "/api/v1/file-store/upload", &buf)
	ureq.Header.Set("Authorization", "Bearer "+user)
	ureq.Header.Set("Content-Type", mw.FormDataContentType())
	core.ServeHTTP(ures, ureq)
	if ures.Code != http.StatusCreated {
		t.Fatalf("upload %d %s", ures.Code, ures.Body.String())
	}
	var meta map[string]any
	_ = json.Unmarshal(ures.Body.Bytes(), &meta)
	fileID, _ := meta["id"].(string)
	if fileID == "" {
		t.Fatal("file id missing")
	}
	attached := postJSON(t, core, user, "/api/v1/forms/"+formID+"/docs/attach", map[string]string{
		"file_id": fileID, "kind": "invoice", "label": "invoice.pdf",
	})
	docs, _ := attached["docs_json"].(string)
	if docs == "" || !bytes.Contains([]byte(docs), []byte(fileID)) {
		t.Fatalf("docs_json missing file: %v", attached["docs_json"])
	}
	pres := httptest.NewRecorder()
	preq := httptest.NewRequest(http.MethodGet, "/api/v1/file-store/preview/private/"+fileID, nil)
	preq.Header.Set("Authorization", "Bearer "+user)
	core.ServeHTTP(pres, preq)
	if pres.Code != http.StatusOK || !bytes.Contains(pres.Body.Bytes(), []byte("%PDF")) {
		t.Fatalf("preview %d body=%s", pres.Code, pres.Body.String())
	}
	hres := httptest.NewRecorder()
	hreq := httptest.NewRequest(http.MethodGet, "/api/v1/compliance-history/"+formID, nil)
	hreq.Header.Set("Authorization", "Bearer "+ico)
	core.ServeHTTP(hres, hreq)
	if hres.Code != http.StatusOK {
		t.Fatalf("history %d %s", hres.Code, hres.Body.String())
	}
	var hist []any
	_ = json.Unmarshal(hres.Body.Bytes(), &hist)
	if len(hist) == 0 {
		t.Fatal("expected compliance history after transitions")
	}
	cres := httptest.NewRecorder()
	cbody, _ := json.Marshal(map[string]string{"entity_id": formID, "body": "please check docs"})
	creq := httptest.NewRequest(http.MethodPost, "/api/v1/comment", bytes.NewReader(cbody))
	creq.Header.Set("Authorization", "Bearer "+user)
	creq.Header.Set("Content-Type", "application/json")
	core.ServeHTTP(cres, creq)
	if cres.Code != http.StatusOK {
		t.Fatalf("comment %d %s", cres.Code, cres.Body.String())
	}
	mres := httptest.NewRecorder()
	mbody, _ := json.Marshal(map[string]string{"entity": formID})
	mreq := httptest.NewRequest(http.MethodPut, "/api/v1/comment/mark-as-read", bytes.NewReader(mbody))
	mreq.Header.Set("Authorization", "Bearer "+user)
	mreq.Header.Set("Content-Type", "application/json")
	core.ServeHTTP(mres, mreq)
	if mres.Code != http.StatusOK {
		t.Fatalf("mark-as-read %d %s", mres.Code, mres.Body.String())
	}
	eco := login(t, core, "eco@vdp.local", "eco")
	clients := httptest.NewRecorder()
	clreq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/compliance-officer/clients", nil)
	clreq.Header.Set("Authorization", "Bearer "+eco)
	core.ServeHTTP(clients, clreq)
	if clients.Code != http.StatusOK {
		t.Fatalf("eco clients %d %s", clients.Code, clients.Body.String())
	}
	forbid := httptest.NewRecorder()
	freq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/compliance-officer/clients", nil)
	freq.Header.Set("Authorization", "Bearer "+user)
	core.ServeHTTP(forbid, freq)
	if forbid.Code != http.StatusForbidden {
		t.Fatalf("user clients want 403 got %d", forbid.Code)
	}

	// site form/path preview + xlsx zip + approval skip
	pathPrev := httptest.NewRecorder()
	preq2 := httptest.NewRequest(http.MethodGet, "/api/v1/file-store/preview/private/"+formID+"/"+fileID, nil)
	preq2.Header.Set("Authorization", "Bearer "+user)
	core.ServeHTTP(pathPrev, preq2)
	if pathPrev.Code != http.StatusOK || !bytes.Contains(pathPrev.Body.Bytes(), []byte("%PDF")) {
		t.Fatalf("site path preview %d", pathPrev.Code)
	}
	cpBody, _ := json.Marshal(map[string]any{"name": "Export Co", "inn": "1", "banks": []any{}})
	cpres := httptest.NewRecorder()
	cpreq := httptest.NewRequest(http.MethodPost, "/api/v1/counterparty/create", bytes.NewReader(cpBody))
	cpreq.Header.Set("Authorization", "Bearer "+user)
	cpreq.Header.Set("Content-Type", "application/json")
	core.ServeHTTP(cpres, cpreq)
	var cp map[string]any
	_ = json.Unmarshal(cpres.Body.Bytes(), &cp)
	cpID, _ := cp["id"].(string)
	xlsx := httptest.NewRecorder()
	xreq := httptest.NewRequest(http.MethodGet, "/api/v1/counterparty/"+cpID+"/requests/xlsx", nil)
	xreq.Header.Set("Authorization", "Bearer "+user)
	core.ServeHTTP(xlsx, xreq)
	if xlsx.Code != 200 || !bytes.HasPrefix(xlsx.Body.Bytes(), []byte("PK")) {
		t.Fatalf("xlsx %d prefix=%q", xlsx.Code, xlsx.Body.Bytes()[:min(4, xlsx.Body.Len())])
	}
	mustOK(t, core, eco, http.MethodPut, "/api/v1/counterparty/"+cpID+"/approval", map[string]string{"status": "approved", "comment": "ok"})
	skip := getJSON(t, core, user, "/api/v1/counterparty/"+cpID+"/can-skip-compliance")
	if skip["canSkip"] != true {
		t.Fatalf("canSkip=%v", skip)
	}
	mustOK(t, core, ico, http.MethodPut, "/api/v1/organizations/66666666-6666-6666-6666-666666666666/organization-card", map[string]string{"file_id": fileID})
	card := httptest.NewRecorder()
	cardReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/internal-compliance-officer/clients/66666666-6666-6666-6666-666666666666/organization-card", nil)
	cardReq.Header.Set("Authorization", "Bearer "+ico)
	core.ServeHTTP(card, cardReq)
	if card.Code != 200 || !bytes.Contains(card.Body.Bytes(), []byte("%PDF")) {
		t.Fatalf("org card %d", card.Code)
	}
}
