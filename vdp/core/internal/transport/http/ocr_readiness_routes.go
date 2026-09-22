package httpapi

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/pkg/config"
)

func (s *Server) registerOCRReadinessRoutes() {
	s.mux.HandleFunc("GET /api/v1/ocr/readiness", s.withAuth(s.handleOCRReadiness))
}

// OCRReadiness is the cabinet-facing OCR availability payload.
type OCRReadiness struct {
	OK               bool   `json:"ok"`
	Extraction       string `json:"extraction"` // up | down
	DoclingReachable *bool  `json:"docling_reachable,omitempty"`
	Reason           string `json:"reason,omitempty"`
	Primary          string `json:"primary,omitempty"`
}

func (s *Server) handleOCRReadiness(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	_ = principal
	writeJSON(w, http.StatusOK, probeOCRReadiness(r.Context(), s.cfg, &http.Client{Timeout: 3 * time.Second}))
}

func probeOCRReadiness(ctx context.Context, cfg *config.Config, client *http.Client) OCRReadiness {
	extractionURL := "http://localhost:8093"
	if cfg != nil && strings.TrimSpace(cfg.ExtractionURL) != "" {
		extractionURL = strings.TrimRight(cfg.ExtractionURL, "/")
	}
	if client == nil {
		client = &http.Client{Timeout: 3 * time.Second}
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, extractionURL+"/health", nil)
	if err != nil {
		return OCRReadiness{OK: false, Extraction: "down", Reason: "probe_build_failed"}
	}
	resp, err := client.Do(req)
	if err != nil {
		return OCRReadiness{OK: false, Extraction: "down", Reason: "extraction_unreachable"}
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return OCRReadiness{OK: false, Extraction: "down", Reason: "extraction_http_error"}
	}
	var health map[string]any
	_ = json.Unmarshal(body, &health)
	out := OCRReadiness{OK: true, Extraction: "up"}
	if p, ok := health["primary"].(string); ok {
		out.Primary = p
	}
	if v, ok := health["docling_reachable"].(bool); ok {
		out.DoclingReachable = &v
		if !v && out.Primary == "docling" {
			out.OK = false
			out.Reason = "docling_unreachable"
		}
	} else if out.Primary == "docling" {
		// Health without docling probe: extraction is up; treat as ok but unknown docling.
		out.Reason = ""
	}
	return out
}
