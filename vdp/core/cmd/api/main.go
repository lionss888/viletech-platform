package main

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"time"

	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
	httpapi "github.com/viletech/vdp/core/internal/transport/http"
	"github.com/viletech/vdp/core/pkg/config"
	"github.com/viletech/vdp/core/pkg/logger"
)

func main() {
	cfg := config.Load()
	log := logger.New(cfg.LogLevel)
	slog.SetDefault(log)
	store := repository.NewStore()
	seed.Dev(store)
	box := outbox.NewMemoryStore()
	forms := service.NewFormPaymentService(store, box, newID)
	orgs := service.NewOrganizationService(store)
	auth := service.NewAuthService(store, cfg.JWTSecret, cfg.JWTExpirationHours)
	publisher := service.NewHubPublisher(box, cfg.HubURL, cfg.HubSharedSecret, time.Duration(cfg.GatewayTimeoutSec)*time.Second)
	server := httpapi.NewServer(cfg, auth, forms, orgs, publisher)
	addr := cfg.Host + ":" + cfg.Port
	log.Info("vdp-core listening", "addr", addr)
	if err := http.ListenAndServe(addr, server.Handler()); err != nil {
		log.Error("server stopped", "error", err)
	}
}

func newID() string {
	buf := make([]byte, 16)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}
