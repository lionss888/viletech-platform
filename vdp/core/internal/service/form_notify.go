package service

import (
	"context"
	"strings"

	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/shared/events"
	"github.com/viletech/vdp/shared/notify"
)

func (s *FormPaymentService) enqueueTelegram(ctx context.Context, form formpayment.Form, payload map[string]any) error {
	clean := cloneNotifyPayload(payload)
	if acc, err := s.store.AccountByID(ctx, form.AccountID); err == nil && acc.TelegramChatID != "" && acc.TelegramNotifyEnabled {
		clean["chat_id"] = acc.TelegramChatID
	}
	if err := s.enqueue(ctx, form, events.TypeTelegramNotify, clean); err != nil {
		return err
	}
	chats, err := s.store.ListWorkChats(ctx)
	if err != nil {
		return nil
	}
	for _, chat := range chats {
		if !chat.Active || chat.ChatID == "" {
			continue
		}
		group := cloneNotifyPayload(clean)
		group["chat_id"] = chat.ChatID
		group["work_chat_id"] = chat.ID
		if err := s.enqueue(ctx, form, events.TypeTelegramNotify, group); err != nil {
			return err
		}
	}
	return nil
}

func (s *FormPaymentService) enqueueSMSIfNeeded(ctx context.Context, form formpayment.Form, action formpayment.Action) error {
	event := smsEventFor(form.Status, action)
	if event == "" || !notify.AllowsChannel(event, notify.ChannelSMS) {
		return nil
	}
	acc, err := s.store.AccountByID(ctx, form.AccountID)
	if err != nil || !acc.SMSNotifyEnabled || acc.Phone == "" {
		return nil
	}
	entry, _ := notify.Lookup(event)
	return s.enqueue(ctx, form, events.TypeSMSNotify, map[string]any{
		"template": entry.Template,
		"to":       acc.Phone,
		"event":    event,
	})
}

func smsEventFor(st formpayment.Status, action formpayment.Action) string {
	switch st {
	case formpayment.StatusFormWaitingCorrections:
		return "form_waiting_corrections"
	case formpayment.StatusCanceledByComplianceOfficer:
		return "canceled_by_compliance"
	default:
		_ = action
		return ""
	}
}

func cloneNotifyPayload(in map[string]any) map[string]any {
	out := map[string]any{}
	for k, v := range in {
		lower := strings.ToLower(k)
		if lower == "passport" || lower == "full_name" || lower == "inn" || lower == "phone" || lower == "email" {
			continue
		}
		out[k] = v
	}
	return out
}
