package store

import (
	"os"
	"path/filepath"
	"testing"
)

func TestSeenAndInbox(t *testing.T) {
	home := t.TempDir()
	st := New(home)
	ok, err := st.Seen(1)
	if err != nil || ok {
		t.Fatalf("seen=%v err=%v", ok, err)
	}
	if err := st.MarkSeen(1); err != nil {
		t.Fatal(err)
	}
	ok, err = st.Seen(1)
	if err != nil || !ok {
		t.Fatalf("seen after mark=%v err=%v", ok, err)
	}
	if err := st.AppendInbox(Record{UpdateID: 1, MessageID: 2, ChatID: -100, Trigger: "mention", Text: "x"}); err != nil {
		t.Fatal(err)
	}
	entries, err := os.ReadDir(filepath.Join(home, "inbox"))
	if err != nil || len(entries) != 1 {
		t.Fatalf("inbox entries=%v err=%v", entries, err)
	}
}
