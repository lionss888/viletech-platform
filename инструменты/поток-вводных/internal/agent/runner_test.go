package agent

import (
	"strings"
	"testing"
	"time"

	"github.com/viletech/tools/intake/internal/store"
)

func TestStartJobAnalyzeLocal(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	st := store.New(home)
	_ = st.AppendThread(store.ThreadMsg{MessageID: 1, ChatID: 9, Direction: "in", Text: "need fix", FromUser: "u"})
	r := &Runner{Store: st, Workspace: home}
	job, err := r.StartJob("analyze_selected", nil, "", "")
	if err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		got, err := r.GetJob(job.ID)
		if err != nil {
			t.Fatal(err)
		}
		if got.Status == "done" {
			if !strings.Contains(got.Result, "Локальный разбор") {
				t.Fatalf("result=%q", got.Result)
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
			return
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatal("timeout")
}
