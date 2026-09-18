package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/viletech/tools/vedy_bot/internal/agent"
	"github.com/viletech/tools/vedy_bot/internal/card"
	"github.com/viletech/tools/vedy_bot/internal/config"
	"github.com/viletech/tools/vedy_bot/internal/console"
	"github.com/viletech/tools/vedy_bot/internal/knowledge"
	"github.com/viletech/tools/vedy_bot/internal/pipeline"
	"github.com/viletech/tools/vedy_bot/internal/stand"
	"github.com/viletech/tools/vedy_bot/internal/store"
	"github.com/viletech/tools/vedy_bot/internal/telegram"
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
	hitlMode := strings.ToLower(strings.TrimSpace(envOr("INTAKE_HITL_MODE", "hybrid")))
	tgCursor := envBool("INTAKE_TG_CURSOR")

	kbRoot := filepath.Join(cfg.Home, "knowledge")
	kbStore := knowledge.NewFSStore(kbRoot)
	embedder := &knowledge.CloudEmbedder{
		BaseURL: os.Getenv("INTAKE_EMBEDDING_URL"),
		APIKey:  os.Getenv("INTAKE_EMBEDDING_API_KEY"),
		Model:   os.Getenv("INTAKE_EMBEDDING_MODEL"),
	}
	kbSvc := &knowledge.Service{Embedder: embedder, Store: kbStore}
	retriever := &knowledge.CosineRetriever{Embedder: embedder, Store: kbStore, KeywordBoost: true}

	agentRunner := &agent.Runner{
		Store:              st,
		Workspace:          workspace,
		APIKey:             os.Getenv("CURSOR_API_KEY"),
		BridgeJS:           os.Getenv("INTAKE_AGENT_BRIDGE"),
		CloudDefault:       envOr("INTAKE_AGENT_CLOUD", "1"),
		LocalFallbackCloud: localFallbackCloud(),
		KnowledgePack: func(query string) (string, error) {
			pack, err := retriever.Search(context.Background(), query, 5)
			if err != nil {
				return "", err
			}
			return pack.Format(), nil
		},
	}

	p := &pipeline.Pipeline{
		Store:            st,
		Cards:            card.NewStore(cfg.Home),
		Messenger:        tg,
		Media:            tg,
		MediaOut:         tg,
		ChatIDs:          cfg.ChatIDs,
		OperatorChatIDs:  cfg.OperatorChatIDs,
		BotUser:          cfg.BotUsername,
		Log:              log,
		WithAnalyze:      withAnalyze,
		WithHITL:         withHITL,
		Workspace:        workspace,
		ReminderInterval: cfg.ReminderInterval,
		MaxReminders:     cfg.MaxReminders,
		MaxMediaBytes:    cfg.MaxMediaBytes,
		HITLMode:         hitlMode,
		TGCursor:         tgCursor,
		BuildKnowledgePack: func(query string) (string, error) {
			pack, err := retriever.Search(context.Background(), query, 5)
			if err != nil {
				return "", err
			}
			return pack.Format(), nil
		},
		StartAgent: func(mode, prompt string, useKnowledge bool) (string, error) {
			job, err := agentRunner.StartRawPrompt(mode, prompt, useKnowledge)
			if err != nil {
				return "", err
			}
			return job.ID, nil
		},
		WaitAgentJob: func(jobID string) (string, error) {
			deadline := time.Now().Add(10 * time.Minute)
			for time.Now().Before(deadline) {
				job, err := agentRunner.GetJob(jobID)
				if err != nil {
					return "", err
				}
				switch job.Status {
				case "done":
					return job.Result, nil
				case "error":
					return "", fmt.Errorf("%s", job.Error)
				}
				time.Sleep(500 * time.Millisecond)
			}
			return "", fmt.Errorf("agent job timeout")
		},
	}

	vdpRoot := strings.TrimSpace(os.Getenv("INTAKE_VDP_ROOT"))
	if vdpRoot == "" {
		vdpRoot = filepath.Join(detectWorkspace(), "vdp")
	}
	standRunner := &stand.Runner{VDPRoot: vdpRoot, Home: cfg.Home, DryRun: envBool("INTAKE_STAND_DRY_RUN")}
	p.Stand = &stand.PipelineAdapter{Runner: standRunner}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	var cons *console.Server
	if cfg.ConsoleEnabled {
		if cfg.ConsoleToken == "" {
			log.Warn("console enabled but INTAKE_CONSOLE_TOKEN empty; console not started")
		} else {
			cons = &console.Server{
				Addr:        cfg.ConsoleAddr,
				Token:       cfg.ConsoleToken,
				Pipeline:    p,
				Store:       st,
				Cards:       p.Cards,
				Agent:       agentRunner,
				Knowledge:   kbSvc,
				Retriever:   retriever,
				Stand:       standRunner,
				Workspace:   workspace,
				Log:         log,
				UI:          console.UI,
				StaticDir:   strings.TrimSpace(os.Getenv("INTAKE_CONSOLE_STATIC")),
				SPAUpstream: strings.TrimSpace(os.Getenv("INTAKE_CONSOLE_SPA_UPSTREAM")),
				MaxUpload:   cfg.MaxMediaBytes,
			}
			if err := cons.Start(); err != nil {
				log.Error("console start", "err", err)
				os.Exit(1)
			}
			log.Info("console listening",
				"addr", cfg.ConsoleAddr,
				"hitl_mode", hitlMode,
				"tg_cursor", tgCursor,
				"agent_configured", agentRunner.Configured(),
				"agent_bridge", agentRunner.BridgeReady(),
				"knowledge", kbRoot,
			)
			defer func() {
				shCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
				defer cancel()
				_ = cons.Shutdown(shCtx)
			}()
		}
	}

	offset, err := st.LoadOffset()
	if err != nil {
		log.Error("offset", "err", err)
		os.Exit(1)
	}
	log.Info("vedy_bot start",
		"home", cfg.Home,
		"workspace", workspace,
		"hitl", withHITL,
		"hitl_mode", hitlMode,
		"tg_cursor", tgCursor,
	)

	ticker := time.NewTicker(cfg.ReminderInterval)
	defer ticker.Stop()
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := p.ProcessReminders(ctx); err != nil {
					log.Warn("reminders", "err", err)
				}
			}
		}
	}()

	for {
		if ctx.Err() != nil {
			return
		}
		updates, err := tg.GetUpdates(ctx, offset, cfg.PollTimeoutSec)
		if err != nil {
			log.Warn("getUpdates", "err", err)
			time.Sleep(2 * time.Second)
			continue
		}
		next, err := p.ProcessBatch(ctx, updates)
		if err != nil {
			log.Warn("batch", "err", err)
		}
		if next > offset {
			offset = next
			_ = st.SaveOffset(offset)
		}
		if *once {
			return
		}
	}
}

func detectWorkspace() string {
	if wd, err := os.Getwd(); err == nil {
		for dir := wd; dir != "/" && dir != "."; dir = filepath.Dir(dir) {
			if _, err := os.Stat(filepath.Join(dir, "vdp")); err == nil {
				return dir
			}
			if filepath.Base(dir) == "vedy_bot" {
				return filepath.Clean(filepath.Join(dir, "..", ".."))
			}
		}
		return wd
	}
	return "."
}

func envBool(k string) bool {
	v := strings.TrimSpace(os.Getenv(k))
	return v == "1" || strings.EqualFold(v, "true") || strings.EqualFold(v, "yes") || strings.EqualFold(v, "on")
}

func envOr(k, def string) string {
	if v := strings.TrimSpace(os.Getenv(k)); v != "" {
		return v
	}
	return def
}

func localFallbackCloud() bool {
	v := strings.TrimSpace(os.Getenv("INTAKE_AGENT_LOCAL_FALLBACK_CLOUD"))
	if v == "" {
		return true
	}
	return v == "1" || strings.EqualFold(v, "true") || strings.EqualFold(v, "on")
}
