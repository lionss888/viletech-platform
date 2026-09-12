package pipeline

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/viletech/tools/intake/internal/analytics"
	"github.com/viletech/tools/intake/internal/analyze"
	"github.com/viletech/tools/intake/internal/card"
	"github.com/viletech/tools/intake/internal/comms"
	"github.com/viletech/tools/intake/internal/experience"
	"github.com/viletech/tools/intake/internal/normalize"
	"github.com/viletech/tools/intake/internal/planfile"
	"github.com/viletech/tools/intake/internal/proposal"
	"github.com/viletech/tools/intake/internal/redact"
	"github.com/viletech/tools/intake/internal/router"
	"github.com/viletech/tools/intake/internal/store"
	"github.com/viletech/tools/intake/internal/telegram"
)

// Messenger sends replies to Telegram.
type Messenger interface {
	SendMessage(ctx context.Context, chatID, replyTo int64, text string) (int64, error)
}

// MediaFetcher downloads Telegram files (optional).
type MediaFetcher interface {
	GetFile(ctx context.Context, fileID string) (telegram.FileMeta, error)
	DownloadFile(ctx context.Context, filePath string) ([]byte, error)
}

// MediaSender uploads/deletes Telegram media (optional).
type MediaSender interface {
	SendPhoto(ctx context.Context, chatID int64, filename string, data []byte, caption string) (int64, error)
	SendDocument(ctx context.Context, chatID int64, filename string, data []byte, caption string) (int64, error)
	SendVideo(ctx context.Context, chatID int64, filename string, data []byte, caption string) (int64, error)
	DeleteMessage(ctx context.Context, chatID, messageID int64) error
}

// Pipeline processes Telegram updates into inbox + replies.
type Pipeline struct {
	Store            *store.Store
	Cards            *card.Store
	Messenger        Messenger
	Media            MediaFetcher
	MediaOut         MediaSender
	ChatIDs          map[int64]struct{}
	OperatorChatIDs  map[int64]struct{}
	BotUser          string
	Log              *slog.Logger
	WithAnalyze      bool
	WithHITL         bool
	Workspace        string
	ReminderInterval time.Duration
	MaxReminders     int
	MaxMediaBytes    int64
	now              func() time.Time
}

const helpText = `Шаблон ввода (отметьте бота @… или /vvod):
1) тег (#баг / #доработка / #вопрос / #тест)
2) кратко суть
3) ожидание / результат
4) роль если важно
5) номер заявки если есть
6) срочность (низкая/средняя/высокая)

Что куда попадает:
• @бот или /vvod (+ текст/вложение) → inbox и HITL (если включён)
• обычное сообщение или медиа без триггера → только лента консоли, без карточки
• /help → эта справка
• стикеры/голосовые — не принимаются`

// ConsoleIngest is an operator message from the local console.
type ConsoleIngest struct {
	Text        string
	ChatID      int64
	AsIntake    bool
	MirrorToTG  bool
	Target      string // manager|operator (optional; selects chat when ChatID==0)
	Attachments []store.Attachment
	FromUser    string
}

// ConsoleResult is the outcome of a console ingest.
type ConsoleResult struct {
	Record    store.Record `json:"record"`
	Ack       string       `json:"ack,omitempty"`
	TGMessage int64        `json:"tg_message_id,omitempty"`
	CardID    string       `json:"card_id,omitempty"`
}

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
	if !router.Allowed(msg.Chat.ID, p.ChatIDs, p.OperatorChatIDs) {
		return false, nil
	}
	channel := string(router.Classify(msg.Chat.ID, p.ChatIDs, p.OperatorChatIDs))
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
	text := msg.PrimaryText()
	atts, err := p.pullMedia(ctx, msg)
	if err != nil {
		log.Warn("media pull failed", "update_id", u.UpdateID, "err", err)
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
		Text:      text,
		Entities:  ents,
		BotUser:   p.BotUser,
	}
	trig := normalize.Classify(nm)
	display := redact.Text(text)
	if display == "" && len(atts) > 0 {
		display = "[вложение]"
	}
	_ = p.Store.AppendThread(store.ThreadMsg{
		UpdateID:    u.UpdateID,
		MessageID:   msg.MessageID,
		ChatID:      msg.Chat.ID,
		Channel:     channel,
		FromID:      fromID,
		FromUser:    fromUser,
		Direction:   "in",
		Text:        display,
		Kind:        "chat",
		Trigger:     string(trig),
		Attachments: atts,
	})
	// Operator chat: mirror only (manager chat remains the intake surface).
	if router.Classify(msg.Chat.ID, p.ChatIDs, p.OperatorChatIDs) == router.ChannelOperator {
		if trig == normalize.TriggerHelp {
			_, _ = p.sendAndMirror(ctx, msg.Chat.ID, msg.MessageID, "help", comms.SanitizeManager(helpText))
		}
		_ = p.Store.MarkSeen(u.UpdateID)
		return false, nil
	}
	if trig == normalize.TriggerNone {
		_ = p.Store.MarkSeen(u.UpdateID)
		return false, nil
	}
	if trig == normalize.TriggerHelp {
		_, _ = p.sendAndMirror(ctx, msg.Chat.ID, msg.MessageID, "help", comms.SanitizeManager(helpText))
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
	redacted := redact.Text(text)
	if redacted == "" && len(atts) > 0 {
		redacted = "[вложение]"
	}
	rec := store.Record{
		UpdateID:     u.UpdateID,
		MessageID:    msg.MessageID,
		ChatID:       msg.Chat.ID,
		FromID:       fromID,
		FromUsername: fromUser,
		Trigger:      string(trig),
		Kind:         "intake",
		Source:       "telegram",
		Text:         redacted,
		Attachments:  atts,
	}
	bundle := analytics.Run(text, p.BotUser)
	analysis := bundle.AnalyzeResult()
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
		ack, err = p.handleHITLIntake(ctx, msg, fromUser, redacted, bundle)
		if err != nil {
			log.Warn("hitl failed", "update_id", u.UpdateID, "err", err)
			ack = comms.Accepted()
		}
	case p.WithAnalyze:
		ack = formatAnalyzeReply(analysis)
	}
	ack = comms.SanitizeManager(ack)
	if _, err := p.sendAndMirror(ctx, msg.Chat.ID, msg.MessageID, "proposal", ack); err != nil {
		log.Warn("ack failed", "update_id", u.UpdateID, "message_id", msg.MessageID, "err", err)
	}
	return true, nil
}

func (p *Pipeline) sendAndMirror(ctx context.Context, chatID, replyTo int64, kind, text string) (int64, error) {
	if p.Messenger == nil {
		return 0, fmt.Errorf("messenger nil")
	}
	target, channel := router.TargetForKind(kind, p.ChatIDs, p.OperatorChatIDs, chatID)
	if target == 0 {
		target = chatID
	}
	reply := replyTo
	if target != chatID {
		reply = 0
	}
	id, err := p.Messenger.SendMessage(ctx, target, reply, text)
	if err != nil {
		return 0, err
	}
	_ = p.Store.AppendThread(store.ThreadMsg{
		MessageID: id,
		ChatID:    target,
		Channel:   string(channel),
		FromUser:  p.BotUser,
		Direction: "out",
		Text:      text,
		Kind:      "bot",
	})
	return id, nil
}

// IngestConsole handles operator console messages (same HITL path when AsIntake).
func (p *Pipeline) IngestConsole(ctx context.Context, in ConsoleIngest) (ConsoleResult, error) {
	chatID := in.ChatID
	if chatID == 0 {
		switch strings.ToLower(strings.TrimSpace(in.Target)) {
		case "operator":
			chatID = router.Primary(p.OperatorChatIDs)
			if chatID == 0 {
				chatID = p.primaryChatID()
			}
		default:
			chatID = p.primaryChatID()
		}
	}
	if chatID == 0 {
		return ConsoleResult{}, fmt.Errorf("no chat_id configured")
	}
	text := strings.TrimSpace(in.Text)
	redacted := redact.Text(text)
	if redacted == "" && len(in.Attachments) > 0 {
		redacted = "[вложение]"
	}
	now := p.clock()
	updateID := -now.UnixNano()
	msgID := now.Unix()%1_000_000_000 + 1
	fromUser := in.FromUser
	if fromUser == "" {
		fromUser = "console"
	}
	rec := store.Record{
		UpdateID:     updateID,
		MessageID:    msgID,
		ChatID:       chatID,
		FromUsername: fromUser,
		Trigger:      "console",
		Kind:         "console",
		Source:       "console",
		Text:         redacted,
		Attachments:  in.Attachments,
		ReceivedAt:   now.Format(time.RFC3339),
	}
	var ack string
	var cardID string
	if in.AsIntake {
		rec.Kind = "intake"
		rec.Trigger = "vvod"
		bundle := analytics.Run(text, p.BotUser)
		analysis := bundle.AnalyzeResult()
		if p.WithAnalyze || p.WithHITL {
			rec.Class = analysis.Class
			rec.Confidence = string(analysis.Confidence)
			rec.Chars = analysis.Chars
			rec.Tags = analysis.Tags
		}
		if err := p.Store.AppendInbox(rec); err != nil {
			return ConsoleResult{}, err
		}
		fake := &telegram.Message{
			MessageID: msgID,
			Text:      text,
			Chat:      telegram.Chat{ID: chatID},
			From:      &telegram.User{Username: fromUser},
		}
		if p.WithHITL {
			var err error
			ack, err = p.handleHITLIntake(ctx, fake, fromUser, redacted, bundle)
			if err != nil {
				ack = comms.Accepted()
			}
			cardID = card.NewID(chatID, msgID)
		} else if p.WithAnalyze {
			ack = formatAnalyzeReply(analysis)
		} else {
			ack = comms.Accepted()
		}
		ack = comms.SanitizeManager(ack)
	} else {
		rec.Kind = "console_out"
		if err := p.Store.AppendInbox(rec); err != nil {
			return ConsoleResult{}, err
		}
		ack = redacted
	}
	ch := string(router.Classify(chatID, p.ChatIDs, p.OperatorChatIDs))
	_ = p.Store.AppendThread(store.ThreadMsg{
		MessageID:   msgID,
		ChatID:      chatID,
		Channel:     ch,
		FromUser:    fromUser,
		Direction:   "out",
		Text:        redacted,
		Kind:        "console",
		Attachments: in.Attachments,
	})
	var tgMsg int64
	if in.MirrorToTG && p.Messenger != nil {
		body := ack
		if !in.AsIntake {
			body = comms.SanitizeManager(redacted)
		}
		kind := "proposal"
		if ch == string(router.ChannelOperator) {
			kind = "operator_prompt"
		}
		id, err := p.sendAndMirror(ctx, chatID, 0, kind, body)
		if err != nil {
			return ConsoleResult{Record: rec, Ack: ack, CardID: cardID}, err
		}
		tgMsg = id
		if len(in.Attachments) > 0 && p.MediaOut != nil {
			for _, a := range in.Attachments {
				_ = p.mirrorAttachment(ctx, chatID, a)
			}
		}
	}
	return ConsoleResult{Record: rec, Ack: ack, TGMessage: tgMsg, CardID: cardID}, nil
}

// ApplyHITLDecision approves or declines a card from the console.
func (p *Pipeline) ApplyHITLDecision(ctx context.Context, cardID string, approve bool, mirror bool) error {
	if p.Cards == nil {
		return fmt.Errorf("cards not configured")
	}
	c, err := p.Cards.Get(cardID)
	if err != nil {
		return err
	}
	if c.Status != card.StatusAwaitingApprove {
		return fmt.Errorf("card not awaiting approve")
	}
	var ack string
	if approve {
		c.Status = card.StatusApproved
		ack = comms.ApprovedAck()
		_ = experience.Append(p.StoreHome(), experience.Event{
			CardID: c.ID, Kind: "approve", Class: c.Class, TimelinePhrase: c.TimelinePhrase,
		})
	} else {
		c.Status = card.StatusDeclined
		ack = comms.DeclinedAck()
		_ = experience.Append(p.StoreHome(), experience.Event{
			CardID: c.ID, Kind: "decline", Class: c.Class, TimelinePhrase: c.TimelinePhrase,
		})
	}
	_ = p.rewritePlan(c)
	if err := p.Cards.Save(c); err != nil {
		return err
	}
	if mirror && p.Messenger != nil {
		_, _ = p.sendAndMirror(ctx, c.ChatID, c.RootMessageID, "proposal", ack)
	}
	return nil
}

// DeleteTGMessage removes a Telegram message when MediaOut is set.
func (p *Pipeline) DeleteTGMessage(ctx context.Context, chatID, messageID int64) error {
	if p.MediaOut == nil {
		return fmt.Errorf("telegram delete not configured")
	}
	return p.MediaOut.DeleteMessage(ctx, chatID, messageID)
}

func (p *Pipeline) mirrorAttachment(ctx context.Context, chatID int64, a store.Attachment) error {
	abs := p.Store.AbsMediaPath(a.Path)
	if abs == "" {
		return fmt.Errorf("bad media path")
	}
	data, err := os.ReadFile(abs)
	if err != nil {
		return err
	}
	name := a.Name
	if name == "" {
		name = "file.bin"
	}
	mime := strings.ToLower(a.MIME)
	switch {
	case strings.HasPrefix(mime, "image/"):
		_, err = p.MediaOut.SendPhoto(ctx, chatID, name, data, "")
	case strings.HasPrefix(mime, "video/"):
		_, err = p.MediaOut.SendVideo(ctx, chatID, name, data, "")
	default:
		_, err = p.MediaOut.SendDocument(ctx, chatID, name, data, "")
	}
	return err
}

func (p *Pipeline) pullMedia(ctx context.Context, msg *telegram.Message) ([]store.Attachment, error) {
	if p.Media == nil || p.Store == nil || msg == nil {
		return nil, nil
	}
	max := p.MaxMediaBytes
	if max <= 0 {
		max = 25 << 20
	}
	type spec struct {
		fileID, name, mime string
	}
	var specs []spec
	if id := msg.BestPhotoFileID(); id != "" {
		specs = append(specs, spec{id, "photo.jpg", "image/jpeg"})
	}
	if msg.Document != nil && msg.Document.FileID != "" {
		name := msg.Document.FileName
		if name == "" {
			name = "document.bin"
		}
		specs = append(specs, spec{msg.Document.FileID, name, msg.Document.MimeType})
	}
	if msg.Video != nil && msg.Video.FileID != "" {
		name := msg.Video.FileName
		if name == "" {
			name = "video.mp4"
		}
		specs = append(specs, spec{msg.Video.FileID, name, msg.Video.MimeType})
	}
	var out []store.Attachment
	for _, sp := range specs {
		meta, err := p.Media.GetFile(ctx, sp.fileID)
		if err != nil {
			return out, err
		}
		if int64(meta.FileSize) > max && meta.FileSize > 0 {
			continue
		}
		data, err := p.Media.DownloadFile(ctx, meta.FilePath)
		if err != nil {
			return out, err
		}
		if int64(len(data)) > max {
			continue
		}
		att, err := p.Store.SaveMedia(fmt.Sprintf("tg-%d", time.Now().UnixNano()), sp.name, data)
		if err != nil {
			return out, err
		}
		att.MIME = sp.mime
		att.Source = "telegram"
		att.TGFileID = sp.fileID
		out = append(out, att)
	}
	return out, nil
}

// PublishSelection sends sanitized text to manager or operator TG chat.
func (p *Pipeline) PublishSelection(ctx context.Context, text, target string, chatID int64) (int64, error) {
	body := comms.SanitizeManager(strings.TrimSpace(text))
	if body == "" {
		return 0, fmt.Errorf("text required")
	}
	kind := "proposal"
	if strings.EqualFold(target, "operator") {
		kind = "operator_prompt"
	}
	res, err := p.IngestConsole(ctx, ConsoleIngest{
		Text:       body,
		ChatID:     chatID,
		Target:     target,
		AsIntake:   false,
		MirrorToTG: true,
		FromUser:   "console",
	})
	if err != nil {
		return 0, err
	}
	_ = kind
	return res.TGMessage, nil
}

func (p *Pipeline) primaryChatID() int64 {
	for id := range p.ChatIDs {
		return id
	}
	return 0
}

func (p *Pipeline) tryHITLDecision(ctx context.Context, msg *telegram.Message, fromUser string) (bool, error) {
	stripped := normalize.StripTrigger(msg.PrimaryText(), p.BotUser)
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
	_ = fromUser
	switch dec {
	case comms.HitlApprove:
		target.Status = card.StatusApproved
		_ = experience.Append(p.StoreHome(), experience.Event{
			CardID: target.ID, Kind: "approve", Class: target.Class, TimelinePhrase: target.TimelinePhrase,
		})
		_ = p.rewritePlan(target)
		_ = p.Cards.Save(target)
		_, _ = p.sendAndMirror(ctx, msg.Chat.ID, msg.MessageID, "proposal", comms.ApprovedAck())
		return true, nil
	case comms.HitlDecline:
		target.Status = card.StatusDeclined
		_ = experience.Append(p.StoreHome(), experience.Event{
			CardID: target.ID, Kind: "decline", Class: target.Class, TimelinePhrase: target.TimelinePhrase,
		})
		_ = p.rewritePlan(target)
		_ = p.Cards.Save(target)
		_, _ = p.sendAndMirror(ctx, msg.Chat.ID, msg.MessageID, "proposal", comms.DeclinedAck())
		return true, nil
	default:
		return false, nil
	}
}

func (p *Pipeline) handleHITLIntake(_ context.Context, msg *telegram.Message, fromUser, redacted string, bundle analytics.Bundle) (string, error) {
	now := p.clock()
	id := card.NewID(msg.Chat.ID, msg.MessageID)
	analysis := bundle.AnalyzeResult()
	conflictPlains := bundle.ConflictPlains()
	bcopy := bundle
	c := &card.Card{
		ID:            id,
		ChatID:        msg.Chat.ID,
		RootMessageID: msg.MessageID,
		FromUsername:  fromUser,
		Status:        card.StatusDraft,
		Class:         analysis.Class,
		Summary:       redacted,
		Conflicts:     conflictPlains,
		Analytics:     &bcopy,
		Texts:         []string{redacted},
		CreatedAt:     now,
		UpdatedAt:     now,
		LastAskAt:     now,
	}
	rawText := msg.PrimaryText()
	if analysis.Confidence == analyze.ConfidenceLow && len(bundle.Conflicts) == 0 {
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
	if len(bundle.Conflicts) > 0 {
		c.Status = card.StatusAwaitingClarify
		if err := p.Cards.Save(c); err != nil {
			return "", err
		}
		_ = experience.Append(p.StoreHome(), experience.Event{
			CardID: id, Kind: "conflict", Class: analysis.Class, Conflicts: conflictPlains,
		})
		f := bundle.Conflicts[0]
		return comms.ConflictWarn(f.Plain, f.Question), nil
	}
	prop := proposal.Summary(rawText, p.BotUser, analysis.Class)
	c.Proposal = prop
	c.TimelinePhrase = bundle.Estimate.ManagerPhrase
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
			TimelinePhrase: bundle.Estimate.ManagerPhrase,
			Conflicts:      conflictPlains,
			EngineerNote:   bundle.Estimate.EngineerNote,
			Todos:          bundle.Estimate.Todos,
			Hours:          bundle.Estimate.Hours,
		})
		if err != nil {
			p.logger().Warn("plan write failed", "card_id", c.ID, "err", err)
		}
	}
	_ = experience.Append(p.StoreHome(), experience.Event{
		CardID: id, Kind: "proposal", Class: analysis.Class, TimelinePhrase: bundle.Estimate.ManagerPhrase,
	})
	return comms.Proposal(prop, bundle.Estimate.ManagerPhrase), nil
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
			_, _ = p.sendAndMirror(ctx, c.ChatID, c.RootMessageID, "stale", comms.StaleNotice())
			continue
		}
		c.ReminderCount++
		c.LastAskAt = p.clock()
		_ = p.Cards.Save(c)
		_, _ = p.sendAndMirror(ctx, c.ChatID, c.RootMessageID, "reminder", comms.Reminder())
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
