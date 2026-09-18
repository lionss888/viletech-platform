package knowledge

import (
	"context"
	"hash/fnv"
	"strings"
	"unicode"
)

const mockDims = 64

// MockEmbedder returns deterministic bag-of-tokens vectors for tests.
type MockEmbedder struct {
	Dims int
}

// Embed maps each text to a stable float32 vector from token hashes.
func (m *MockEmbedder) Embed(_ context.Context, texts []string) ([][]float32, error) {
	dims := m.Dims
	if dims <= 0 {
		dims = mockDims
	}
	out := make([][]float32, len(texts))
	for i, t := range texts {
		out[i] = bagVector(t, dims)
	}
	return out, nil
}

func bagVector(s string, dims int) []float32 {
	v := make([]float32, dims)
	tokens := splitTokens(s)
	if len(tokens) == 0 {
		tokens = []string{s}
	}
	for _, tok := range tokens {
		h := fnv.New32a()
		_, _ = h.Write([]byte(tok))
		idx := int(h.Sum32()) % dims
		if idx < 0 {
			idx = -idx
		}
		v[idx] += 1
		// second feature for collision resistance
		idx2 := int(h.Sum32()>>8) % dims
		if idx2 < 0 {
			idx2 = -idx2
		}
		v[idx2] += 0.5
	}
	var sum float64
	for _, x := range v {
		sum += float64(x * x)
	}
	if sum > 0 {
		inv := float32(1 / sqrt(sum))
		for i := range v {
			v[i] *= inv
		}
	}
	return v
}

func splitTokens(s string) []string {
	s = strings.ToLower(s)
	var out []string
	var cur strings.Builder
	flush := func() {
		if cur.Len() >= 2 {
			out = append(out, cur.String())
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

func sqrt(x float64) float64 {
	if x <= 0 {
		return 0
	}
	z := x
	for i := 0; i < 12; i++ {
		z = 0.5 * (z + x/z)
	}
	return z
}
