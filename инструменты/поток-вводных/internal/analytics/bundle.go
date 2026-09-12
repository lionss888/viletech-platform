package analytics

import (
	"github.com/viletech/tools/intake/internal/analyze"
	"github.com/viletech/tools/intake/internal/conflict"
	"github.com/viletech/tools/intake/internal/estimate"
	"github.com/viletech/tools/intake/internal/normalize"
)

// ConflictItem is one plain-language contradiction on the analytics boundary.
type ConflictItem struct {
	Plain    string `json:"plain"`
	Question string `json:"question,omitempty"`
}

// EstimateView is the calendar heuristic exposed to cards/API/planfile.
type EstimateView struct {
	Todos         int     `json:"todos"`
	Hours         float64 `json:"hours"`
	ManagerPhrase string  `json:"manager_phrase"`
	EngineerNote  string  `json:"engineer_note,omitempty"`
}

// Bundle is the single in-process analytics contract (pipeline → card / plan / API).
// Not a separate service: package boundary only.
type Bundle struct {
	Class      string         `json:"class"`
	Confidence string         `json:"confidence"`
	Summary    string         `json:"summary"`
	Tags       []string       `json:"tags,omitempty"`
	Question   string         `json:"question,omitempty"`
	Chars      int            `json:"chars"`
	Words      int            `json:"words"`
	Conflicts  []ConflictItem `json:"conflicts,omitempty"`
	Estimate   EstimateView   `json:"estimate"`
}

// Run builds the analytics bundle from raw intake text (trigger still stripped inside Analyze).
func Run(raw, bot string) Bundle {
	a := analyze.Analyze(raw, bot)
	body := normalize.StripTrigger(raw, bot)
	findings := conflict.Detect(a.Class, a.Tags, body, nil)
	est := estimate.FromSignals(a.Class, a.Chars, a.Words, raw)
	out := Bundle{
		Class:      a.Class,
		Confidence: string(a.Confidence),
		Summary:    a.Summary,
		Tags:       a.Tags,
		Question:   a.Question,
		Chars:      a.Chars,
		Words:      a.Words,
		Estimate: EstimateView{
			Todos:         est.Todos,
			Hours:         est.Hours,
			ManagerPhrase: est.ManagerPhrase,
			EngineerNote:  est.EngineerNote,
		},
	}
	for _, f := range findings {
		out.Conflicts = append(out.Conflicts, ConflictItem{Plain: f.Plain, Question: f.Question})
	}
	return out
}

// AnalyzeResult projects Bundle back to analyze.Result for legacy call sites.
func (b Bundle) AnalyzeResult() analyze.Result {
	return analyze.Result{
		Class:      b.Class,
		Confidence: analyze.Confidence(b.Confidence),
		Chars:      b.Chars,
		Words:      b.Words,
		Tags:       b.Tags,
		Summary:    b.Summary,
		Question:   b.Question,
	}
}

// ConflictPlains returns only plain conflict strings for card storage.
func (b Bundle) ConflictPlains() []string {
	out := make([]string, 0, len(b.Conflicts))
	for _, c := range b.Conflicts {
		out = append(out, c.Plain)
	}
	return out
}
