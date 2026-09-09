package conflict_test

import (
	"testing"

	"github.com/viletech/tools/intake/internal/conflict"
)

func TestDetectTagVsText(t *testing.T) {
	t.Parallel()
	f := conflict.Detect("change", []string{"#баг"}, "нужно добавить новую кнопку в кабинет", nil)
	if len(f) == 0 {
		t.Fatal("expected conflict")
	}
	if f[0].Question == "" {
		t.Fatal("want one question")
	}
}

func TestDetectNegation(t *testing.T) {
	t.Parallel()
	f := conflict.Detect("change", nil, "не делать это", []string{"нужно сделать отчёт по статусам"})
	if len(f) == 0 {
		t.Fatal("expected negation conflict")
	}
}
