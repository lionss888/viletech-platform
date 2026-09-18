package knowledge

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const maxSourceBytes = 2 << 20 // 2 MiB

var allowExt = map[string]struct{}{
	".md":  {},
	".txt": {},
	".go":  {},
}

// ThreadMessage is a minimal chat line for SnapshotThread (avoids store import).
type ThreadMessage struct {
	From string
	Text string
}

// LoadedDoc is a source file payload before ingest.
type LoadedDoc struct {
	Path  string
	Title string
	Body  string
}

// LoadFile reads one text file (any extension) within size limit.
func LoadFile(path string) (body, title string, err error) {
	b, err := readFileLimited(path, maxSourceBytes)
	if err != nil {
		return "", "", err
	}
	title = strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))
	return string(b), title, nil
}

// LoadDir walks dir and loads allowlisted extensions (.md .txt .go).
func LoadDir(dir string) ([]LoadedDoc, error) {
	var out []LoadedDoc
	err := filepath.WalkDir(dir, func(path string, d os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() {
			return nil
		}
		ext := strings.ToLower(filepath.Ext(path))
		if _, ok := allowExt[ext]; !ok {
			return nil
		}
		body, title, err := LoadFile(path)
		if err != nil {
			return err
		}
		out = append(out, LoadedDoc{Path: path, Title: title, Body: body})
		return nil
	})
	if err != nil {
		return nil, err
	}
	return out, nil
}

// SnapshotThread builds a single text body from chat messages.
func SnapshotThread(msgs []ThreadMessage) (title, body string) {
	var b strings.Builder
	for _, m := range msgs {
		from := strings.TrimSpace(m.From)
		if from == "" {
			from = "user"
		}
		text := strings.TrimSpace(m.Text)
		if text == "" {
			continue
		}
		fmt.Fprintf(&b, "%s: %s\n", from, text)
	}
	return "thread-snapshot", strings.TrimSpace(b.String())
}

// VDPExport loads optional markdown exports from INTAKE_VDP_EXPORT_DIR (no shared DB).
func VDPExport() ([]LoadedDoc, error) {
	dir := strings.TrimSpace(os.Getenv("INTAKE_VDP_EXPORT_DIR"))
	if dir == "" {
		return nil, nil
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var out []LoadedDoc
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		if strings.ToLower(filepath.Ext(e.Name())) != ".md" {
			continue
		}
		path := filepath.Join(dir, e.Name())
		body, title, err := LoadFile(path)
		if err != nil {
			return nil, err
		}
		out = append(out, LoadedDoc{Path: path, Title: title, Body: body})
	}
	return out, nil
}
