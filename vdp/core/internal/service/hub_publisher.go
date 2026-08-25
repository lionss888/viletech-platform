package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/pkg/logger"
)

type HubPublisher struct {
	store     outbox.Store
	hubURL    string
	secret    string
	client    *http.Client
	maxRetry  int
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
	if resp.StatusCode >= 300 {
		return fmt.Errorf("hub status %d", resp.StatusCode)
	}
	return nil
}
