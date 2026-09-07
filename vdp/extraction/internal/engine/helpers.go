package engine

import (
	"encoding/json"
	"os"
	"path"
	"strings"
)

func mimeFor(mime, fileName string) string {
	if mime != "" {
		return mime
	}
	switch strings.ToLower(path.Ext(fileName)) {
	case ".pdf":
		return "application/pdf"
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	default:
		return "application/pdf"
	}
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

func collectOCRText(raw map[string]any) string {
	var b strings.Builder
	var walk func(any)
	walk = func(v any) {
		switch t := v.(type) {
		case map[string]any:
			if text, ok := t["text"].(string); ok && text != "" {
				if b.Len() > 0 {
					b.WriteByte('\n')
				}
				b.WriteString(text)
			}
			for _, child := range t {
				walk(child)
			}
		case []any:
			for _, child := range t {
				walk(child)
			}
		}
	}
	walk(raw)
	return b.String()
}

func collectCompletionText(raw map[string]any) string {
	if alt, ok := raw["result"].(map[string]any); ok {
		raw = alt
	}
	if alts, ok := raw["alternatives"].([]any); ok && len(alts) > 0 {
		if m, ok := alts[0].(map[string]any); ok {
			if msg, ok := m["message"].(map[string]any); ok {
				if text, ok := msg["text"].(string); ok {
					return text
				}
			}
			if text, ok := m["text"].(string); ok {
				return text
			}
		}
	}
	b, _ := json.Marshal(raw)
	return string(b)
}

func extractJSONObject(s string) string {
	s = strings.TrimSpace(s)
	if i := strings.Index(s, "{"); i >= 0 {
		if j := strings.LastIndex(s, "}"); j > i {
			return s[i : j+1]
		}
	}
	return s
}

func osRead(p string) ([]byte, error) {
	return os.ReadFile(p)
}
