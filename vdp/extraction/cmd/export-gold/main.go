package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"

	"github.com/viletech/vdp/extraction/internal/gold"
	"github.com/viletech/vdp/shared/extraction"
)

func main() {
	goldDir := flag.String("gold-dir", "./.gold", "EXTRACTION_GOLD_DIR")
	outDir := flag.String("out", "./.export", "export output directory")
	testRatio := flag.Float64("test-ratio", 0.2, "fraction of forms for test split")
	flag.Parse()
	st := gold.NewStore(*goldDir)
	recs, err := st.List()
	if err != nil {
		fatal(err)
	}
	confirmed := make([]extraction.GoldRecord, 0)
	for _, r := range recs {
		if r.HumanOut != nil {
			confirmed = append(confirmed, r)
		}
	}
	byForm := map[string][]extraction.GoldRecord{}
	for _, r := range confirmed {
		byForm[r.FormPaymentID] = append(byForm[r.FormPaymentID], r)
	}
	forms := make([]string, 0, len(byForm))
	for id := range byForm {
		forms = append(forms, id)
	}
	sort.Strings(forms)
	nTest := int(float64(len(forms)) * *testRatio)
	if nTest < 1 && len(forms) > 1 {
		nTest = 1
	}
	testSet := map[string]bool{}
	for i := 0; i < nTest && i < len(forms); i++ {
		testSet[forms[i]] = true
	}
	if err := os.MkdirAll(*outDir, 0o750); err != nil {
		fatal(err)
	}
	trainPath := filepath.Join(*outDir, "train.jsonl")
	testPath := filepath.Join(*outDir, "test.jsonl")
	tf, err := os.Create(trainPath)
	if err != nil {
		fatal(err)
	}
	defer tf.Close()
	vf, err := os.Create(testPath)
	if err != nil {
		fatal(err)
	}
	defer vf.Close()
	encT := json.NewEncoder(tf)
	encV := json.NewEncoder(vf)
	trainN, testN := 0, 0
	for _, id := range forms {
		for _, rec := range byForm[id] {
			if testSet[id] {
				_ = encV.Encode(rec)
				testN++
			} else {
				_ = encT.Encode(rec)
				trainN++
			}
		}
	}
	manifest := map[string]any{
		"schema_version":    extraction.SchemaVersion,
		"confirmed_forms":   len(forms),
		"train_rows":        trainN,
		"test_rows":         testN,
		"min_confirms_hint": 100,
		"fields":            []string{"layout_text", "human_out", "primary_out", "shadow_out"},
		"sft_hint":          "Use layout_text as input and human_out as label for LoRA/SFT (Wave E)",
	}
	raw, _ := json.MarshalIndent(manifest, "", "  ")
	_ = os.WriteFile(filepath.Join(*outDir, "manifest.json"), raw, 0o640)
	fmt.Printf("export ok train=%d test=%d forms=%d -> %s\n", trainN, testN, len(forms), *outDir)
}

func fatal(err error) {
	fmt.Fprintf(os.Stderr, "export-gold: %v\n", err)
	os.Exit(1)
}
