package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/pkg/logger"
	"github.com/viletech/vdp/shared/events"
)

type DocsResultHandler interface {
	ApplyDocsGenerateResult(ctx context.Context, formID string, result map[string]any) error
}

type HubPublisher struct {
	store    outbox.Store
	hubURL   string
	secret   string
	client   *http.Client
	maxRetry int
	docsHook DocsResultHandler
}

func NewHubPublisher(store outbox.Store, hubURL, secret string, timeout time.Duration) *HubPublisher {
	return &HubPublisher{
		store:    store,
		hubURL:   hubURL,
		secret:   secret,
		client:   &http.Client{Timeout: timeout},
		maxRetry: 3,
	}
}

func (p *HubPublisher) WithDocsHandler(h DocsResultHandler) *HubPublisher {
	p.docsHook = h
	return p
}

func (p *HubPublisher) Flush(ctx context.Context) error {
	pending, err := p.store.Pending(ctx, 50)
	if err != nil {
		return err
	}
	for _, event := range pending {
		if err := p.publishOnce(ctx, event); err != nil {
			_ = p.store.MarkFailed(ctx, event.ID, err)
			logger.FromContext(logger.WithFormPaymentID(ctx, event.FormPaymentID), nil).
				Warn("hub publish failed", "event_id", event.ID, "error", err.Error())
			continue
		}
		_ = p.store.MarkPublished(ctx, event.ID)
	}
	return nil
}

func (p *HubPublisher) publishOnce(ctx context.Context, event outbox.Event) error {
	if event.EventType == events.TypeBankWebhook {
		return p.deliverBankWebhook(ctx, event)
	}
	body, err := json.Marshal(outbox.ToEnvelope(event))
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.hubURL+"/api/v1/inbox", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-VDP-S2S", p.secret)
	resp, err := p.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return fmt.Errorf("hub status %d", resp.StatusCode)
	}
	if event.EventType == events.TypeDocsGenerate && p.docsHook != nil {
		var result map[string]any
		_ = json.Unmarshal(raw, &result)
		if err := p.docsHook.ApplyDocsGenerateResult(ctx, event.FormPaymentID, result); err != nil {
			return fmt.Errorf("docs attach: %w", err)
		}
	}
	return nil
}

func (p *HubPublisher) deliverBankWebhook(ctx context.Context, event outbox.Event) error {
	url, _ := event.Payload["url"].(string)
	if url == "" {
		return fmt.Errorf("bank webhook url missing")
	}
	var body []byte
	switch v := event.Payload["body"].(type) {
	case json.RawMessage:
		body = []byte(v)
	case []byte:
		body = v
	case string:
		body = []byte(v)
	case map[string]any:
		body, _ = json.Marshal(v)
	default:
		body, _ = json.Marshal(event.Payload)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if sig, _ := event.Payload["signature"].(string); sig != "" {
		req.Header.Set("X-VDP-Bank-Signature", sig)
	}
	resp, err := p.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	_, _ = io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return fmt.Errorf("bank webhook status %d", resp.StatusCode)
	}
	return nil
}

