package main

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

type notifyRequest struct {
	EventID        string         `json:"event_id"`
	FormPaymentID  string         `json:"form_payment_id"`
	Channel        string         `json:"channel"`
	To             string         `json:"to"`
	Template       string         `json:"template"`
	IdempotencyKey string         `json:"idempotency_key"`
	Text           string         `json:"text"`
	Payload        map[string]any `json:"payload"`
	Probe          bool           `json:"probe"`
}

type smsProvider interface {
	Send(to, text string) error
	Name() string
}

type gateway struct {
	provider smsProvider
	mu       sync.Mutex
	seen     map[string]struct{}
	last     map[string]time.Time
}

func main() {
	addr := env("PORT", "8092")
	gw := &gateway{provider: newProvider(), seen: map[string]struct{}{}, last: map[string]time.Time{}}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "service": "sms-gateway", "provider": gw.provider.Name()})
	})
	mux.HandleFunc("POST /notify", gw.handleNotify)
	log.Printf("sms-gateway listening on %s provider=%s", addr, gw.provider.Name())
	log.Fatal(http.ListenAndServe(":"+addr, mux))
}

func (g *gateway) handleNotify(w http.ResponseWriter, r *http.Request) {
	var req notifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if req.Probe {
		writeJSON(w, http.StatusOK, map[string]any{"status": "probe_ok"})
		return
	}
	key := strings.TrimSpace(req.IdempotencyKey)
	if key == "" {
		key = strings.TrimSpace(req.EventID)
	}
	if key == "" || strings.TrimSpace(req.To) == "" {
		http.Error(w, "event_id/idempotency_key and to required", http.StatusBadRequest)
		return
	}
	g.mu.Lock()
	if _, ok := g.seen[key]; ok {
		g.mu.Unlock()
		writeJSON(w, http.StatusOK, map[string]any{"status": "duplicate", "channel": "sms"})
		return
	}
	if prev, ok := g.last[req.To]; ok && time.Since(prev) < 2*time.Second {
		g.mu.Unlock()
		http.Error(w, "rate limited", http.StatusTooManyRequests)
		return
	}
	g.seen[key] = struct{}{}
	g.last[req.To] = time.Now()
	g.mu.Unlock()
	text := req.Text
	if text == "" {
		text = req.Template + " " + req.FormPaymentID
	}
	if err := g.provider.Send(req.To, text); err != nil {
		log.Printf("sms send failed to=%s form=%s err=%v", maskPhone(req.To), req.FormPaymentID, err)
		http.Error(w, "send failed", http.StatusBadGateway)
		return
	}
	log.Printf("sms accepted to=%s form=%s template=%s", maskPhone(req.To), req.FormPaymentID, req.Template)
	writeJSON(w, http.StatusOK, map[string]any{"status": "accepted", "channel": "sms", "mode": g.provider.Name()})
}

func newProvider() smsProvider {
	mode := strings.ToLower(env("SMS_PROVIDER", "local"))
	if mode == "http" || os.Getenv("SMS_PROVIDER_URL") != "" {
		url := os.Getenv("SMS_PROVIDER_URL")
		if url != "" {
			return httpProvider{url: url, timeout: 5 * time.Second}
		}
		log.Printf("SMS_PROVIDER=http missing SMS_PROVIDER_URL, falling back to local")
	}
	return localSMS{}
}

type localSMS struct{}

func (localSMS) Name() string { return "local" }
func (localSMS) Send(to, text string) error {
	log.Printf("local sms to=%s", maskPhone(to))
	_ = text
	return nil
}

type httpProvider struct {
	url     string
	timeout time.Duration
}

func (h httpProvider) Name() string { return "http" }
func (h httpProvider) Send(to, text string) error {
	raw, _ := json.Marshal(map[string]string{"to": to, "text": text})
	client := &http.Client{Timeout: h.timeout}
	resp, err := client.Post(h.url, "application/json", bytes.NewReader(raw))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 1<<16))
	if resp.StatusCode >= 300 {
		return errStatus(resp.StatusCode)
	}
	return nil
}

type statusErr int

func errStatus(code int) error { return statusErr(code) }
func (e statusErr) Error() string {
	return http.StatusText(int(e))
}

func maskPhone(to string) string {
	to = strings.TrimSpace(to)
	if len(to) <= 4 {
		return "****"
	}
	return to[:2] + "****" + to[len(to)-2:]
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
