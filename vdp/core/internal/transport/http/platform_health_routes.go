package httpapi

import (
	"net/http"
	"strings"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain/systemcap"
	"github.com/viletech/vdp/core/internal/platformhealth"
	"github.com/viletech/vdp/core/internal/scenarioverify"
	"github.com/viletech/vdp/core/pkg/config"
)

func (s *Server) registerPlatformHealthRoutes() {
	s.mux.HandleFunc("GET /api/v1/admin/platform-health", s.withAuth(s.handlePlatformHealth))
}

func (s *Server) handlePlatformHealth(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := authz.RequireSystemCapability(principal, systemcap.CapSystemAdmin); err != nil {
		writeError(w, err)
		return
	}
	env := ""
	if s.cfg != nil {
		env = s.cfg.Environment
	}
	started := time.Now()
	snap := platformhealth.Probe(r.Context(), platformhealth.ProbeConfig{
		Environment:        env,
		AllowsMutatingRuns: scenarioverify.AllowsMutatingRuns(env),
		HTTPClient:         &http.Client{Timeout: 3 * time.Second},
		CoreSelf: platformhealth.ServiceResult{
			ID: "core", Name: "Ядро (core)", State: platformhealth.StateUp,
			LatencyMs: time.Since(started).Milliseconds(), Detail: "ok · vdp-core",
		},
		Targets: platformHealthTargets(s.cfg),
	})
	writeJSON(w, http.StatusOK, snap)
}

func platformHealthTargets(cfg *config.Config) []platformhealth.Target {
	hubURL := "http://localhost:8081"
	extractionURL := "http://localhost:8093"
	docsHealth := "http://localhost:8090/health"
	mailHealth := "http://localhost:8091/health"
	smsHealth := "http://localhost:8092/health"
	managerOpsHealth := ""
	if cfg != nil {
		if strings.TrimSpace(cfg.HubURL) != "" {
			hubURL = strings.TrimRight(cfg.HubURL, "/")
		}
		if strings.TrimSpace(cfg.ExtractionURL) != "" {
			extractionURL = strings.TrimRight(cfg.ExtractionURL, "/")
		}
		if strings.TrimSpace(cfg.DocsHealthURL) != "" {
			docsHealth = cfg.DocsHealthURL
		}
		if strings.TrimSpace(cfg.MailHealthURL) != "" {
			mailHealth = cfg.MailHealthURL
		}
		if strings.TrimSpace(cfg.SMSHealthURL) != "" {
			smsHealth = cfg.SMSHealthURL
		}
		if strings.TrimSpace(cfg.ManagerOpsHealthURL) != "" {
			managerOpsHealth = cfg.ManagerOpsHealthURL
		}
	}
	out := []platformhealth.Target{
		{ID: "hub", Name: "Hub (интеграции)", URL: hubURL + "/api/v1/health"},
		{ID: "docs", Name: "Документы (docs-service)", URL: docsHealth},
		{ID: "extraction", Name: "Распознавание (extraction)", URL: extractionURL + "/health"},
		{ID: "mail", Name: "Почта (mail-gateway)", URL: mailHealth},
		{ID: "sms", Name: "SMS (sms-gateway)", URL: smsHealth},
	}
	if managerOpsHealth != "" {
		out = append(out, platformhealth.Target{
			ID: "manager-ops", Name: "Manager ops", URL: managerOpsHealth, Optional: true,
		})
	}
	return out
}
