package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/viletech/vdp/hub/internal/adapters/diadoc"
	"github.com/viletech/vdp/hub/internal/adapters/docs"
	"github.com/viletech/vdp/hub/internal/adapters/mail"
	"github.com/viletech/vdp/hub/internal/adapters/ocr"
	"github.com/viletech/vdp/hub/internal/adapters/onec"
	"github.com/viletech/vdp/hub/internal/adapters/partner"
	"github.com/viletech/vdp/hub/internal/adapters/telegram"
	"github.com/viletech/vdp/hub/internal/dispatcher"
	"github.com/viletech/vdp/hub/internal/inbox"
	"github.com/viletech/vdp/hub/internal/registry"
	httpapi "github.com/viletech/vdp/hub/internal/transport/http"
	"github.com/viletech/vdp/hub/pkg/config"
	"github.com/viletech/vdp/hub/pkg/logger"
)

func main() {
	cfg := config.Load()
	log := logger.New(cfg.LogLevel)
	slog.SetDefault(log)
	ctx := context.Background()
	if os.Getenv("STORE_DRIVER") == "" {
		_ = os.Setenv("STORE_DRIVER", cfg.StoreDriver)
	}
	inboxStore, err := inbox.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Error("inbox store init failed", "error", err)
		os.Exit(1)
	}
	timeout := time.Duration(cfg.ExternalTimeout) * time.Millisecond
	plugins := registry.New()
	_ = plugins.Register(telegram.New(timeout, cfg.MaxRetries, log))
	_ = plugins.Register(onec.New(timeout, cfg.MaxRetries, log).WithCore(cfg.CoreURL, cfg.SharedSecret))
	_ = plugins.Register(diadoc.New(timeout, cfg.MaxRetries, log).WithCore(cfg.CoreURL, cfg.SharedSecret))
	_ = plugins.Register(ocr.New(timeout, cfg.MaxRetries, log).WithCore(cfg.CoreURL, cfg.SharedSecret))
	_ = plugins.Register(partner.New(timeout, cfg.MaxRetries, log))
	_ = plugins.Register(docs.New(timeout, cfg.MaxRetries, log))
	_ = plugins.Register(mail.New(timeout, cfg.MaxRetries, log))
	dispatch := dispatcher.New(inboxStore, plugins, log)
	server := httpapi.New(cfg, dispatch, plugins)
	addr := cfg.Host + ":" + cfg.Port
	log.Info("vdp-hub listening", "addr", addr)
	if err := http.ListenAndServe(addr, server.Handler()); err != nil {
		log.Error("server stopped", "error", err)
	}
}
