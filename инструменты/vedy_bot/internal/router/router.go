package router

// Channel is the Telegram surface for a mirrored thread line.
type Channel string

const (
	ChannelManager  Channel = "manager"
	ChannelOperator Channel = "operator"
	ChannelUnknown  Channel = "unknown"
)

// Classify maps chat id to manager vs operator allowlists.
func Classify(chatID int64, manager, operator map[int64]struct{}) Channel {
	if _, ok := manager[chatID]; ok {
		return ChannelManager
	}
	if _, ok := operator[chatID]; ok {
		return ChannelOperator
	}
	return ChannelUnknown
}

// Allowed reports whether the chat is in either allowlist.
func Allowed(chatID int64, manager, operator map[int64]struct{}) bool {
	return Classify(chatID, manager, operator) != ChannelUnknown
}

// Primary returns the first id from the set (stable enough for single-chat configs).
func Primary(ids map[int64]struct{}) int64 {
	for id := range ids {
		return id
	}
	return 0
}

// IsOperatorBound reports whether outbound kind is routed to the operator chat when configured.
// AP2b: reminders, agent digests, operator prompts → operator; proposal/help/stale/ack → manager.
func IsOperatorBound(kind string) bool {
	switch kind {
	case "reminder", "operator_digest", "operator_prompt":
		return true
	default:
		return false
	}
}

// TargetForKind picks destination chat for outbound bot traffic.
// Operator-bound kinds use TELEGRAM_OPERATOR_CHAT_IDS when set; otherwise fall back to manager/fallback.
// Manager-bound (proposal, help, stale, stand, …): ack stays on the manager intake chat.
func TargetForKind(kind string, manager, operator map[int64]struct{}, fallback int64) (chatID int64, channel Channel) {
	if IsOperatorBound(kind) {
		if id := Primary(operator); id != 0 {
			return id, ChannelOperator
		}
		if fallback != 0 {
			return fallback, Classify(fallback, manager, operator)
		}
		return Primary(manager), ChannelManager
	}
	if fallback != 0 {
		ch := Classify(fallback, manager, operator)
		if ch == ChannelUnknown {
			ch = ChannelManager
		}
		return fallback, ch
	}
	return Primary(manager), ChannelManager
}
