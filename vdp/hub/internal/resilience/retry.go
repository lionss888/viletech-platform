package resilience

import (
	"context"
	"fmt"
	"time"
)

func Do(ctx context.Context, attempts int, initial time.Duration, fn func() error) error {
	if attempts < 1 {
		attempts = 1
	}
	delay := initial
	var last error
	for i := 0; i < attempts; i++ {
		if err := ctx.Err(); err != nil {
			return err
		}
		last = fn()
		if last == nil {
			return nil
		}
		if i == attempts-1 {
			break
		}
		timer := time.NewTimer(delay)
		select {
		case <-ctx.Done():
			timer.Stop()
			return ctx.Err()
		case <-timer.C:
		}
		delay *= 2
	}
	return fmt.Errorf("retries exhausted: %w", last)
}
