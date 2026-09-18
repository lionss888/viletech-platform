package pipeline

import (
	"context"
	"strings"

	"github.com/viletech/tools/vedy_bot/internal/comms"
	"github.com/viletech/tools/vedy_bot/internal/telegram"
)

// tryOperatorStand handles /stand … in operator chats only.
func (p *Pipeline) tryOperatorStand(ctx context.Context, msg *telegram.Message) bool {
	if p.Stand == nil || msg == nil {
		return false
	}
	text := strings.TrimSpace(msg.PrimaryText())
	low := strings.ToLower(text)
	if !strings.HasPrefix(low, "/stand") {
		return false
	}
	parts := strings.Fields(text)
	if len(parts) < 2 {
		_, _ = p.sendAndMirror(ctx, msg.Chat.ID, msg.MessageID, "stand",
			comms.SanitizeManager("Команды: /stand status | /stand start alpha-status|alpha-smoke|gate-fast|notify-gate"))
		return true
	}
	switch strings.ToLower(parts[1]) {
	case "status":
		line, err := p.Stand.ManagerLine("")
		if err != nil {
			line = "Статус недоступен."
		}
		_, _ = p.sendAndMirror(ctx, msg.Chat.ID, msg.MessageID, "stand", comms.SanitizeManager(line))
		return true
	case "start":
		action := "alpha-status"
		if len(parts) >= 3 {
			action = parts[2]
		}
		id, err := p.Stand.StartAction(action)
		if err != nil {
			_, _ = p.sendAndMirror(ctx, msg.Chat.ID, msg.MessageID, "stand",
				comms.SanitizeManager("Не удалось запустить проверку."))
			return true
		}
		_, _ = p.sendAndMirror(ctx, msg.Chat.ID, msg.MessageID, "stand",
			comms.SanitizeManager("Проверка стенда запущена (job для оператора)."))
		_ = id
		return true
	default:
		_, _ = p.sendAndMirror(ctx, msg.Chat.ID, msg.MessageID, "stand",
			comms.SanitizeManager("Неизвестная команда /stand."))
		return true
	}
}
