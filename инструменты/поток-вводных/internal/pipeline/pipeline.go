package pipeline

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/viletech/tools/intake/internal/analyze"
	"github.com/viletech/tools/intake/internal/card"
	"github.com/viletech/tools/intake/internal/comms"
	"github.com/viletech/tools/intake/internal/conflict"
	"github.com/viletech/tools/intake/internal/estimate"
	"github.com/viletech/tools/intake/internal/experience"
	"github.com/viletech/tools/intake/internal/normalize"
	"github.com/viletech/tools/intake/internal/planfile"
	"github.com/viletech/tools/intake/internal/proposal"
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
	Store             *store.Store
	Cards             *card.Store
	Messenger         Messenger
	ChatIDs           map[int64]struct{}
	BotUser           string
	Log               *slog.Logger
	WithAnalyze       bool
	WithHITL          bool
	Workspace         string
	ReminderInterval  time.Duration
	MaxReminders      int
	now               func() time.Time
}

const helpText = `Шаблон ввода (отметьте бота или /vvod):
1) тег (#баг / #доработка / #вопрос / #тест)
2) кратко суть
3) ожидание / результат
4) роль если важно
5) номер заявки если есть
6) срочность (низкая/средняя/высокая)`

// HandleUpdate processes one update. Returns whether it was an intake event.
func (p *Pipeline) HandleUpdate(ctx context.Context, u telegram.Update) (bool, error) {
	log := p.logger()
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
		_ = p.Messenger.SendMessage(ctx, msg.Chat.ID, msg.MessageID, comms.SanitizeManager(helpText))
		_ = p.Store.MarkSeen(u.UpdateID)
		return true, nil
	}
	if p.WithHITL && p.Cards != nil {
		handled, err := p.tryHITLDecision(ctx, msg, fromUser)
		if err != nil {
			return false, err
		}
		if handled {
			_ = p.Store.MarkSeen(u.UpdateID)
			return true, nil
		}
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
	analysis := analyze.Analyze(msg.Text, p.BotUser)
	if p.WithAnalyze || p.WithHITL {
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
	switch {
	case p.WithHITL:
		ack, err = p.handleHITLIntake(ctx, msg, fromUser, redacted, analysis)
		if err != nil {
			log.Warn("hitl failed", "update_id", u.UpdateID, "err", err)
			ack = comms.Accepted()
		}
	case p.WithAnalyze:
		ack = formatAnalyzeReply(analysis)
	}
	ack = comms.SanitizeManager(ack)
	if err := p.Messenger.SendMessage(ctx, msg.Chat.ID, msg.MessageID, ack); err != nil {
		log.Warn("ack failed", "update_id", u.UpdateID, "message_id", msg.MessageID, "err", err)
	}
	return true, nil
}

func (p *Pipeline) tryHITLDecision(ctx context.Context, msg *telegram.Message, fromUser string) (bool, error) {
	stripped := normalize.StripTrigger(msg.Text, p.BotUser)
	dec := comms.ParseHitlDecision(stripped)
	if dec == comms.HitlNone {
		return false, nil
	}
	open, err := p.Cards.ListOpenInChat(msg.Chat.ID)
	if err != nil {
		return false, err
	}
	var target *card.Card
	for _, c := range open {
		if c.Status == card.StatusAwaitingApprove {
			target = c
			break
		}
	}
	if target == nil {
		return false, nil
	}
	now := p.clock()
	switch dec {
	case comms.HitlApprove:
		target.Status = card.StatusApproved
		_ = experience.Append(p.StoreHome(), experience.Event{
			CardID: target.ID, Kind: "approve", Class: target.Class, TimelinePhrase: target.TimelinePhrase,
		})
		_ = p.rewritePlan(target)
		_ = p.Cards.Save(target)
		_ = p.Messenger.SendMessage(ctx, msg.Chat.ID, msg.MessageID, comms.ApprovedAck())
		_ = fromUser
		_ = now
		return true, nil
	case comms.HitlDecline:
		target.Status = card.StatusDeclined
		_ = experience.Append(p.StoreHome(), experience.Event{
			CardID: target.ID, Kind: "decline", Class: target.Class, TimelinePhrase: target.TimelinePhrase,
		})
		_ = p.rewritePlan(target)
		_ = p.Cards.Save(target)
		_ = p.Messenger.SendMessage(ctx, msg.Chat.ID, msg.MessageID, comms.DeclinedAck())
		return true, nil
	default:
		return false, nil
	}
}

func (p *Pipeline) handleHITLIntake(_ context.Context, msg *telegram.Message, fromUser, redacted string, analysis analyze.Result) (string, error) {
	now := p.clock()
	id := card.NewID(msg.Chat.ID, msg.MessageID)
	prevTexts := []string{}
	c := &card.Card{
		ID:            id,
		ChatID:        msg.Chat.ID,
		RootMessageID: msg.MessageID,
		FromUsername:  fromUser,
		Status:        card.StatusDraft,
		Class:         analysis.Class,
		Summary:       redacted,
		Texts:         []string{redacted},
		CreatedAt:     now,
		UpdatedAt:     now,
		LastAskAt:     now,
	}
	findings := conflict.Detect(analysis.Class, analysis.Tags, redacted, prevTexts)
	var conflictPlains []string
	for _, f := range findings {
		conflictPlains = append(conflictPlains, f.Plain)
	}
	c.Conflicts = conflictPlains
	if analysis.Confidence == analyze.ConfidenceLow && len(findings) == 0 {
		c.Status = card.StatusAwaitingClarify
		if err := p.Cards.Save(c); err != nil {
			return "", err
		}
		_ = experience.Append(p.StoreHome(), experience.Event{CardID: id, Kind: "clarify", Class: analysis.Class})
		q := analysis.Question
		if q == "" {
			q = "Уточните, пожалуйста, одним предложением: это ошибка, доработка, вопрос по удобству или проверка связи?"
		}
		return comms.Clarify(q), nil
	}
	if len(findings) > 0 {
		c.Status = card.StatusAwaitingClarify
		if err := p.Cards.Save(c); err != nil {
			return "", err
		}
		_ = experience.Append(p.StoreHome(), experience.Event{
			CardID: id, Kind: "conflict", Class: analysis.Class, Conflicts: conflictPlains,
		})
		f := findings[0]
		return comms.ConflictWarn(f.Plain, f.Question), nil
	}
	prop := proposal.Summary(msg.Text, p.BotUser, analysis.Class)
	est := estimate.FromSignals(analysis.Class, analysis.Chars, analysis.Words, msg.Text)
	c.Proposal = prop
	c.TimelinePhrase = est.ManagerPhrase
	c.Status = card.StatusAwaitingApprove
	if err := p.Cards.Save(c); err != nil {
		return "", err
	}
	if p.Workspace != "" {
		_, err := planfile.WriteMarkdown(p.Workspace, planfile.Document{
			CardID:         c.ID,
			Status:         string(c.Status),
			Class:          c.Class,
			Summary:        c.Summary,
			Proposal:       prop,
			TimelinePhrase: est.ManagerPhrase,
			Conflicts:      conflictPlains,
			EngineerNote:   est.EngineerNote,
			Todos:          est.Todos,
			Hours:          est.Hours,
		})
		if err != nil {
			p.logger().Warn("plan write failed", "card_id", c.ID, "err", err)
		}
	}
	_ = experience.Append(p.StoreHome(), experience.Event{
		CardID: id, Kind: "proposal", Class: analysis.Class, TimelinePhrase: est.ManagerPhrase,
	})
	return comms.Proposal(prop, est.ManagerPhrase), nil
}

func (p *Pipeline) rewritePlan(c *card.Card) error {
	if p.Workspace == "" || c == nil {
		return nil
	}
	_, err := planfile.WriteMarkdown(p.Workspace, planfile.Document{
		CardID:         c.ID,
		Status:         string(c.Status),
		Class:          c.Class,
		Summary:        c.Summary,
		Proposal:       c.Proposal,
		TimelinePhrase: c.TimelinePhrase,
		Conflicts:      c.Conflicts,
	})
	return err
}

// ProcessReminders sends soft nudges or marks stale; never includes tech paths.
func (p *Pipeline) ProcessReminders(ctx context.Context) error {
	if !p.WithHITL || p.Cards == nil {
		return nil
	}
	interval := p.ReminderInterval
	if interval <= 0 {
		interval = 24 * time.Hour
	}
	maxR := p.MaxReminders
	if maxR <= 0 {
		maxR = 2
	}
	due, err := p.Cards.ListDueReminders(p.clock(), interval)
	if err != nil {
		return err
	}
	for _, c := range due {
		if c.ReminderCount >= maxR {
			c.Status = card.StatusStale
			c.LastAskAt = p.clock()
			_ = p.Cards.Save(c)
			_ = p.rewritePlan(c)
			_ = experience.Append(p.StoreHome(), experience.Event{
				CardID: c.ID, Kind: "stale", Class: c.Class, ReminderCount: c.ReminderCount,
			})
			_ = p.Messenger.SendMessage(ctx, c.ChatID, c.RootMessageID, comms.StaleNotice())
			continue
		}
		c.ReminderCount++
		c.LastAskAt = p.clock()
		_ = p.Cards.Save(c)
		_ = p.Messenger.SendMessage(ctx, c.ChatID, c.RootMessageID, comms.Reminder())
	}
	return nil
}

// StoreHome returns intake home for experience paths.
func (p *Pipeline) StoreHome() string {
	if p.Store == nil {
		return ""
	}
	return p.Store.Home()
}

func (p *Pipeline) clock() time.Time {
	if p.now != nil {
		return p.now()
	}
	return time.Now().UTC()
}

func (p *Pipeline) logger() *slog.Logger {
	if p.Log == nil {
		return slog.Default()
	}
	return p.Log
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
