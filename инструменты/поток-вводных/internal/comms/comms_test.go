package comms_test

import (
	"strings"
	"testing"

	"github.com/viletech/tools/intake/internal/comms"
)

func TestSanitizeManagerStripsTech(t *testing.T) {
	t.Parallel()
	in := "см. .cursor/plans/тгбот/card-1.md и make ci-pr https://github.com/x localhost:5173 класс=bug"
	out := comms.SanitizeManager(in)
	for _, bad := range []string{".cursor/plans", "make ci-pr", "github.com", "localhost", "класс="} {
		if strings.Contains(strings.ToLower(out), strings.ToLower(bad)) {
			t.Fatalf("still contains %q in %q", bad, out)
		}
	}
}

func TestProposalHasNoPaths(t *testing.T) {
	t.Parallel()
	out := comms.Proposal("исправить отображение статуса", "около 1–2 рабочих часов")
	if !strings.Contains(out, "выполнить?") {
		t.Fatalf("missing hitl question: %q", out)
	}
	if strings.Contains(out, ".cursor") || strings.Contains(out, "тгбот/") {
		t.Fatalf("tech leak: %q", out)
	}
}

func TestParseHitlDecision(t *testing.T) {
	t.Parallel()
	if got := comms.ParseHitlDecision("да"); got != comms.HitlApprove {
		t.Fatalf("approve got %q", got)
	}
	if got := comms.ParseHitlDecision("нет"); got != comms.HitlDecline {
		t.Fatalf("decline got %q", got)
	}
	if got := comms.ParseHitlDecision("нужно добавить кнопку оплаты в кабинет менеджера срочно"); got != comms.HitlNone {
		t.Fatalf("long text should not be decision, got %q", got)
	}
}
