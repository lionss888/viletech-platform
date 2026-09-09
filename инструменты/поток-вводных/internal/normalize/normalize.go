package normalize

import (
	"strings"
	"unicode/utf16"
)

// Trigger is how the message entered intake.
type Trigger string

const (
	TriggerNone    Trigger = ""
	TriggerMention Trigger = "mention"
	TriggerVvod    Trigger = "vvod"
	TriggerHelp    Trigger = "help"
)

// Entity mirrors Telegram message entity offsets (UTF-16).
type Entity struct {
	Type   string
	Offset int
	Length int
}

// Message is the normalized inbound shape.
type Message struct {
	UpdateID   int64
	MessageID  int64
	ChatID     int64
	FromID     int64
	FromUser   string
	Text       string
	Entities   []Entity
	BotUser    string
}

// Classify returns the intake trigger for a message.
func Classify(m Message) Trigger {
	text := strings.TrimSpace(m.Text)
	if text == "" {
		return TriggerNone
	}
	bot := strings.TrimPrefix(strings.ToLower(strings.TrimSpace(m.BotUser)), "@")
	if bot == "" {
		bot = "vdp_intake_bot"
	}
	lower := strings.ToLower(text)
	if isCommand(lower, "/help", bot) {
		return TriggerHelp
	}
	if isCommand(lower, "/vvod", bot) {
		return TriggerVvod
	}
	if hasBotMention(m.Text, m.Entities, bot) {
		return TriggerMention
	}
	return TriggerNone
}

func isCommand(lower, cmd, bot string) bool {
	if lower == cmd || strings.HasPrefix(lower, cmd+" ") || strings.HasPrefix(lower, cmd+"\n") {
		return true
	}
	at := cmd + "@" + bot
	return lower == at || strings.HasPrefix(lower, at+" ") || strings.HasPrefix(lower, at+"\n")
}

func hasBotMention(text string, entities []Entity, bot string) bool {
	want := "@" + strings.ToLower(bot)
	u16 := utf16.Encode([]rune(text))
	for _, e := range entities {
		if e.Type != "mention" && e.Type != "text_mention" {
			continue
		}
		if e.Offset < 0 || e.Length <= 0 || e.Offset+e.Length > len(u16) {
			continue
		}
		frag := string(utf16.Decode(u16[e.Offset : e.Offset+e.Length]))
		if strings.EqualFold(frag, want) {
			return true
		}
	}
	// Fallback if entities missing but plain @bot present.
	return strings.Contains(strings.ToLower(text), want)
}

// StripTrigger removes leading @bot / /vvod for display analysis.
func StripTrigger(text, bot string) string {
	bot = strings.TrimPrefix(strings.ToLower(strings.TrimSpace(bot)), "@")
	t := strings.TrimSpace(text)
	lower := strings.ToLower(t)
	prefixes := []string{
		"@" + bot,
		"/vvod@" + bot,
		"/vvod",
	}
	for _, p := range prefixes {
		if strings.HasPrefix(lower, p) {
			t = strings.TrimSpace(t[len(p):])
			lower = strings.ToLower(t)
		}
	}
	return t
}
