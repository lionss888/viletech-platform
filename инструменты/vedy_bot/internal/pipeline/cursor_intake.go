package pipeline

import (
	"context"
	"fmt"
	"strings"

	"github.com/viletech/tools/vedy_bot/internal/card"
	"github.com/viletech/tools/vedy_bot/internal/comms"
	"github.com/viletech/tools/vedy_bot/internal/experience"
	"github.com/viletech/tools/vedy_bot/internal/planfile"
	"github.com/viletech/tools/vedy_bot/internal/telegram"
)

// EffectiveHITLMode returns rules|cursor|hybrid.
func (p *Pipeline) EffectiveHITLMode() string {
	m := strings.ToLower(strings.TrimSpace(p.HITLMode))
	switch m {
	case "cursor", "hybrid", "rules":
		return m
	default:
		return "rules"
	}
}

func (p *Pipeline) wantCursorIntake() bool {
	if !p.TGCursor || p.StartAgent == nil {
		return false
	}
	m := p.EffectiveHITLMode()
	return m == "cursor" || m == "hybrid"
}

// tryCursorIntake starts async Cursor job; returns manager ack or error to trigger fallback.
func (p *Pipeline) tryCursorIntake(ctx context.Context, msg *telegram.Message, fromUser, redacted string, c *card.Card) (string, error) {
	prompt := buildCursorIntakePrompt(redacted, fromUser)
	if p.BuildKnowledgePack != nil {
		pack, err := p.BuildKnowledgePack(redacted)
		if err != nil {
			return "", fmt.Errorf("kb: %w", err)
		}
		if strings.TrimSpace(pack) != "" {
			prompt = "Контекст знаний:\n" + pack + "\n\n---\n\n" + prompt
		}
	}
	jobID, err := p.StartAgent("ask_agent", prompt, false)
	if err != nil {
		return "", err
	}
	c.Status = card.StatusAwaitingAgent
	c.AgentJobID = jobID
	c.HITLMode = p.EffectiveHITLMode()
	if err := p.Cards.Save(c); err != nil {
		return "", err
	}
	_ = experience.Append(p.StoreHome(), experience.Event{
		CardID: c.ID, Kind: "agent", Class: c.Class, Mode: c.HITLMode,
	})
	go p.finishCursorIntake(context.Background(), msg.Chat.ID, msg.MessageID, c.ID, jobID)
	return "Принято в работу. Скоро уточним детали или пришлём предложение с оценкой.", nil
}

func buildCursorIntakePrompt(redacted, fromUser string) string {
	return strings.TrimSpace(fmt.Sprintf(`Ты помощник intake ВЭД. Сообщение менеджера (@%s):

%s

Ответь СТРОГО одним блоком с маркерами:
OUTCOME: clarify|proposal|conflict
TEXT: <текст менеджеру без путей файлов и без IDE-жаргона>
TIMELINE: <фраза срока или ->
PLAN_SUMMARY: <кратко для .plan.md или ->
`, fromUser, redacted))
}

func (p *Pipeline) finishCursorIntake(ctx context.Context, chatID, replyTo int64, cardID, jobID string) {
	if p.WaitAgentJob == nil || p.Cards == nil {
		return
	}
	result, err := p.WaitAgentJob(jobID)
	c, loadErr := p.Cards.Get(cardID)
	if loadErr != nil || c == nil {
		return
	}
	if err != nil {
		c.FallbackReason = err.Error()
		if p.EffectiveHITLMode() == "hybrid" {
			c.Status = card.StatusAwaitingClarify
			_ = p.Cards.Save(c)
			_, _ = p.sendAndMirror(ctx, chatID, replyTo, "proposal",
				"Авторазбор не завершился — оператор продолжит вручную. Напишите уточнение при необходимости.")
			_ = experience.Append(p.StoreHome(), experience.Event{
				CardID: cardID, Kind: "fallback", Mode: "hybrid", FallbackReason: err.Error(),
			})
			return
		}
		c.Status = card.StatusAwaitingClarify
		_ = p.Cards.Save(c)
		_, _ = p.sendAndMirror(ctx, chatID, replyTo, "proposal",
			"Авторазбор недоступен. Оператор разберёт вручную.")
		return
	}
	outcome, text, timeline := ParseAgentMarkers(result)
	if strings.TrimSpace(text) == "" {
		c.Status = card.StatusAwaitingClarify
		c.FallbackReason = "empty_agent"
		_ = p.Cards.Save(c)
		_, _ = p.sendAndMirror(ctx, chatID, replyTo, "proposal",
			"Нужно уточнение — опишите задачу одним предложением.")
		return
	}
	safe := ManagerSafeFromAgent(outcome, text, timeline)
	switch outcome {
	case "clarify", "conflict":
		c.Status = card.StatusAwaitingClarify
	default:
		c.Status = card.StatusAwaitingApprove
		c.Proposal = text
		c.TimelinePhrase = timeline
		if p.Workspace != "" {
			_, _ = planfile.WriteMarkdown(p.Workspace, planfile.Document{
				CardID:         c.ID,
				Status:         string(c.Status),
				Class:          c.Class,
				Summary:        c.Summary,
				Proposal:       text,
				TimelinePhrase: timeline,
				PlanTodos: []planfile.TodoItem{
					{ID: "1", Content: text, Status: planfile.TodoPending},
				},
			})
		}
	}
	_ = p.Cards.Save(c)
	_ = experience.Append(p.StoreHome(), experience.Event{
		CardID: cardID, Kind: "proposal", Mode: "cursor", TimelinePhrase: timeline,
	})
	_, _ = p.sendAndMirror(ctx, chatID, replyTo, "proposal", safe)
}

// ParseAgentMarkers extracts OUTCOME/TEXT/TIMELINE from agent reply.
func ParseAgentMarkers(raw string) (outcome, text, timeline string) {
	outcome = "proposal"
	for _, ln := range strings.Split(raw, "\n") {
		line := strings.TrimSpace(ln)
		up := strings.ToUpper(line)
		switch {
		case strings.HasPrefix(up, "OUTCOME:"):
			outcome = strings.ToLower(strings.TrimSpace(line[len("OUTCOME:"):]))
		case strings.HasPrefix(up, "TEXT:"):
			text = strings.TrimSpace(line[len("TEXT:"):])
		case strings.HasPrefix(up, "TIMELINE:"):
			timeline = strings.TrimSpace(line[len("TIMELINE:"):])
			if timeline == "-" {
				timeline = ""
			}
		}
	}
	if text == "" {
		text = strings.TrimSpace(raw)
	}
	return outcome, text, timeline
}

// ManagerSafeFromAgent maps agent markers to sanitize-ready reply.
func ManagerSafeFromAgent(outcome, text, timeline string) string {
	switch outcome {
	case "clarify":
		return comms.Clarify(text)
	case "conflict":
		return comms.ConflictWarn(text, "Уточните, пожалуйста.")
	default:
		if timeline == "" {
			timeline = "оценку уточним после согласования"
		}
		return comms.Proposal(text, timeline)
	}
}
