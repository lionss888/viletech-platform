package scenarioverify

import (
	"encoding/json"
	"testing"
)

func TestMemoryRunStoreListEmptyJSONArray(t *testing.T) {
	t.Parallel()
	store := NewMemoryRunStore()
	raw, err := json.Marshal(store.List(10))
	if err != nil {
		t.Fatal(err)
	}
	if string(raw) != "[]" {
		t.Fatalf("want [] got %s", raw)
	}
}
