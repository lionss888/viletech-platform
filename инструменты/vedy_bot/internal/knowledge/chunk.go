package knowledge

import (
	"fmt"
	"strings"
	"unicode/utf8"
)

const defaultMaxRunes = 800

// ChunkText splits text by paragraphs and size into stable chunks with ids `{docID}:{i}`.
func ChunkText(docID, text string, maxRunes int) []Chunk {
	if maxRunes <= 0 {
		maxRunes = defaultMaxRunes
	}
	text = strings.TrimSpace(text)
	if text == "" {
		return nil
	}
	paras := splitParagraphs(text)
	var pieces []string
	for _, p := range paras {
		pieces = append(pieces, splitBySize(p, maxRunes)...)
	}
	out := make([]Chunk, 0, len(pieces))
	for i, piece := range pieces {
		out = append(out, Chunk{
			ID:    fmt.Sprintf("%s:%d", docID, i),
			DocID: docID,
			Index: i,
			Text:  piece,
		})
	}
	return out
}

func splitParagraphs(text string) []string {
	raw := strings.Split(text, "\n\n")
	out := make([]string, 0, len(raw))
	for _, p := range raw {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	if len(out) == 0 {
		return []string{text}
	}
	return out
}

func splitBySize(s string, maxRunes int) []string {
	if utf8.RuneCountInString(s) <= maxRunes {
		return []string{s}
	}
	runes := []rune(s)
	var out []string
	for len(runes) > 0 {
		n := maxRunes
		if n > len(runes) {
			n = len(runes)
		}
		// Prefer break at whitespace when not at end.
		if n < len(runes) {
			cut := n
			for cut > n/2 {
				if runes[cut-1] == ' ' || runes[cut-1] == '\n' || runes[cut-1] == '\t' {
					n = cut
					break
				}
				cut--
			}
		}
		piece := strings.TrimSpace(string(runes[:n]))
		if piece != "" {
			out = append(out, piece)
		}
		runes = runes[n:]
		for len(runes) > 0 && (runes[0] == ' ' || runes[0] == '\n' || runes[0] == '\t') {
			runes = runes[1:]
		}
	}
	return out
}
