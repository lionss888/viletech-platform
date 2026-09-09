package estimate_test

import (
	"strings"
	"testing"

	"github.com/viletech/tools/intake/internal/estimate"
)

func TestFromSignalsConcreteHours(t *testing.T) {
	t.Parallel()
	r := estimate.FromSignals("bug", 120, 20, "кнопка статуса не открывается в кабинете менеджера")
	if r.Todos < 1 || r.Hours <= 0 {
		t.Fatalf("bad estimate %#v", r)
	}
	if strings.TrimSpace(r.ManagerPhrase) == "" {
		t.Fatal("empty phrase")
	}
	if strings.Contains(r.ManagerPhrase, "todo") || strings.Contains(r.ManagerPhrase, "3.8") {
		t.Fatalf("manager phrase leaked formula: %q", r.ManagerPhrase)
	}
	if strings.Contains(r.ManagerPhrase, "половины") {
		t.Fatalf("want concrete hours, got vague band: %q", r.ManagerPhrase)
	}
}

func TestPlanOnlyRequestIsShort(t *testing.T) {
	t.Parallel()
	r := estimate.FromSignals("change", 80, 10, "@vdp_intake_bot сформируй план работ на основе результата")
	if r.Hours > 3 {
		t.Fatalf("plan-only should be short, hours=%v phrase=%q", r.Hours, r.ManagerPhrase)
	}
	if !strings.Contains(r.ManagerPhrase, "час") {
		t.Fatalf("want hour-scale phrase, got %q", r.ManagerPhrase)
	}
}

func TestHeavyPaymentLongerThanCopy(t *testing.T) {
	t.Parallel()
	light := estimate.FromSignals("change", 60, 12, "поправить копирайт кнопки Отправить")
	heavy := estimate.FromSignals("change", 60, 12, "добавить платёж провайдера и роли в кабинете с интеграцией банка")
	if heavy.Hours <= light.Hours {
		t.Fatalf("heavy=%v light=%v", heavy.Hours, light.Hours)
	}
}
