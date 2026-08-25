package main

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/viletech/vdp/hub/internal/adapters/diadoc"
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
	timeout := time.Duration(cfg.ExternalTimeout) * time.Millisecond
	plugins := registry.New()
	_ = plugins.Register(telegram.New(timeout, cfg.MaxRetries, log))
	_ = plugins.Register(onec.New(timeout, cfg.MaxRetries, log))
	_ = plugins.Register(diadoc.New(timeout, cfg.MaxRetries, log))
	_ = plugins.Register(ocr.New(timeout, cfg.MaxRetries, log))
	_ = plugins.Register(partner.New(timeout, cfg.MaxRetries, log))
	dispatch := dispatcher.New(inbox.NewStore(), plugins, log)
	server := httpapi.New(cfg, dispatch, plugins)
	addr := cfg.Host + ":" + cfg.Port
	log.Info("vdp-hub listening", "addr", addr)
	if err := http.ListenAndServe(addr, server.Handler()); err != nil {
		log.Error("server stopped", "error", err)
	}
}
