package main

import (
	"encoding/json"
	"log"
	"net/http"
	"net/smtp"
	"os"
	"strings"
	"sync"
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

type mailProvider interface {
	Send(to, subject, body string) error
	Name() string
}

type gateway struct {
	provider mailProvider
	mu       sync.Mutex
	seen     map[string]struct{}
}

func main() {
	addr := env("PORT", "8091")
	gw := &gateway{provider: newProvider(), seen: map[string]struct{}{}}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "service": "mail-gateway", "provider": gw.provider.Name()})
	})
	mux.HandleFunc("POST /notify", gw.handleNotify)
	log.Printf("mail-gateway listening on %s provider=%s", addr, gw.provider.Name())
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
		writeJSON(w, http.StatusOK, map[string]any{"status": "duplicate", "channel": "mail"})
		return
	}
	g.seen[key] = struct{}{}
	g.mu.Unlock()
	subject := "VDP: " + req.Template
	body := req.Text
	if body == "" {
		body = "form " + req.FormPaymentID + " template=" + req.Template
	}
	if err := g.provider.Send(req.To, subject, body); err != nil {
		log.Printf("mail send failed to=%s form=%s err=%v", mask(req.To), req.FormPaymentID, err)
		http.Error(w, "send failed", http.StatusBadGateway)
		return
	}
	log.Printf("mail accepted to=%s form=%s template=%s", mask(req.To), req.FormPaymentID, req.Template)
	writeJSON(w, http.StatusOK, map[string]any{"status": "accepted", "channel": "mail", "mode": g.provider.Name()})
}

func newProvider() mailProvider {
	if strings.ToLower(env("MAIL_PROVIDER", "local")) == "smtp" {
		host := os.Getenv("MAIL_SMTP_HOST")
		from := os.Getenv("MAIL_SMTP_FROM")
		if host != "" && from != "" {
			return smtpProvider{host: host, from: from, user: os.Getenv("MAIL_SMTP_USER"), pass: os.Getenv("MAIL_SMTP_PASSWORD")}
		}
		log.Printf("MAIL_PROVIDER=smtp missing host/from, falling back to local")
	}
	return localProvider{}
}

type localProvider struct{}

func (localProvider) Name() string { return "local" }
func (localProvider) Send(to, subject, body string) error {
	log.Printf("local mail to=%s subject=%s", mask(to), subject)
	_ = body
	return nil
}

type smtpProvider struct {
	host, from, user, pass string
}

func (s smtpProvider) Name() string { return "smtp" }
func (s smtpProvider) Send(to, subject, body string) error {
	msg := "From: " + s.from + "\r\nTo: " + to + "\r\nSubject: " + subject + "\r\n\r\n" + body
	var auth smtp.Auth
	if s.user != "" {
		hostOnly := s.host
		if i := strings.Index(hostOnly, ":"); i >= 0 {
			hostOnly = hostOnly[:i]
		}
		auth = smtp.PlainAuth("", s.user, s.pass, hostOnly)
	}
	return smtp.SendMail(s.host, auth, s.from, []string{to}, []byte(msg))
}

func mask(to string) string {
	to = strings.TrimSpace(to)
	if i := strings.Index(to, "@"); i > 0 {
		return to[:1] + "***@" + to[i+1:]
	}
	return "***"
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
