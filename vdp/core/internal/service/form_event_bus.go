package service

import (
	"sync"
	"time"
)

// FormEvent is pushed to SSE subscribers on form status changes.
type FormEvent struct {
	Type          string         `json:"type"`
	FormPaymentID string         `json:"form_payment_id"`
	Payload       map[string]any `json:"payload"`
	At            time.Time      `json:"at"`
}

// FormEventBus fans out status_changed events to SSE clients (in-process).
type FormEventBus struct {
	mu   sync.RWMutex
	subs map[string]map[chan FormEvent]struct{}
}

func NewFormEventBus() *FormEventBus {
	return &FormEventBus{subs: map[string]map[chan FormEvent]struct{}{}}
}

func (b *FormEventBus) Subscribe(formID string) chan FormEvent {
	ch := make(chan FormEvent, 16)
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.subs[formID] == nil {
		b.subs[formID] = map[chan FormEvent]struct{}{}
	}
	b.subs[formID][ch] = struct{}{}
	return ch
}

func (b *FormEventBus) Unsubscribe(formID string, ch chan FormEvent) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if m := b.subs[formID]; m != nil {
		delete(m, ch)
		close(ch)
		if len(m) == 0 {
			delete(b.subs, formID)
		}
	}
}

func (b *FormEventBus) Publish(formID, typ string, payload map[string]any) {
	if b == nil {
		return
	}
	ev := FormEvent{Type: typ, FormPaymentID: formID, Payload: payload, At: time.Now().UTC()}
	b.mu.RLock()
	defer b.mu.RUnlock()
	for ch := range b.subs[formID] {
		select {
		case ch <- ev:
		default:
		}
	}
}
