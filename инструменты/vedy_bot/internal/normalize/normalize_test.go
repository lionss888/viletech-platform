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

func TestRouteOfMatrix(t *testing.T) {
	t.Parallel()
	cases := []struct {
		trig Trigger
		want Route
		hitl bool
	}{
		{TriggerNone, RouteThreadOnly, false},
		{TriggerHelp, RouteHelp, false},
		{TriggerMention, RouteIntake, true},
		{TriggerVvod, RouteIntake, true},
	}
	for _, tc := range cases {
		if got := RouteOf(tc.trig); got != tc.want {
			t.Fatalf("RouteOf(%q)=%q want %q", tc.trig, got, tc.want)
		}
		if CreatesHITLCard(tc.trig) != tc.hitl {
			t.Fatalf("CreatesHITLCard(%q)=%v want %v", tc.trig, CreatesHITLCard(tc.trig), tc.hitl)
		}
	}
}
