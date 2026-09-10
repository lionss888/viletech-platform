package main

import (
	"context"
	"flag"
	"log/slog"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/viletech/tools/intake/internal/card"
	"github.com/viletech/tools/intake/internal/config"
	"github.com/viletech/tools/intake/internal/console"
	"github.com/viletech/tools/intake/internal/pipeline"
	"github.com/viletech/tools/intake/internal/store"
	"github.com/viletech/tools/intake/internal/telegram"
)

func main() {
	once := flag.Bool("once", false, "poll one batch and exit")
	analyze := flag.Bool("analyze", false, "reply with rule-based analysis (wave B)")
	hitl := flag.Bool("hitl", false, "manager-safe proposal + plan draft + HITL (waves C–E)")
	flag.Parse()
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	cfg, err := config.Load()
	if err != nil {
		log.Error("config", "err", err)
		os.Exit(1)
	}
	workspace := cfg.Workspace
	if workspace == "" {
		workspace = detectWorkspace()
	}
	st := store.New(cfg.Home)
	tg := telegram.New(cfg.Token, cfg.HTTPTimeout)
	withHITL := *hitl || envBool("INTAKE_HITL")
	withAnalyze := *analyze || envBool("INTAKE_ANALYZE") || withHITL
	p := &pipeline.Pipeline{
		Store:            st,
		Cards:            card.NewStore(cfg.Home),
		Messenger:        tg,
		Media:            tg,
		MediaOut:         tg,
		ChatIDs:          cfg.ChatIDs,
		BotUser:          cfg.BotUsername,
		Log:              log,
		WithAnalyze:      withAnalyze,
		WithHITL:         withHITL,
		Workspace:        workspace,
		ReminderInterval: cfg.ReminderInterval,
		MaxReminders:     cfg.MaxReminders,
		MaxMediaBytes:    cfg.MaxMediaBytes,
	}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	var cons *console.Server
	if cfg.ConsoleEnabled {
		if cfg.ConsoleToken == "" {
			log.Warn("console enabled but INTAKE_CONSOLE_TOKEN empty; console not started")
		} else {
			cons = &console.Server{
				Addr:      cfg.ConsoleAddr,
				Token:     cfg.ConsoleToken,
				Pipeline:  p,
				Store:     st,
				Cards:     p.Cards,
				Workspace: workspace,
				Log:       log,
				UI:        console.UI,
				MaxUpload: cfg.MaxMediaBytes,
			}
			if err := cons.Start(); err != nil {
				log.Error("console start", "err", err)
				os.Exit(1)
			}
			log.Info("console listening", "addr", cfg.ConsoleAddr)
			defer func() {
				shCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
				defer cancel()
				_ = cons.Shutdown(shCtx)
			}()
		}
	}

	offset, err := st.LoadOffset()
	if err != nil {
		log.Error("load offset", "err", err)
		os.Exit(1)
	}
	log.Info("intake start",
		"home", cfg.Home,
		"once", *once,
		"analyze", p.WithAnalyze,
		"hitl", p.WithHITL,
		"workspace_set", workspace != "",
		"offset", offset,
	)
	for {
		if ctx.Err() != nil {
			return
		}
		if err := p.ProcessReminders(ctx); err != nil {
			log.Warn("reminders", "err", err)
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

func detectWorkspace() string {
	wd, err := os.Getwd()
	if err != nil {
		return ""
	}
	dir := wd
	for i := 0; i < 8; i++ {
		if lookPlans(dir) {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return ""
}

func lookPlans(dir string) bool {
	_, err := os.Stat(filepath.Join(dir, ".cursor", "plans"))
	return err == nil
}
