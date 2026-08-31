package resilience_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/viletech/vdp/hub/internal/resilience"
)

func TestDoRetriesThenSucceeds(t *testing.T) {
	t.Parallel()
	n := 0
	err := resilience.Do(context.Background(), 3, time.Millisecond, func() error {
		n++
		if n < 2 {
			return errors.New("transient")
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if n != 2 {
		t.Fatalf("n=%d", n)
	}
}
