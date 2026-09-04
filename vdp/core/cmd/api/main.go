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
	if err := cfg.ValidateProduction(); err != nil {
		log.Error("invalid production config", "error", err)
		os.Exit(1)
	}
	ctx := context.Background()
	if os.Getenv("STORE_DRIVER") == "" {
		_ = os.Setenv("STORE_DRIVER", cfg.StoreDriver)
	}
	store, box, err := openStores(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Error("store init failed", "error", err)
		os.Exit(1)
	}
	if err := seed.Dev(store); err != nil {
		log.Error("dev seed failed", "error", err)
		os.Exit(1)
	}
	forms := service.NewFormPaymentService(store, box, newID)
	orgs := service.NewOrganizationService(store).WithOutbox(box)
	catalog := service.NewCatalogService(store, box, newID)
	auth := service.NewAuthService(store, cfg.JWTSecret, cfg.JWTExpirationHours)
	accounts := service.NewAccountService(store)
	notify := service.NewNotificationService(store)
	publisher := service.NewHubPublisher(box, cfg.HubURL, cfg.HubSharedSecret, time.Duration(cfg.GatewayTimeoutSec)*time.Second).
		WithDocsHandler(service.NewDocsAttachAdapter(forms))
	go pollOutbox(ctx, publisher, log)
	server := httpapi.NewServer(cfg, auth, accounts, forms, orgs, catalog, publisher, notify)
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
	h := hex.EncodeToString(buf)
	// Dashed UUID so create JSON matches postgres uuid text from list/get.
	return h[0:8] + "-" + h[8:12] + "-" + h[12:16] + "-" + h[16:20] + "-" + h[20:32]
}
