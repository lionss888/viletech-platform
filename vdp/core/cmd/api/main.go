package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/postgres"
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
	ctx := context.Background()
	if os.Getenv("STORE_DRIVER") == "" {
		_ = os.Setenv("STORE_DRIVER", cfg.StoreDriver)
	}
	store, box, err := openStores(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Error("store init failed", "error", err)
		os.Exit(1)
	}
	seed.Dev(store)
	forms := service.NewFormPaymentService(store, box, newID)
	orgs := service.NewOrganizationService(store)
	catalog := service.NewCatalogService(store, box, newID)
	auth := service.NewAuthService(store, cfg.JWTSecret, cfg.JWTExpirationHours)
	publisher := service.NewHubPublisher(box, cfg.HubURL, cfg.HubSharedSecret, time.Duration(cfg.GatewayTimeoutSec)*time.Second)
	go pollOutbox(ctx, publisher, log)
	server := httpapi.NewServer(cfg, auth, forms, orgs, catalog, publisher)
	addr := cfg.Host + ":" + cfg.Port
	log.Info("vdp-core listening", "addr", addr, "store_driver", storeDriver())
	if err := http.ListenAndServe(addr, server.Handler()); err != nil {
		log.Error("server stopped", "error", err)
	}
}

func openStores(ctx context.Context, databaseURL string) (repository.Store, outbox.Store, error) {
	driver := storeDriver()
	if driver == "memory" || databaseURL == "" || strings.HasPrefix(databaseURL, "memory://") {
		return repository.NewMemoryStore(), outbox.NewMemoryStore(), nil
	}
	db, err := postgres.OpenDB(ctx, databaseURL)
	if err != nil {
		return nil, nil, err
	}
	return postgres.NewStore(db), outbox.NewPostgresStore(db), nil
}

func storeDriver() string {
	driver := strings.ToLower(os.Getenv("STORE_DRIVER"))
	if driver == "" {
		return "postgres"
	}
	return driver
}

func pollOutbox(ctx context.Context, publisher *service.HubPublisher, log *slog.Logger) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := publisher.Flush(ctx); err != nil {
				log.Warn("outbox flush", "error", err)
			}
		}
	}
}

func newID() string {
	buf := make([]byte, 16)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}
