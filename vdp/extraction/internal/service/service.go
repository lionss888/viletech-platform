package service

import (
	"context"
	"encoding/base64"
	"log/slog"
	"os"
	"sync"
	"time"

	"github.com/viletech/vdp/extraction/internal/engine"
	"github.com/viletech/vdp/extraction/internal/format"
	"github.com/viletech/vdp/extraction/internal/gold"
	"github.com/viletech/vdp/extraction/internal/textx"
	"github.com/viletech/vdp/shared/extraction"
)

// Config for extraction worker.
type Config struct {
	Primary  string
	Fallback string
	ShadowURL string
	GoldDir  string
	YandexAPIKey   string
	YandexFolderID string
	YandexModelURI string
	OwnModelPath   string
	Log      *slog.Logger
}

// Service runs recognize + gold flywheel.
type Service struct {
	cfg     Config
	primary engine.Primary
	fallback engine.Primary
	shadow  engine.Shadow
	gold    *gold.Store
	log     *slog.Logger
}

func New(cfg Config) *Service {
	log := cfg.Log
	if log == nil {
		log = slog.Default()
	}
	primary := pickPrimary(cfg)
	var fallback engine.Primary = engine.FixturePrimary{}
	if cfg.Fallback == "yandex" && cfg.YandexAPIKey != "" {
		fallback = engine.NewYandex(cfg.YandexAPIKey, cfg.YandexFolderID, cfg.YandexModelURI)
	}
	var shadow engine.Shadow = engine.StubShadow{}
	if cfg.ShadowURL != "" {
		shadow = engine.DoclingShadow{URL: cfg.ShadowURL}
	}
	goldDir := cfg.GoldDir
	if goldDir == "" {
		goldDir = os.TempDir() + "/vdp-extraction-gold"
	}
	return &Service{
		cfg:      cfg,
		primary:  primary,
		fallback: fallback,
		shadow:   shadow,
		gold:     gold.NewStore(goldDir),
		log:      log,
	}
}

func pickPrimary(cfg Config) engine.Primary {
	switch cfg.Primary {
	case "yandex":
		if cfg.YandexAPIKey == "" {
			return engine.FixturePrimary{}
		}
		return engine.NewYandex(cfg.YandexAPIKey, cfg.YandexFolderID, cfg.YandexModelURI)
	case "own":
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
	in.LayoutText = layout

	result, err := s.primary.Extract(ctx, in)
	mode := s.primary.Name()
	ml := mode == "yandex" || mode == "own"
	if err != nil && s.fallback != nil && s.fallback.Name() != s.primary.Name() {
		s.log.Warn("primary failed, fallback", "err", err, "primary", s.primary.Name())
		result, err = s.fallback.Extract(ctx, in)
		mode = s.fallback.Name() + "_fallback"
		ml = false
	}
	if err != nil {
		result = extraction.FixtureResult(in.FormPaymentID)
		mode = "fixture_error"
		ml = false
		result.Warnings = append(result.Warnings, "primary_error")
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
	shadowOut, err := s.shadow.Extract(ctx, in)
	if err != nil {
		shadowOut, _ = engine.StubShadow{}.Extract(ctx, in)
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
	}
	if err := s.gold.Append(rec); err != nil {
		s.log.Warn("gold append failed", "err", err)
	}
}

// ConfirmHuman upserts HITL gold.
func (s *Service) ConfirmHuman(formID, goldID string, human extraction.Result) error {
	return s.gold.UpsertHuman(formID, goldID, human)
}

// GoldStore exposes store for export CLI.
func (s *Service) GoldStore() *gold.Store { return s.gold }

var _ = sync.Once{}

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
