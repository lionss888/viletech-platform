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
