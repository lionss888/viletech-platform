package agent

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/viletech/tools/vedy_bot/internal/store"
)

func TestStartJobLocalAnalyze(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	st := store.New(home)
	_ = st.AppendThread(store.ThreadMsg{MessageID: 1, ChatID: 9, Direction: "in", Text: "need fix", FromUser: "u"})
	r := &Runner{Store: st, Workspace: home}
	job, err := r.StartJob("local_analyze", nil, "", "")
	if err != nil {
		t.Fatal(err)
	}
	got := waitJob(t, r, job.ID, "done")
	if !strings.Contains(got.Result, "Локальный разбор") {
		t.Fatalf("result=%q", got.Result)
	}
	if got.Error != "" {
		t.Fatalf("unexpected error %q", got.Error)
	}
	thread, _ := st.ListThreadRecent(20)
	found := false
	for _, m := range thread {
		if m.Direction == "agent" {
			found = true
		}
	}
	if !found {
		t.Fatal("expected agent mirror in thread")
	}
}

func TestAskAgentNoKeyIsError(t *testing.T) {
	home := t.TempDir()
	st := store.New(home)
	_ = st.AppendThread(store.ThreadMsg{MessageID: 1, ChatID: 9, Direction: "in", Text: "hi", FromUser: "u"})
	t.Setenv("CURSOR_API_KEY", "")
	r := &Runner{Store: st, Workspace: home, APIKey: ""}
	job, err := r.StartJob("ask_agent", nil, "что дальше?", "")
	if err != nil {
		t.Fatal(err)
	}
	got := waitJob(t, r, job.ID, "error")
	if got.Result != "" {
		t.Fatalf("expected empty result, got %q", got.Result)
	}
	if !strings.Contains(got.Error, "CURSOR_API_KEY") {
		t.Fatalf("error=%q", got.Error)
	}
	if strings.Contains(got.Result, "Локальный разбор") {
		t.Fatal("must not stub as success")
	}
}

func TestAnalyzeSelectedNoKeyIsError(t *testing.T) {
	home := t.TempDir()
	st := store.New(home)
	_ = st.AppendThread(store.ThreadMsg{MessageID: 1, Direction: "in", Text: "x", FromUser: "u"})
	t.Setenv("CURSOR_API_KEY", "")
	r := &Runner{Store: st, Workspace: home}
	job, err := r.StartJob("analyze_selected", []string{}, "", "")
	if err != nil {
		t.Fatal(err)
	}
	got := waitJob(t, r, job.ID, "error")
	if got.Status != "error" {
		t.Fatalf("status=%s", got.Status)
	}
}

func TestAskAgentBridgeFailIsError(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	st := store.New(home)
	_ = st.AppendThread(store.ThreadMsg{MessageID: 1, Direction: "in", Text: "x", FromUser: "u"})
	bridge := filepath.Join(home, "ask.mjs")
	if err := os.WriteFile(bridge, []byte("process.stderr.write('boom'); process.exit(2);\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	r := &Runner{Store: st, Workspace: home, APIKey: "key_test_not_real_xxxxxxxx", BridgeJS: bridge}
	job, err := r.StartJob("ask_agent", nil, "вопрос", "")
	if err != nil {
		t.Fatal(err)
	}
	got := waitJob(t, r, job.ID, "error")
	if got.Result != "" {
		t.Fatalf("result should be empty, got %q", got.Result)
	}
	if got.Error == "" {
		t.Fatal("expected error")
	}
}

func TestKnowledgePackFailIsError(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	st := store.New(home)
	r := &Runner{
		Store: st,
		Workspace: home,
		KnowledgePack: func(string) (string, error) {
			return "", os.ErrNotExist
		},
	}
	job, err := r.StartJobOpts("local_analyze", nil, "", "", true)
	if err != nil {
		t.Fatal(err)
	}
	got := waitJob(t, r, job.ID, "error")
	if !strings.Contains(got.Error, "knowledge") {
		t.Fatalf("error=%q", got.Error)
	}
}

func waitJob(t *testing.T, r *Runner, id, want string) *Job {
	t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		got, err := r.GetJob(id)
		if err != nil {
			t.Fatal(err)
		}
		if got.Status == want || (want == "done" && got.Status == "done") || (want == "error" && got.Status == "error") {
			if got.Status == want {
				return got
			}
		}
		if got.Status == "done" || got.Status == "error" {
			if got.Status != want {
				t.Fatalf("want status %s got %+v", want, got)
			}
			return got
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatalf("timeout waiting for %s", want)
	return nil
}
