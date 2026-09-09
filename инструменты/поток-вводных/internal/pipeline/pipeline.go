package pipeline

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/viletech/tools/intake/internal/analyze"
	"github.com/viletech/tools/intake/internal/normalize"
	"github.com/viletech/tools/intake/internal/redact"
	"github.com/viletech/tools/intake/internal/store"
	"github.com/viletech/tools/intake/internal/telegram"
)

// Messenger sends replies to Telegram.
type Messenger interface {
	SendMessage(ctx context.Context, chatID, replyTo int64, text string) error
}

// Pipeline processes Telegram updates into inbox + replies.
type Pipeline struct {
	Store      *store.Store
	Messenger  Messenger
	ChatIDs    map[int64]struct{}
	BotUser    string
	Log        *slog.Logger
	WithAnalyze bool
}

const helpText = `Шаблон ввода (отметьте @vdp_intake_bot или /vvod):
1) тег (#баг / #доработка / #вопрос / #тест)
2) кратко суть
3) ожидание / результат
4) роль (user/manager/provider) если важно
5) id заявки если есть
6) срочность (низкая/средняя/высокая)`

// HandleUpdate processes one update. Returns whether it was an intake event.
func (p *Pipeline) HandleUpdate(ctx context.Context, u telegram.Update) (bool, error) {
	log := p.Log
	if log == nil {
		log = slog.Default()
	}
	if u.Message == nil {
		return false, nil
	}
	msg := u.Message
	log.Info("intake update",
		"update_id", u.UpdateID,
		"message_id", msg.MessageID,
		"chat_id", msg.Chat.ID,
	)
	if _, ok := p.ChatIDs[msg.Chat.ID]; !ok {
		return false, nil
	}
	seen, err := p.Store.Seen(u.UpdateID)
	if err != nil {
		return false, err
	}
	if seen {
		return false, nil
	}
	fromID := int64(0)
	fromUser := ""
	if msg.From != nil {
		fromID = msg.From.ID
		fromUser = msg.From.Username
	}
	ents := make([]normalize.Entity, 0, len(msg.Entities))
	for _, e := range msg.Entities {
		ents = append(ents, normalize.Entity{Type: e.Type, Offset: e.Offset, Length: e.Length})
	}
	nm := normalize.Message{
		UpdateID:  u.UpdateID,
		MessageID: msg.MessageID,
		ChatID:    msg.Chat.ID,
		FromID:    fromID,
		FromUser:  fromUser,
		Text:      msg.Text,
		Entities:  ents,
		BotUser:   p.BotUser,
	}
	trig := normalize.Classify(nm)
	if trig == normalize.TriggerNone {
		return false, nil
	}
	if trig == normalize.TriggerHelp {
		_ = p.Messenger.SendMessage(ctx, msg.Chat.ID, msg.MessageID, helpText)
		_ = p.Store.MarkSeen(u.UpdateID)
		return true, nil
	}
	redacted := redact.Text(msg.Text)
	rec := store.Record{
		UpdateID:     u.UpdateID,
		MessageID:    msg.MessageID,
		ChatID:       msg.Chat.ID,
		FromID:       fromID,
		FromUsername: fromUser,
		Trigger:      string(trig),
		Kind:         "intake",
		Text:         redacted,
	}
	var analysis analyze.Result
	if p.WithAnalyze {
		analysis = analyze.Analyze(msg.Text, p.BotUser)
		rec.Class = analysis.Class
		rec.Confidence = string(analysis.Confidence)
		rec.Chars = analysis.Chars
		rec.Tags = analysis.Tags
		if analysis.Confidence == analyze.ConfidenceLow {
			rec.Kind = "clarify"
		}
	}
	if err := p.Store.AppendInbox(rec); err != nil {
		return false, err
	}
	if err := p.Store.MarkSeen(u.UpdateID); err != nil {
		return false, err
	}
	ack := "принято"
	if p.WithAnalyze {
		ack = formatAnalyzeReply(analysis)
	}
	if err := p.Messenger.SendMessage(ctx, msg.Chat.ID, msg.MessageID, ack); err != nil {
		log.Warn("ack failed", "update_id", u.UpdateID, "message_id", msg.MessageID, "err", err)
	}
	return true, nil
}

func formatAnalyzeReply(r analyze.Result) string {
	var b strings.Builder
	b.WriteString("принято\n")
	b.WriteString(r.Summary)
	if r.Question != "" {
		b.WriteString("\n\n")
		b.WriteString(r.Question)
	}
	return b.String()
}

// ProcessBatch handles a list of updates; returns next offset.
func (p *Pipeline) ProcessBatch(ctx context.Context, updates []telegram.Update) (int64, error) {
	var next int64
	for _, u := range updates {
		if u.UpdateID >= next {
			next = u.UpdateID + 1
		}
		if _, err := p.HandleUpdate(ctx, u); err != nil {
			return next, fmt.Errorf("update %d: %w", u.UpdateID, err)
		}
	}
	return next, nil
}
