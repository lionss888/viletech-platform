package pipeline

import (
	"bufio"
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/viletech/tools/intake/internal/store"
	"github.com/viletech/tools/intake/internal/telegram"
)

type fakeMsg struct {
	texts []string
}

func (f *fakeMsg) SendMessage(_ context.Context, _, _ int64, text string) error {
	f.texts = append(f.texts, text)
	return nil
}

func TestHandleMentionAckWithoutAnalyze(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	fm := &fakeMsg{}
	p := &Pipeline{
		Store:     store.New(home),
		Messenger: fm,
		ChatIDs:   map[int64]struct{}{-1004449173165: {}},
		BotUser:   "vdp_intake_bot",
	}
	u := telegram.Update{
		UpdateID: 10,
		Message: &telegram.Message{
			MessageID: 14,
			Text:      "@vdp_intake_bot #тест hello world for intake",
			Chat:      telegram.Chat{ID: -1004449173165},
			From:      &telegram.User{ID: 1, Username: "lev"},
			Entities:  []telegram.Entity{{Type: "mention", Offset: 0, Length: 15}},
		},
	}
	ok, err := p.HandleUpdate(context.Background(), u)
	if err != nil || !ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}
	if len(fm.texts) != 1 || fm.texts[0] != "принято" {
		t.Fatalf("ack=%v", fm.texts)
	}
	ok, err = p.HandleUpdate(context.Background(), u)
	if err != nil || ok {
		t.Fatalf("dedupe want false got ok=%v err=%v", ok, err)
	}
}

func TestHandleWithAnalyzeLowQuestion(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	fm := &fakeMsg{}
	p := &Pipeline{
		Store:       store.New(home),
		Messenger:   fm,
		ChatIDs:     map[int64]struct{}{-100: {}},
		BotUser:     "vdp_intake_bot",
		WithAnalyze: true,
	}
	u := telegram.Update{
		UpdateID: 11,
		Message: &telegram.Message{
			MessageID: 1,
			Text:      "@vdp_intake_bot ок",
			Chat:      telegram.Chat{ID: -100},
			Entities:  []telegram.Entity{{Type: "mention", Offset: 0, Length: 15}},
		},
	}
	ok, err := p.HandleUpdate(context.Background(), u)
	if err != nil || !ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}
	if len(fm.texts) != 1 || !strings.Contains(fm.texts[0], "принято") || !strings.Contains(fm.texts[0], "Уточните") {
		t.Fatalf("reply=%q", fm.texts)
	}
	if strings.Count(fm.texts[0], "?") < 1 {
		t.Fatalf("want one clarify question, reply=%q", fm.texts[0])
	}
	day := time.Now().UTC().Format("2006-01-02")
	path := filepath.Join(home, "inbox", day+".jsonl")
	f, err := os.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	if !sc.Scan() {
		t.Fatal("empty inbox")
	}
	var rec store.Record
	if err := json.Unmarshal(sc.Bytes(), &rec); err != nil {
		t.Fatal(err)
	}
	if rec.Kind != "clarify" || rec.Confidence != "low" {
		t.Fatalf("want kind=clarify low, got kind=%s conf=%s", rec.Kind, rec.Confidence)
	}
}
