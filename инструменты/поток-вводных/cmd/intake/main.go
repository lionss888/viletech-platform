package main

import (
	"context"
	"flag"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/viletech/tools/intake/internal/config"
	"github.com/viletech/tools/intake/internal/pipeline"
	"github.com/viletech/tools/intake/internal/store"
	"github.com/viletech/tools/intake/internal/telegram"
)

func main() {
	once := flag.Bool("once", false, "poll one batch and exit")
	analyze := flag.Bool("analyze", false, "reply with rule-based analysis (wave B)")
	flag.Parse()
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	cfg, err := config.Load()
	if err != nil {
		log.Error("config", "err", err)
		os.Exit(1)
	}
	st := store.New(cfg.Home)
	tg := telegram.New(cfg.Token, cfg.HTTPTimeout)
	p := &pipeline.Pipeline{
		Store:       st,
		Messenger:   tg,
		ChatIDs:     cfg.ChatIDs,
		BotUser:     cfg.BotUsername,
		Log:         log,
		WithAnalyze: *analyze || envBool("INTAKE_ANALYZE"),
	}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	offset, err := st.LoadOffset()
	if err != nil {
		log.Error("load offset", "err", err)
		os.Exit(1)
	}
	log.Info("intake start", "home", cfg.Home, "once", *once, "analyze", p.WithAnalyze, "offset", offset)
	for {
		if ctx.Err() != nil {
			return
		}
		updates, err := tg.GetUpdates(ctx, offset, cfg.PollTimeoutSec)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			log.Warn("getUpdates", "err", err)
			time.Sleep(2 * time.Second)
			continue
		}
		next, err := p.ProcessBatch(ctx, updates)
		if err != nil {
			log.Error("process", "err", err)
		}
		if next > offset {
			offset = next
			_ = st.SaveOffset(offset)
		}
		if *once {
			log.Info("once done", "updates", len(updates), "offset", offset)
			return
		}
	}
}

func envBool(k string) bool {
	v := os.Getenv(k)
	return v == "1" || v == "true" || v == "yes"
}
