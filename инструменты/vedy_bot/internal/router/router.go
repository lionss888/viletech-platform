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

// TargetForKind picks destination chat for outbound bot traffic.
// manager_ack / proposal / stale → manager; reminder / operator_digest → operator when configured.
func TargetForKind(kind string, manager, operator map[int64]struct{}, fallback int64) (chatID int64, channel Channel) {
	switch kind {
	case "reminder", "operator_digest", "operator_prompt":
		if id := Primary(operator); id != 0 {
			return id, ChannelOperator
		}
		if fallback != 0 {
			return fallback, Classify(fallback, manager, operator)
		}
		return Primary(manager), ChannelManager
	default:
		if fallback != 0 {
			ch := Classify(fallback, manager, operator)
			if ch == ChannelUnknown {
				ch = ChannelManager
			}
			return fallback, ch
		}
		return Primary(manager), ChannelManager
	}
}
