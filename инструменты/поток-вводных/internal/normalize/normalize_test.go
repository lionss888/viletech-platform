package normalize

import "testing"

func TestClassifyMentionAndVvod(t *testing.T) {
	t.Parallel()
	m := Message{
		Text: "@vdp_intake_bot hello",
		Entities: []Entity{{Type: "mention", Offset: 0, Length: 15}},
		BotUser: "vdp_intake_bot",
	}
	if Classify(m) != TriggerMention {
		t.Fatal("want mention")
	}
	if Classify(Message{Text: "/vvod check", BotUser: "vdp_intake_bot"}) != TriggerVvod {
		t.Fatal("want vvod")
	}
	if Classify(Message{Text: "/help", BotUser: "vdp_intake_bot"}) != TriggerHelp {
		t.Fatal("want help")
	}
	if Classify(Message{Text: "no trigger", BotUser: "vdp_intake_bot"}) != TriggerNone {
		t.Fatal("want none")
	}
}

func TestStripTrigger(t *testing.T) {
	t.Parallel()
	got := StripTrigger("@vdp_intake_bot #тест body", "vdp_intake_bot")
	if got != "#тест body" {
		t.Fatalf("got %q", got)
	}
}
