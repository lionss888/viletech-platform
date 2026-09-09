package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/viletech/vdp/manager-ops/internal/store/file"
	"github.com/viletech/vdp/shared/managerops"
)

func main() {
	dataDir := flag.String("data-dir", "./.manager-ops-data", "MANAGER_OPS_DATA_DIR")
	outDir := flag.String("out", "./.manager-ops-export", "export output directory")
	sinceRaw := flag.String("since", "", "RFC3339 lower bound (optional)")
	flag.Parse()
	var since time.Time
	if *sinceRaw != "" {
		t, err := time.Parse(time.RFC3339, *sinceRaw)
		if err != nil {
			fatal(err)
		}
		since = t
	}
	st, err := file.New(*dataDir)
	if err != nil {
		fatal(err)
	}
	events, err := st.ListAllEvents(context.Background(), since)
	if err != nil {
		fatal(err)
	}
	if err := os.MkdirAll(*outDir, 0o750); err != nil {
		fatal(err)
	}
	outPath := filepath.Join(*outDir, "behavior.jsonl")
	f, err := os.Create(outPath)
	if err != nil {
		fatal(err)
	}
	defer f.Close()
	enc := json.NewEncoder(f)
	n := 0
	for _, e := range events {
		if err := managerops.ValidateExport(e); err != nil {
			continue
		}
		if err := enc.Encode(sanitize(e)); err != nil {
			fatal(err)
		}
		n++
	}
	manifest := map[string]any{
		"rows":     n,
		"since":    since.Format(time.RFC3339),
		"exported": time.Now().UTC().Format(time.RFC3339),
		"out":      outPath,
	}
	mb, _ := json.MarshalIndent(manifest, "", "  ")
	_ = os.WriteFile(filepath.Join(*outDir, "manifest.json"), mb, 0o640)
	fmt.Printf("exported %d behavior rows to %s\n", n, outPath)
}

func sanitize(e managerops.Event) managerops.Event {
	if e.Payload == nil {
		return e
	}
	clean := map[string]any{}
	for k, v := range e.Payload {
		if k == "text" || k == "message" || k == "body" {
			continue
		}
		clean[k] = v
	}
	e.Payload = clean
	return e
}

func fatal(err error) {
	fmt.Fprintf(os.Stderr, "export-behavior: %v\n", err)
	os.Exit(1)
}
