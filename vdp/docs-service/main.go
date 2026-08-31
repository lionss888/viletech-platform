package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

func main() {
	addr := env("PORT", "8090")
	path := env("DOCS_PATH", "/generate")
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
	mux.HandleFunc("POST "+path, handleGenerate)
	log.Printf("docs-service listening on %s path=%s", addr, path)
	log.Fatal(http.ListenAndServe(":"+addr, mux))
}

func handleGenerate(w http.ResponseWriter, r *http.Request) {
	var body map[string]any
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	formID, _ := body["form_payment_id"].(string)
	if formID == "" {
		http.Error(w, "form_payment_id required", http.StatusBadRequest)
		return
	}
	kind, _ := body["kind"].(string)
	if kind == "" {
		kind = "payment_order"
	}
	if body["probe"] == true {
		writeJSON(w, http.StatusOK, map[string]any{"status": "probe_ok"})
		return
	}
	storageKey := fmt.Sprintf("docs/%s/%s.pdf", formID, kind)
	pdf := buildMinimalPDF(formID, kind, body)
	writeJSON(w, http.StatusOK, map[string]any{
		"status":      "generated",
		"storage_key": storageKey,
		"mime":        "application/pdf",
		"content":     string(pdf),
	})
}

func buildMinimalPDF(formID, kind string, payload map[string]any) []byte {
	var b strings.Builder
	b.WriteString("%PDF-1.4\n")
	b.WriteString(fmt.Sprintf("%% vdp docs-service %s\n", time.Now().UTC().Format(time.RFC3339)))
	b.WriteString(fmt.Sprintf("%% form=%s kind=%s\n", formID, kind))
	for _, key := range []string{
		"organization_name", "organization_inn", "organization_signer_name",
		"agent_name", "counterparty_name", "payment_purpose", "invoice_amount", "currency",
	} {
		if v, ok := payload[key].(string); ok && v != "" {
			b.WriteString(fmt.Sprintf("%% %s: %s\n", key, v))
		}
	}
	return []byte(b.String())
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
