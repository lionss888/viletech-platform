package main

import (
	"log/slog"
	"net/http"
	"os"

	githubforge "github.com/viletech/vdp/release-gate/internal/adapter/github"
	gitlabforge "github.com/viletech/vdp/release-gate/internal/adapter/gitlab"
	"github.com/viletech/vdp/release-gate/internal/authn"
	httpapi "github.com/viletech/vdp/release-gate/internal/transport/http"
	"github.com/viletech/vdp/release-gate/internal/usecase"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	repo := envOr("GITHUB_REPOSITORY", "viletech/viletech-platform")
	token := firstNonEmpty(os.Getenv("GITHUB_APP_TOKEN"), os.Getenv("GITHUB_TOKEN"), os.Getenv("RELEASE_GATE_GITHUB_TOKEN"))
	primary := githubforge.New(os.Getenv("GITHUB_API_URL"), token, repo)
	var secondary *gitlabforge.Client
	if glToken := os.Getenv("RELEASE_GATE_GITLAB_TOKEN"); glToken != "" {
		secondary = gitlabforge.New(os.Getenv("GITLAB_API_URL"), glToken, envOr("GITLAB_PROJECT_ID", "sandbox6902635/viletech-platform"))
	}
	svc := usecase.New(primary, secondary)
	auth := authn.New(os.Getenv("RELEASE_GATE_JWT_SECRET"))
	server := httpapi.New(svc, auth)
	addr := envOr("RELEASE_GATE_LISTEN", ":8090")
	log.Info("vdp-release-gate listening", "addr", addr, "primary", primary.Name())
	if err := http.ListenAndServe(addr, server.Handler()); err != nil {
		log.Error("stopped", "error", err)
		os.Exit(1)
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}
