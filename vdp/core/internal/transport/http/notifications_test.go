package httpapi_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestTelegramLinkAndWorkChatJoin(t *testing.T) {
	core, secret, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	manager := login(t, core, "manager@vdp.local", "manager")

	link := postJSON(t, core, user, "/api/v1/me/telegram/link", nil)
	code, _ := link["code"].(string)
	if code == "" {
		t.Fatalf("%#v", link)
	}
	body, _ := json.Marshal(map[string]string{"code": code, "chat_id": "tg-1"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/internal/telegram/bind", bytes.NewReader(body))
	req.Header.Set("X-VDP-S2S", secret)
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	core.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("bind %d %s", res.Code, res.Body.String())
	}
	me := getJSON(t, core, user, "/api/v1/account")
	if me["telegram_linked"] != true {
		t.Fatalf("me %#v", me)
	}

	chats := getJSONArray(t, core, user, "/api/v1/work-chats")
	if len(chats) < 1 {
		t.Fatal("work chats")
	}
	join := postJSON(t, core, user, "/api/v1/work-chats/wc-ops/join", nil)
	joinID, _ := join["id"].(string)
	if join["status"] != "pending" {
		t.Fatalf("%#v", join)
	}
	forbidden := httptest.NewRecorder()
	freq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/work-chats/joins/"+joinID+"/approve", nil)
	freq.Header.Set("Authorization", "Bearer "+user)
	core.ServeHTTP(forbidden, freq)
	if forbidden.Code != http.StatusForbidden {
		t.Fatalf("user approve code=%d", forbidden.Code)
	}
	approved := postJSON(t, core, manager, "/api/v1/admin/work-chats/joins/"+joinID+"/approve", nil)
	if approved["status"] != "approved" {
		t.Fatalf("%#v", approved)
	}

	on := map[string]string{}
	raw, _ := json.Marshal(map[string]any{"sms_notify_enabled": true})
	preq := httptest.NewRequest(http.MethodPatch, "/api/v1/me/notifications", bytes.NewReader(raw))
	preq.Header.Set("Authorization", "Bearer "+user)
	preq.Header.Set("Content-Type", "application/json")
	pres := httptest.NewRecorder()
	core.ServeHTTP(pres, preq)
	if pres.Code != http.StatusOK {
		t.Fatalf("prefs %d %s", pres.Code, pres.Body.String())
	}
	_ = on
}

func TestDiadocStatusIdleAndRejectedCallback(t *testing.T) {
	core, secret, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	form := postJSON(t, core, user, "/api/v1/forms", map[string]string{"currency": "USD", "invoice_amount": "10"})
	id, _ := form["id"].(string)
	st := getJSON(t, core, user, "/api/v1/forms/"+id+"/diadoc-status")
	if st["status"] != "idle" || st["manual_path"] != true {
		t.Fatalf("%#v", st)
	}
	body, _ := json.Marshal(map[string]any{"form_payment_id": id, "action": "diadoc_rejected", "reason": "timeout"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/internal/hub/callback", bytes.NewReader(body))
	req.Header.Set("X-VDP-S2S", secret)
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	core.ServeHTTP(res, req)
	if res.Code != 200 {
		t.Fatalf("reject %d %s", res.Code, res.Body.String())
	}
	st = getJSON(t, core, user, "/api/v1/forms/"+id+"/diadoc-status")
	if st["status"] != "failed" {
		t.Fatalf("after reject %#v", st)
	}
	still := getJSON(t, core, user, "/api/v1/forms/"+id)
	if still["status"] != "creating" && still["status"] != "draft" {
		t.Fatalf("status mutated %#v", still["status"])
	}
}
