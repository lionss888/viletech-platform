package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/viletech/vdp/manager-ops/internal/adapters/corehttp"
	"github.com/viletech/vdp/manager-ops/internal/adapters/telegram"
	"github.com/viletech/vdp/manager-ops/internal/behavior"
	"github.com/viletech/vdp/manager-ops/internal/config"
	"github.com/viletech/vdp/manager-ops/internal/ports"
	"github.com/viletech/vdp/manager-ops/internal/roster"
	"github.com/viletech/vdp/manager-ops/internal/store/memory"
	httpapi "github.com/viletech/vdp/manager-ops/internal/transport/http"
)

func main() {
	log := slog.Default()
	cfg := config.FromEnv()
	store := memory.New()
	tg := telegram.New(cfg.TelegramToken, log)
	var coreAPI ports.CoreAPI
	if cfg.CoreURL != "" {
		coreAPI = corehttp.New(cfg.CoreURL, cfg.HubSharedSecret, cfg.HTTPTimeout)
	}
	rosterSvc := roster.New(store, coreAPI, tg, nil, cfg.AllowlistChats)
	behaviorSvc := behavior.New(store, tg, nil)
	srv := &httpapi.Server{Roster: rosterSvc, Behavior: behaviorSvc}
	addr := cfg.Addr
	if addr != "" && addr[0] != ':' {
		addr = ":" + addr
	}
	log.Info("manager-ops listening", "addr", addr, "core_url", cfg.CoreURL != "", "telegram", cfg.TelegramToken != "")
	if err := http.ListenAndServe(addr, srv.Handler()); err != nil {
		log.Error("listen failed", "err", err)
		os.Exit(1)
	}
}
