package pipeline

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/viletech/tools/intake/internal/card"
	"github.com/viletech/tools/intake/internal/store"
	"github.com/viletech/tools/intake/internal/telegram"
)

func TestHITLProposalWritesPlanWithoutTechInChat(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	ws := t.TempDir()
	fm := &fakeMsg{}
	p := &Pipeline{
		Store:       store.New(home),
		Cards:       card.NewStore(home),
		Messenger:   fm,
		ChatIDs:     map[int64]struct{}{-1004449173165: {}},
		BotUser:     "vdp_intake_bot",
		WithAnalyze: true,
		WithHITL:    true,
		Workspace:   ws,
	}
	u := telegram.Update{
		UpdateID: 20,
		Message: &telegram.Message{
			MessageID: 40,
			Text:      "@vdp_intake_bot #доработка нужно добавить понятный статус ожидания для менеджера в кабинете при долгом ответе банка",
			Chat:      telegram.Chat{ID: -1004449173165},
			From:      &telegram.User{ID: 1, Username: "darya"},
			Entities:  []telegram.Entity{{Type: "mention", Offset: 0, Length: 15}},
		},
	}
	ok, err := p.HandleUpdate(context.Background(), u)
	if err != nil || !ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}
	if len(fm.texts) != 1 {
		t.Fatalf("texts=%v", fm.texts)
	}
	reply := fm.texts[0]
	if !strings.Contains(reply, "Предложение") || !strings.Contains(reply, "Ориентир по сроку") {
		t.Fatalf("reply=%q", reply)
	}
	if strings.Contains(reply, "выполнить?") || strings.Contains(reply, "План готов") {
		t.Fatalf("must not ask execute: %q", reply)
	}
	if strings.Contains(reply, ".cursor") || strings.Contains(reply, "тгбот") || strings.Contains(reply, "класс=") {
		t.Fatalf("tech leak in chat: %q", reply)
	}
	planDir := filepath.Join(ws, ".cursor", "plans", "тгбот")
	entries, err := os.ReadDir(planDir)
	if err != nil || len(entries) == 0 {
		t.Fatalf("plan dir empty: %v %v", entries, err)
	}
}

func TestHITLConflictReply(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	fm := &fakeMsg{}
	p := &Pipeline{
		Store:       store.New(home),
		Cards:       card.NewStore(home),
		Messenger:   fm,
		ChatIDs:     map[int64]struct{}{-100: {}},
		BotUser:     "vdp_intake_bot",
		WithHITL:    true,
		WithAnalyze: true,
	}
	u := telegram.Update{
		UpdateID: 21,
		Message: &telegram.Message{
			MessageID: 2,
			Text:      "@vdp_intake_bot #баг нужно добавить новую кнопку оплаты в кабинете менеджера пожалуйста",
			Chat:      telegram.Chat{ID: -100},
			Entities:  []telegram.Entity{{Type: "mention", Offset: 0, Length: 15}},
		},
	}
	ok, err := p.HandleUpdate(context.Background(), u)
	if err != nil || !ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}
	if len(fm.texts) != 1 || !strings.Contains(fm.texts[0], "противоречие") {
		t.Fatalf("reply=%v", fm.texts)
	}
}

func TestHITLApproveAfterProposal(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	ws := t.TempDir()
	fm := &fakeMsg{}
	p := &Pipeline{
		Store:       store.New(home),
		Cards:       card.NewStore(home),
		Messenger:   fm,
		ChatIDs:     map[int64]struct{}{-100: {}},
		BotUser:     "vdp_intake_bot",
		WithHITL:    true,
		WithAnalyze: true,
		Workspace:   ws,
	}
	u1 := telegram.Update{
		UpdateID: 30,
		Message: &telegram.Message{
			MessageID: 10,
			Text:      "@vdp_intake_bot #доработка нужно добавить понятный статус ожидания для менеджера в кабинете при долгом ответе банка",
			Chat:      telegram.Chat{ID: -100},
			Entities:  []telegram.Entity{{Type: "mention", Offset: 0, Length: 15}},
		},
	}
	if _, err := p.HandleUpdate(context.Background(), u1); err != nil {
		t.Fatal(err)
	}
	u2 := telegram.Update{
		UpdateID: 31,
		Message: &telegram.Message{
			MessageID: 11,
			Text:      "@vdp_intake_bot да",
			Chat:      telegram.Chat{ID: -100},
			Entities:  []telegram.Entity{{Type: "mention", Offset: 0, Length: 15}},
		},
	}
	ok, err := p.HandleUpdate(context.Background(), u2)
	if err != nil || !ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}
	if len(fm.texts) < 2 || !strings.Contains(fm.texts[len(fm.texts)-1], "согласие") {
		t.Fatalf("texts=%v", fm.texts)
	}
	open, err := p.Cards.ListOpenInChat(-100)
	if err != nil {
		t.Fatal(err)
	}
	if len(open) != 0 {
		t.Fatalf("expected no open cards, got %d", len(open))
	}
}

func TestProcessRemindersSoftThenStale(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	fm := &fakeMsg{}
	fixed := time.Date(2026, 9, 9, 12, 0, 0, 0, time.UTC)
	p := &Pipeline{
		Store:            store.New(home),
		Cards:            card.NewStore(home),
		Messenger:        fm,
		ChatIDs:          map[int64]struct{}{-100: {}},
		BotUser:          "vdp_intake_bot",
		WithHITL:         true,
		ReminderInterval: time.Hour,
		MaxReminders:     1,
		now:              func() time.Time { return fixed },
	}
	c := &card.Card{
		ID:            "card--100-1",
		ChatID:        -100,
		RootMessageID: 1,
		Status:        card.StatusAwaitingApprove,
		LastAskAt:     fixed.Add(-2 * time.Hour),
		ReminderCount: 0,
	}
	if err := p.Cards.Save(c); err != nil {
		t.Fatal(err)
	}
	if err := p.ProcessReminders(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(fm.texts) != 1 || !strings.Contains(fm.texts[0], "Напоминаю") {
		t.Fatalf("reminder=%v", fm.texts)
	}
	if strings.Contains(fm.texts[0], "выполнить") {
		t.Fatalf("reminder must not say execute: %q", fm.texts[0])
	}
	got, err := p.Cards.Get(c.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.ReminderCount != 1 {
		t.Fatalf("count=%d", got.ReminderCount)
	}
	// Advance clock and fire again → stale
	p.now = func() time.Time { return fixed.Add(3 * time.Hour) }
	got.LastAskAt = fixed
	_ = p.Cards.Save(got)
	if err := p.ProcessReminders(context.Background()); err != nil {
		t.Fatal(err)
	}
	got, _ = p.Cards.Get(c.ID)
	if got.Status != card.StatusStale {
		t.Fatalf("status=%s", got.Status)
	}
	if !strings.Contains(fm.texts[len(fm.texts)-1], "Отложили") {
		t.Fatalf("stale reply=%v", fm.texts)
	}
	for _, tx := range fm.texts {
		if strings.Contains(tx, ".cursor") {
			t.Fatalf("tech in reminder: %q", tx)
		}
	}
}
