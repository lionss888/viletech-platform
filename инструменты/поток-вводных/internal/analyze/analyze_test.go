package analyze

import "testing"

func TestAnalyzeTestTagHigh(t *testing.T) {
	t.Parallel()
	r := Analyze("@vdp_intake_bot #тест на вход данные\n\nприми этот текст и проведи анализ сообщения для платформы", "vdp_intake_bot")
	if r.Class != "test" {
		t.Fatalf("class=%s", r.Class)
	}
	if r.Confidence == ConfidenceLow {
		t.Fatalf("expected not low, got %s summary=%s", r.Confidence, r.Summary)
	}
	if r.Question != "" {
		t.Fatalf("no question for clear test: %q", r.Question)
	}
	if r.Chars < 40 {
		t.Fatalf("chars=%d", r.Chars)
	}
}

func TestAnalyzeLowGetsOneQuestion(t *testing.T) {
	t.Parallel()
	r := Analyze("@vdp_intake_bot ок", "vdp_intake_bot")
	if r.Confidence != ConfidenceLow {
		t.Fatalf("want low got %s class=%s", r.Confidence, r.Class)
	}
	if r.Question == "" {
		t.Fatal("want one question")
	}
}
