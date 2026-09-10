package comms

import (
	"regexp"
	"strings"
)

var (
	reBrand = regexp.MustCompile(`(?i)\b(cursor(?:\s*ide)?|ollama|vitest|playwright|jest|pytest|golang|nodejs|typescript|nestjs?|mongo(?:db)?|postgres(?:ql)?|docker(?:\s*compose)?|kubernetes|k8s|gitlab|github|lovable|openai|anthropic|claude|chatgpt|botfather|make|npm)\b`)
	rePath  = regexp.MustCompile(`(?i)(?:^|\s)(?:\./|\.\./|/)?(?:\.cursor/plans/[^\s]+|~/?\.vdp-[^\s]+|[a-z0-9_.\-]+/[a-z0-9_./\-]+\.(?:go|md|yml|yaml|json|ts|tsx))`)
	reURL   = regexp.MustCompile(`(?i)https?://[^\s]+`)
	reLocal = regexp.MustCompile(`(?i)\blocalhost(?::\d+)?\b`)
	reCmd   = regexp.MustCompile(`(?i)\b(?:go\s+test|make\s+[\w.\-]+|npm\s+(?:test|ci|install)|docker\s+compose)\b`)
	reBack  = regexp.MustCompile("`[^`]+`")
	reClass = regexp.MustCompile(`(?i)класс\s*=\s*\S+`)
	rePlanID = regexp.MustCompile(`(?i)\b[a-z]+_[a-z0-9]+_[a-f0-9]{8}\b`)
	reOrgGate = regexp.MustCompile(`(?i)\borg-gate\b`)
	reDoD    = regexp.MustCompile(`(?i)\bDoD\b`)
)

// SanitizeManager strips technical surface from manager-facing text.
func SanitizeManager(s string) string {
	s = reURL.ReplaceAllString(s, "")
	s = reLocal.ReplaceAllString(s, "")
	s = rePath.ReplaceAllString(s, " ")
	s = reCmd.ReplaceAllString(s, "проверки")
	s = reBrand.ReplaceAllString(s, "")
	s = reBack.ReplaceAllString(s, "")
	s = reClass.ReplaceAllString(s, "")
	s = rePlanID.ReplaceAllString(s, "")
	s = reOrgGate.ReplaceAllString(s, "")
	s = reDoD.ReplaceAllString(s, "")
	s = strings.ReplaceAll(s, ".cursor/plans", "")
	s = strings.ReplaceAll(s, "тгбот/", "")
	s = collapseSpace(s)
	return strings.TrimSpace(s)
}

func collapseSpace(s string) string {
	var b strings.Builder
	prevSpace := false
	for _, r := range s {
		if r == ' ' || r == '\t' || r == '\n' || r == '\r' {
			if !prevSpace {
				b.WriteByte(' ')
				prevSpace = true
			}
			continue
		}
		prevSpace = false
		b.WriteRune(r)
	}
	return b.String()
}
