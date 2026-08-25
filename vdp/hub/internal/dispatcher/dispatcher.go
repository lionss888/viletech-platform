package dispatcher

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/viletech/vdp/hub/internal/inbox"
	"github.com/viletech/vdp/hub/internal/registry"
	"github.com/viletech/vdp/shared/events"
)

type Dispatcher struct {
	inbox    *inbox.Store
	registry *registry.Registry
	log      *slog.Logger
}

func New(store *inbox.Store, plugins *registry.Registry, log *slog.Logger) *Dispatcher {
	return &Dispatcher{inbox: store, registry: plugins, log: log}
}

func (d *Dispatcher) Handle(ctx context.Context, env events.Envelope) (map[string]any, error) {
	if rec, ok := d.inbox.AlreadyProcessed(ctx, env.EventID); ok {
		return rec.Result, nil
	}
	pluginName, action := route(env.EventType)
	plugin, err := d.registry.Get(pluginName)
	if err != nil {
		return nil, err
	}
	params := map[string]any{
		"event_id":        env.EventID,
		"form_payment_id": env.FormPaymentID,
		"payload":         env.Payload,
	}
	d.log.Info("dispatch", "plugin", pluginName, "action", action, "form_payment_id", env.FormPaymentID, "event_id", env.EventID)
	result, err := plugin.Execute(ctx, action, params)
	if err != nil {
		return nil, fmt.Errorf("plugin %s: %w", pluginName, err)
	}
	d.inbox.MarkProcessed(ctx, env, result)
	return result, nil
}

func route(eventType string) (string, string) {
	switch eventType {
	case events.TypeTelegramNotify, events.TypeFormPaymentStatusChanged:
		return "telegram", "notify"
	case events.TypeOCRRequested:
		return "ocr", "recognize"
	case events.TypeDiadocSignRequested:
		return "diadoc", "sign"
	case events.TypeOneCPaymentRequested:
		return "1c", "cover"
	case events.TypePartnerDispatch:
		return "partner", "dispatch"
	default:
		return "telegram", "notify"
	}
}
