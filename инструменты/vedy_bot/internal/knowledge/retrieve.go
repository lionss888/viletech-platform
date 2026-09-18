package knowledge

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"
	"unicode"
	"unicode/utf8"
)

const defaultPackBudget = 6000
const keywordBoostWeight = 0.15

// CosineRetriever embeds the query and ranks stored vectors by cosine (+ keyword boost).
type CosineRetriever struct {
	Embedder Embedder
	Store    Store
	// KeywordBoost enables secondary lexical boost (default true when nil ptr unused — always on).
	KeywordBoost bool
	// PackBudget limits Format() runes; 0 → default.
	PackBudget int
}

// Search returns topN chunks as a ContextPack. Embedder failures are returned (no silent FTS).
func (r *CosineRetriever) Search(ctx context.Context, query string, topN int) (ContextPack, error) {
	if r == nil || r.Embedder == nil || r.Store == nil {
		return ContextPack{}, fmt.Errorf("retriever not configured")
	}
	q := strings.TrimSpace(query)
	if q == "" {
		return ContextPack{}, fmt.Errorf("query required")
	}
	if topN <= 0 {
		topN = 5
	}
	vecs, err := r.Embedder.Embed(ctx, []string{q})
	if err != nil {
		return ContextPack{}, err
	}
	if len(vecs) == 0 || len(vecs[0]) == 0 {
		return ContextPack{}, fmt.Errorf("empty query embedding")
	}
	qVec := vecs[0]
	stored, err := r.Store.LoadVectors(ctx)
	if err != nil {
		return ContextPack{}, err
	}
	chunks, err := r.Store.ListChunks(ctx)
	if err != nil {
		return ContextPack{}, err
	}
	chunkByID := map[string]Chunk{}
	for _, c := range chunks {
		chunkByID[c.ID] = c
	}
	type scored struct {
		chunk Chunk
		score float64
	}
	qTokens := tokenize(q)
	var ranked []scored
	for _, vr := range stored {
		sim := cosine(qVec, vr.Embedding)
		text := vr.Text
		c, ok := chunkByID[vr.ChunkID]
		if ok {
			if text == "" {
				text = c.Text
			}
		} else if text == "" {
			continue
		} else {
			c = Chunk{ID: vr.ChunkID, DocID: vr.DocID, Text: text}
		}
		if text == "" {
			c.Text = text
		}
		score := sim
		if r.KeywordBoost {
			score += keywordBoostWeight * keywordOverlap(qTokens, tokenize(c.Text))
		}
		ranked = append(ranked, scored{chunk: c, score: score})
	}
	sort.Slice(ranked, func(i, j int) bool {
		if ranked[i].score == ranked[j].score {
			return ranked[i].chunk.ID < ranked[j].chunk.ID
		}
		return ranked[i].score > ranked[j].score
	})
	if len(ranked) > topN {
		ranked = ranked[:topN]
	}
	pack := ContextPack{
		Summary:   fmt.Sprintf("Retrieved %d knowledge chunk(s) for query", len(ranked)),
		Chunks:    make([]Chunk, 0, len(ranked)),
		Citations: make([]string, 0, len(ranked)),
		Scores:    make([]float64, 0, len(ranked)),
	}
	for _, s := range ranked {
		pack.Chunks = append(pack.Chunks, s.chunk)
		cite := s.chunk.ID
		if s.chunk.DocID != "" {
			cite = s.chunk.DocID + "#" + s.chunk.ID
		}
		pack.Citations = append(pack.Citations, cite)
		pack.Scores = append(pack.Scores, s.score)
	}
	return pack, nil
}

// Format renders the pack for prompts, truncated to PackBudget / default rune budget.
func (p ContextPack) Format() string {
	return p.FormatBudget(defaultPackBudget)
}

// FormatBudget renders with an explicit rune limit.
func (p ContextPack) FormatBudget(maxRunes int) string {
	if maxRunes <= 0 {
		maxRunes = defaultPackBudget
	}
	var b strings.Builder
	if p.Summary != "" {
		b.WriteString(p.Summary)
		b.WriteString("\n\n")
	}
	for i, c := range p.Chunks {
		cite := ""
		if i < len(p.Citations) {
			cite = p.Citations[i]
		} else {
			cite = c.ID
		}
		score := ""
		if i < len(p.Scores) {
			score = fmt.Sprintf(" score=%.3f", p.Scores[i])
		}
		block := fmt.Sprintf("[%s]%s\n%s\n\n", cite, score, c.Text)
		next := b.String() + block
		if utf8.RuneCountInString(next) > maxRunes {
			remain := maxRunes - utf8.RuneCountInString(b.String())
			if remain <= 0 {
				break
			}
			runes := []rune(block)
			if remain > len(runes) {
				remain = len(runes)
			}
			b.WriteString(string(runes[:remain]))
			break
		}
		b.WriteString(block)
	}
	return strings.TrimSpace(b.String())
}

func cosine(a, b []float32) float64 {
	n := len(a)
	if len(b) < n {
		n = len(b)
	}
	if n == 0 {
		return 0
	}
	var dot, na, nb float64
	for i := 0; i < n; i++ {
		av := float64(a[i])
		bv := float64(b[i])
		dot += av * bv
		na += av * av
		nb += bv * bv
	}
	if na == 0 || nb == 0 {
		return 0
	}
	return dot / (math.Sqrt(na) * math.Sqrt(nb))
}

func tokenize(s string) map[string]struct{} {
	s = strings.ToLower(s)
	out := map[string]struct{}{}
	var cur strings.Builder
	flush := func() {
		if cur.Len() >= 2 {
			out[cur.String()] = struct{}{}
		}
		cur.Reset()
	}
	for _, r := range s {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			cur.WriteRune(r)
		} else {
			flush()
		}
	}
	flush()
	return out
}

func keywordOverlap(query, doc map[string]struct{}) float64 {
	if len(query) == 0 {
		return 0
	}
	var hit int
	for t := range query {
		if _, ok := doc[t]; ok {
			hit++
		}
	}
	return float64(hit) / float64(len(query))
}
