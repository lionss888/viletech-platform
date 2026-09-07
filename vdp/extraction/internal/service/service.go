package service

import (
	"context"
	"encoding/base64"
	"log/slog"
	"os"
	"strconv"
	"time"

	"github.com/viletech/vdp/extraction/internal/engine"
	"github.com/viletech/vdp/extraction/internal/format"
	"github.com/viletech/vdp/extraction/internal/gold"
	"github.com/viletech/vdp/extraction/internal/metrics"
	"github.com/viletech/vdp/extraction/internal/textx"
	"github.com/viletech/vdp/shared/extraction"
)

// Config for extraction worker.
type Config struct {
	Primary          string
	Fallback         string
	ShadowURL        string
	GoldDir          string
	YandexAPIKey     string
	YandexFolderID   string
	YandexModelURI   string
	OwnModelPath     string
	OllamaBaseURL    string
	OllamaModel      string
	OwnFewShotK      int
	Log              *slog.Logger
}

// Service runs recognize + gold flywheel.
type Service struct {
	cfg      Config
	primary  engine.Primary
	fallback engine.Primary
	shadow   engine.Shadow
	gold     *gold.Store
	log      *slog.Logger
}

func New(cfg Config) *Service {
	log := cfg.Log
	if log == nil {
		log = slog.Default()
	}
	goldDir := cfg.GoldDir
	if goldDir == "" {
		goldDir = os.TempDir() + "/vdp-extraction-gold"
	}
	store := gold.NewStore(goldDir)
	primary := pickPrimary(cfg, store, log)
	var fallback engine.Primary = engine.FixturePrimary{}
	switch cfg.Fallback {
	case "yandex":
		if cfg.YandexAPIKey != "" && cfg.YandexFolderID != "" {
			fallback = engine.NewYandex(cfg.YandexAPIKey, cfg.YandexFolderID, cfg.YandexModelURI)
		}
	case "fixture":
		fallback = engine.FixturePrimary{}
	}
	var shadow engine.Shadow = engine.StubShadow{}
	if cfg.ShadowURL != "" {
		shadow = engine.DoclingShadow{URL: cfg.ShadowURL}
	}
	return &Service{
		cfg:      cfg,
		primary:  primary,
		fallback: fallback,
		shadow:   shadow,
		gold:     store,
		log:      log,
	}
}

func pickPrimary(cfg Config, store *gold.Store, log *slog.Logger) engine.Primary {
	switch cfg.Primary {
	case "yandex":
		if cfg.YandexAPIKey == "" || cfg.YandexFolderID == "" {
			return engine.FixturePrimary{}
		}
		return engine.NewYandex(cfg.YandexAPIKey, cfg.YandexFolderID, cfg.YandexModelURI)
	case "own":
		if cfg.OllamaBaseURL != "" {
			model := engine.OllamaModelFromArtifact(cfg.OwnModelPath, cfg.OllamaModel)
			if model == "" {
				model = "qwen2.5:3b"
			}
			k := cfg.OwnFewShotK
			if k == 0 {
				k = 3
			}
			return engine.NewOllama(cfg.OllamaBaseURL, model, k, store)
		}
		log.Warn("EXTRACTION_PRIMARY=own without OLLAMA_BASE_URL; using stub/artifact")
		if cfg.OwnModelPath != "" {
			return engine.OwnFromArtifact{Path: cfg.OwnModelPath}
		}
		return engine.OwnStub{}
	default:
		return engine.FixturePrimary{}
	}
}

// RecognizeRequest is hub OCR_URL body.
type RecognizeRequest struct {
	EventID       string         `json:"event_id"`
	FormPaymentID string         `json:"form_payment_id"`
	Operation     string         `json:"operation"`
	Payload       map[string]any `json:"payload"`
}

// RecognizeResponse matches hub expectations.
type RecognizeResponse struct {
	Status string         `json:"status"`
	Mode   string         `json:"mode"`
	ML     bool           `json:"ml"`
	Fields map[string]any `json:"fields"`
}

// Recognize runs PRIMARY and schedules shadow+gold.
func (s *Service) Recognize(ctx context.Context, req RecognizeRequest) (RecognizeResponse, error) {
	in := buildInput(req)
	kind := format.Detect(in.FileName, in.Mime, in.Content)
	in.Kind = string(kind)
	layout, _ := textx.ExtractLayout(kind, in.Content, in.FileName)
	if in.LayoutText == "" {
		in.LayoutText = layout
	}

	result, err := s.primary.Extract(ctx, in)
	mode := s.primary.Name()
	ml := mode == "yandex" || mode == "own"
	if err != nil && s.fallback != nil && s.fallback.Name() != s.primary.Name() {
		s.log.Warn("primary failed, fallback", "err", err, "primary", s.primary.Name())
		metrics.Default.PrimaryFail.Add(1)
		result, err = s.fallback.Extract(ctx, in)
		mode = s.fallback.Name() + "_fallback"
		ml = false
	}
	if err != nil {
		metrics.Default.PrimaryFail.Add(1)
		result = extraction.FixtureResult(in.FormPaymentID)
		mode = "fixture_error"
		ml = false
		result.Warnings = append(result.Warnings, "primary_error")
	} else {
		metrics.Default.PrimarySuccess.Add(1)
	}
	result.Meta.FormPaymentID = in.FormPaymentID
	result.Meta.EventID = in.EventID
	result.Meta.ContentHash = extraction.ContentHash(result)

	go s.runShadowGold(in, result)

	return RecognizeResponse{
		Status: "recognized",
		Mode:   mode,
		ML:     ml,
		Fields: extraction.HubFields(result),
	}, nil
}

func (s *Service) runShadowGold(in engine.Input, primary extraction.Result) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	started := time.Now()
	shadowOut, err := s.shadow.Extract(ctx, in)
	metrics.Default.ShadowLatencyMs.Store(time.Since(started).Milliseconds())
	if err != nil {
		metrics.Default.ShadowFail.Add(1)
		shadowOut, _ = engine.StubShadow{}.Extract(ctx, in)
	} else {
		metrics.Default.ShadowOK.Add(1)
	}
	rec := extraction.GoldRecord{
		GoldID:         extraction.NewGoldID(in.FormPaymentID, in.EventID),
		FormPaymentID:  in.FormPaymentID,
		OrganizationID: in.OrganizationID,
		SourceFileID:   in.FileName,
		ContentHash:    primary.Meta.ContentHash,
		SchemaVersion:  extraction.SchemaVersion,
		EventID:        in.EventID,
		PrimaryEngine:  primary.Meta.EngineID,
		ShadowEngine:   shadowOut.Meta.EngineID,
		PrimaryOut:     primary,
		ShadowOut:      shadowOut,
		LayoutText:     truncateLayout(in.LayoutText, 20000),
	}
	if err := s.gold.Append(rec); err != nil {
		s.log.Warn("gold append failed", "err", err)
	}
}

func truncateLayout(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

// ConfirmHuman upserts HITL gold.
func (s *Service) ConfirmHuman(formID, goldID string, human extraction.Result) error {
	if err := s.gold.UpsertHuman(formID, goldID, human); err != nil {
		return err
	}
	metrics.Default.GoldHumanUpsert.Add(1)
	if recs, err := s.gold.List(); err == nil {
		for i := len(recs) - 1; i >= 0; i-- {
			r := recs[i]
			if r.FormPaymentID != formID {
				continue
			}
			if r.PrimaryOut.Meta.ContentHash != "" && human.Meta.ContentHash != "" &&
				r.PrimaryOut.Meta.ContentHash != human.Meta.ContentHash {
				metrics.Default.PrimaryVsHuman.Add(1)
			}
			break
		}
	}
	return nil
}

// GoldStore exposes store for export CLI.
func (s *Service) GoldStore() *gold.Store { return s.gold }

func buildInput(req RecognizeRequest) engine.Input {
	in := engine.Input{
		FormPaymentID: req.FormPaymentID,
		EventID:       req.EventID,
	}
	p := req.Payload
	if p == nil {
		return in
	}
	if v, ok := p["file_name"].(string); ok {
		in.FileName = v
	}
	if v, ok := p["mime"].(string); ok {
		in.Mime = v
	}
	if v, ok := p["organization_id"].(string); ok {
		in.OrganizationID = v
	}
	if v, ok := p["content_base64"].(string); ok {
		in.ContentB64 = v
		if raw, err := base64.StdEncoding.DecodeString(v); err == nil {
			in.Content = raw
		}
	}
	if v, ok := p["text"].(string); ok && len(in.Content) == 0 {
		in.Content = []byte(v)
		in.LayoutText = v
	}
	return in
}

// ParseFewShotK parses OWN_FEW_SHOT_K env.
func ParseFewShotK(raw string) int {
	if raw == "" {
		return 3
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < 0 {
		return 3
	}
	if n > 8 {
		return 8
	}
	return n
}
