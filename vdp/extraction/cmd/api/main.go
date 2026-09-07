package main

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"

	"github.com/viletech/vdp/extraction/internal/metrics"
	"github.com/viletech/vdp/extraction/internal/service"
	"github.com/viletech/vdp/shared/extraction"
)

func main() {
	log := slog.Default()
	cfg := service.Config{
		Primary:        env("EXTRACTION_PRIMARY", "fixture"),
		Fallback:       env("EXTRACTION_FALLBACK", "fixture"),
		ShadowURL:      os.Getenv("EXTRACTION_SHADOW_URL"),
		GoldDir:        env("EXTRACTION_GOLD_DIR", "/var/vdp/extraction-gold"),
		YandexAPIKey:   os.Getenv("YANDEX_API_KEY"),
		YandexFolderID: os.Getenv("YANDEX_FOLDER_ID"),
		YandexModelURI: os.Getenv("YANDEX_MODEL_URI"),
		OwnModelPath:   os.Getenv("OWN_MODEL_PATH"),
		OllamaBaseURL:  os.Getenv("OLLAMA_BASE_URL"),
		OllamaModel:    env("OLLAMA_MODEL", "qwen2.5:3b"),
		OwnFewShotK:    service.ParseFewShotK(os.Getenv("OWN_FEW_SHOT_K")),
		Log:            log,
	}
	if cfg.Primary == "yandex" && (cfg.YandexAPIKey == "" || cfg.YandexFolderID == "") {
		log.Warn("YANDEX_API_KEY or YANDEX_FOLDER_ID missing; forcing fixture primary")
		cfg.Primary = "fixture"
	}
	if cfg.Primary == "own" && cfg.OllamaBaseURL == "" {
		log.Warn("EXTRACTION_PRIMARY=own without OLLAMA_BASE_URL; stub/artifact only")
	}
	svc := service.New(cfg)
	addr := env("PORT", "8093")
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"status":          "ok",
			"primary":         cfg.Primary,
			"ollama_configured": cfg.OllamaBaseURL != "",
		})
	})
	mux.HandleFunc("GET /metrics", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, metrics.Default.Snapshot())
	})
	mux.HandleFunc("POST /recognize", func(w http.ResponseWriter, r *http.Request) {
		var req service.RecognizeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if req.FormPaymentID == "" {
			http.Error(w, "form_payment_id required", http.StatusBadRequest)
			return
		}
		out, err := svc.Recognize(r.Context(), req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadGateway)
			return
		}
		writeJSON(w, http.StatusOK, out)
	})
	mux.HandleFunc("POST /gold/human", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			FormPaymentID string            `json:"form_payment_id"`
			GoldID        string            `json:"gold_id"`
			Human         extraction.Result `json:"human"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if body.FormPaymentID == "" {
			http.Error(w, "form_payment_id required", http.StatusBadRequest)
			return
		}
		if err := svc.ConfirmHuman(body.FormPaymentID, body.GoldID, body.Human); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
	})
	log.Info("extraction listening", "addr", addr, "primary", cfg.Primary)
	log.Error("server exit", "err", http.ListenAndServe(":"+addr, mux))
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
