package redact

import (
	"strings"
	"testing"
)

func TestTextMasksPII(t *testing.T) {
	t.Parallel()
	in := "mail user@example.com phone +7 999 123-45-67 inn ИНН 1234567890"
	out := Text(in)
	if strings.Contains(out, "user@example.com") || strings.Contains(out, "1234567890") {
		t.Fatalf("not redacted: %q", out)
	}
	if !strings.Contains(out, "[email]") || !strings.Contains(out, "[phone]") {
		t.Fatalf("missing markers: %q", out)
	}
}
