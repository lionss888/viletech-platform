package store

import (
	"os"
	"path/filepath"
	"testing"
)

func TestListInboxAndMedia(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	s := New(home)
	if err := s.AppendInbox(Record{Text: "a", Kind: "intake"}); err != nil {
		t.Fatal(err)
	}
	if err := s.AppendInbox(Record{Text: "b", Kind: "intake"}); err != nil {
		t.Fatal(err)
	}
	recs, err := s.ListInboxRecent(10)
	if err != nil || len(recs) != 2 {
		t.Fatalf("recs=%v err=%v", recs, err)
	}
	att, err := s.SaveMedia("m1", "x.go", []byte("package x"))
	if err != nil {
		t.Fatal(err)
	}
	abs := s.AbsMediaPath(att.Path)
	b, err := os.ReadFile(abs)
	if err != nil || string(b) != "package x" {
		t.Fatalf("read %v %v", b, err)
	}
	if filepath.Base(abs) == "" {
		t.Fatal("empty base")
	}
}

func TestThreadAndAgentJob(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	s := New(home)
	if err := s.AppendThread(ThreadMsg{MessageID: 1, ChatID: 2, Direction: "in", Text: "hi", FromUser: "a"}); err != nil {
		t.Fatal(err)
	}
	if err := s.AppendThread(ThreadMsg{MessageID: 2, ChatID: 2, Direction: "out", Text: "ok", FromUser: "bot"}); err != nil {
		t.Fatal(err)
	}
	all, err := s.ListThreadRecent(10)
	if err != nil || len(all) != 2 {
		t.Fatalf("thread=%v err=%v", all, err)
	}
	got, err := s.GetThreadByIDs([]string{all[0].ID})
	if err != nil || len(got) != 1 || got[0].Text != "hi" {
		t.Fatalf("by id=%v err=%v", got, err)
	}
	if err := s.SaveAgentJob("job-1", map[string]string{"status": "done"}); err != nil {
		t.Fatal(err)
	}
	var m map[string]string
	if err := s.LoadAgentJob("job-1", &m); err != nil || m["status"] != "done" {
		t.Fatalf("job=%v err=%v", m, err)
	}
}
