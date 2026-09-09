package card_test

import (
	"testing"
	"time"

	"github.com/viletech/tools/intake/internal/card"
)

func TestSaveGetAndDue(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	st := card.NewStore(home)
	now := time.Date(2026, 9, 9, 12, 0, 0, 0, time.UTC)
	c := &card.Card{
		ID:          "card-1-2",
		ChatID:      -100,
		Status:      card.StatusAwaitingApprove,
		Summary:     "test",
		LastAskAt:   now.Add(-2 * time.Hour),
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := st.Save(c); err != nil {
		t.Fatal(err)
	}
	got, err := st.Get("card-1-2")
	if err != nil || got.Status != card.StatusAwaitingApprove {
		t.Fatalf("got=%v err=%v", got, err)
	}
	due, err := st.ListDueReminders(now, time.Hour)
	if err != nil || len(due) != 1 {
		t.Fatalf("due=%v err=%v", due, err)
	}
}
