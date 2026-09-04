package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/viletech/vdp/release-gate/internal/authn"
	"github.com/viletech/vdp/release-gate/internal/domain"
	"github.com/viletech/vdp/release-gate/internal/usecase"
)

type Server struct {
	svc   *usecase.Service
	auth  *authn.Service
	mux   *http.ServeMux
}

func New(svc *usecase.Service, auth *authn.Service) *Server {
	s := &Server{svc: svc, auth: auth, mux: http.NewServeMux()}
	s.mux.HandleFunc("GET /api/v1/health", s.health)
	s.mux.HandleFunc("POST /api/v1/auth/local", s.loginLocal)
	s.mux.HandleFunc("GET /api/v1/auth/github/start", s.oauthStart("github"))
	s.mux.HandleFunc("GET /api/v1/auth/gitlab/start", s.oauthStart("gitlab"))
	s.mux.HandleFunc("GET /api/v1/auth/github/callback", s.oauthCallback("github"))
	s.mux.HandleFunc("GET /api/v1/auth/gitlab/callback", s.oauthCallback("gitlab"))
	s.mux.HandleFunc("GET /api/v1/me", s.withAuth(s.me))
	s.mux.HandleFunc("GET /api/v1/releases", s.withAuth(s.releases))
	s.mux.HandleFunc("GET /api/v1/environments", s.withAuth(s.environments))
	s.mux.HandleFunc("GET /api/v1/environments/{env}", s.withAuth(s.environment))
	s.mux.HandleFunc("POST /api/v1/environments/{env}/promote", s.withAuth(s.promote))
	s.mux.HandleFunc("POST /api/v1/environments/{env}/rollback", s.withAuth(s.rollback))
	s.mux.HandleFunc("PUT /api/v1/environments/{env}/schedule", s.withAuth(s.setSchedule))
	s.mux.HandleFunc("PUT /api/v1/environments/{env}/approvers", s.withAuth(s.setApprovers))
	return s
}

func (s *Server) Handler() http.Handler {
	return cors(s.mux)
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) loginLocal(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	token, id, err := s.auth.LoginLocal(body.Email, body.Password)
	if err != nil {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "identity": id})
}

func (s *Server) oauthStart(provider string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cfg := oauthConfig(provider)
		if cfg.clientID == "" {
			http.Error(w, provider+" oauth is not configured", http.StatusNotImplemented)
			return
		}
		q := url.Values{}
		q.Set("client_id", cfg.clientID)
		q.Set("redirect_uri", cfg.redirect)
		q.Set("response_type", "code")
		q.Set("scope", cfg.scope)
		http.Redirect(w, r, cfg.authorize+"?"+q.Encode(), http.StatusFound)
	}
}

func (s *Server) oauthCallback(provider string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cfg := oauthConfig(provider)
		code := r.URL.Query().Get("code")
		if code == "" || cfg.clientID == "" {
			http.Error(w, "oauth failed", http.StatusBadRequest)
			return
		}
		login, err := exchangeOAuth(r.Context(), provider, cfg, code)
		if err != nil {
			http.Error(w, "oauth exchange failed", http.StatusBadGateway)
			return
		}
		token, id, err := s.auth.IdentityFromOAuth(provider, login)
		if err != nil {
			http.Error(w, "token failed", http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"token": token, "identity": id})
	}
}

func (s *Server) me(w http.ResponseWriter, _ *http.Request, id domain.Identity) {
	writeJSON(w, http.StatusOK, id)
}

func (s *Server) releases(w http.ResponseWriter, r *http.Request, id domain.Identity) {
	list, err := s.svc.ListReleases(r.Context(), id)
	if err != nil {
		writeUsecaseError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (s *Server) environments(w http.ResponseWriter, r *http.Request, id domain.Identity) {
	list, err := s.svc.ListEnvironments(r.Context(), id)
	if err != nil {
		writeUsecaseError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (s *Server) environment(w http.ResponseWriter, r *http.Request, id domain.Identity) {
	env := domain.Environment(r.PathValue("env"))
	st, err := s.svc.GetEnvironment(r.Context(), id, env)
	if err != nil {
		writeUsecaseError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, st)
}

func (s *Server) promote(w http.ResponseWriter, r *http.Request, id domain.Identity) {
	s.mutate(w, r, id, false)
}

func (s *Server) rollback(w http.ResponseWriter, r *http.Request, id domain.Identity) {
	s.mutate(w, r, id, true)
}

func (s *Server) mutate(w http.ResponseWriter, r *http.Request, id domain.Identity, rollback bool) {
	var body struct {
		ImagesRunID string `json:"images_run_id"`
		Tag         string `json:"tag"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	cmd := domain.PromoteCommand{
		Environment: domain.Environment(r.PathValue("env")),
		ImagesRunID: body.ImagesRunID,
		Tag:         body.Tag,
	}
	var err error
	if rollback {
		err = s.svc.Rollback(r.Context(), id, cmd)
	} else {
		err = s.svc.Promote(r.Context(), id, cmd)
	}
	if err != nil {
		writeUsecaseError(w, err)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]string{"status": "accepted"})
}

func (s *Server) setSchedule(w http.ResponseWriter, r *http.Request, id domain.Identity) {
	var body struct {
		Mode   string `json:"mode"`
		Window string `json:"window"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if err := s.svc.SetSchedule(r.Context(), id, domain.Environment(r.PathValue("env")), body.Mode, body.Window); err != nil {
		writeUsecaseError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) setApprovers(w http.ResponseWriter, r *http.Request, id domain.Identity) {
	var body struct {
		Logins []string `json:"logins"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if err := s.svc.SetApprovers(r.Context(), id, domain.Environment(r.PathValue("env")), body.Logins); err != nil {
		writeUsecaseError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) withAuth(next func(http.ResponseWriter, *http.Request, domain.Identity)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			http.Error(w, "missing token", http.StatusUnauthorized)
			return
		}
		id, err := s.auth.Parse(strings.TrimPrefix(header, "Bearer "))
		if err != nil {
			http.Error(w, "invalid token", http.StatusUnauthorized)
			return
		}
		next(w, r, id)
	}
}

func writeUsecaseError(w http.ResponseWriter, err error) {
	var forbidden usecase.ForbiddenError
	if errors.As(err, &forbidden) {
		http.Error(w, forbidden.Error(), http.StatusForbidden)
		return
	}
	http.Error(w, err.Error(), http.StatusBadGateway)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", os.Getenv("RELEASE_GATE_CORS_ORIGIN"))
		if w.Header().Get("Access-Control-Allow-Origin") == "" {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

type oauthCfg struct {
	clientID     string
	clientSecret string
	redirect     string
	authorize    string
	tokenURL     string
	userURL      string
	scope        string
	loginField   string
}

func oauthConfig(provider string) oauthCfg {
	switch provider {
	case "github":
		return oauthCfg{
			clientID:     os.Getenv("GITHUB_OAUTH_CLIENT_ID"),
			clientSecret: os.Getenv("GITHUB_OAUTH_CLIENT_SECRET"),
			redirect:     os.Getenv("GITHUB_OAUTH_REDIRECT"),
			authorize:    "https://github.com/login/oauth/authorize",
			tokenURL:     "https://github.com/login/oauth/access_token",
			userURL:      "https://api.github.com/user",
			scope:        "read:user",
			loginField:   "login",
		}
	default:
		return oauthCfg{
			clientID:     os.Getenv("GITLAB_OAUTH_CLIENT_ID"),
			clientSecret: os.Getenv("GITLAB_OAUTH_CLIENT_SECRET"),
			redirect:     os.Getenv("GITLAB_OAUTH_REDIRECT"),
			authorize:    "https://gitlab.com/oauth/authorize",
			tokenURL:     "https://gitlab.com/oauth/token",
			userURL:      "https://gitlab.com/api/v4/user",
			scope:        "read_user",
			loginField:   "username",
		}
	}
}

func exchangeOAuth(_ context.Context, provider string, cfg oauthCfg, code string) (string, error) {
	form := url.Values{}
	form.Set("client_id", cfg.clientID)
	form.Set("client_secret", cfg.clientSecret)
	form.Set("code", code)
	form.Set("grant_type", "authorization_code")
	form.Set("redirect_uri", cfg.redirect)
	req, err := http.NewRequest(http.MethodPost, cfg.tokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	var tok struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(raw, &tok); err != nil || tok.AccessToken == "" {
		return "", errors.New("no access token")
	}
	ureq, err := http.NewRequest(http.MethodGet, cfg.userURL, nil)
	if err != nil {
		return "", err
	}
	if provider == "github" {
		ureq.Header.Set("Authorization", "Bearer "+tok.AccessToken)
	} else {
		ureq.Header.Set("Authorization", "Bearer "+tok.AccessToken)
	}
	uresp, err := http.DefaultClient.Do(ureq)
	if err != nil {
		return "", err
	}
	defer uresp.Body.Close()
	var user map[string]any
	if err := json.NewDecoder(uresp.Body).Decode(&user); err != nil {
		return "", err
	}
	login, _ := user[cfg.loginField].(string)
	if login == "" {
		return "", errors.New("no login")
	}
	return login, nil
}
