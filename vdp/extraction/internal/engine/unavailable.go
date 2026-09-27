package engine

import (
	"context"
	"fmt"

	"github.com/viletech/vdp/shared/extraction"
)

// UnavailablePrimary always fails so Recognize can fall back or degrade honestly.
type UnavailablePrimary struct {
	Reason string
}

func (u UnavailablePrimary) Name() string { return extraction.EngineUnavailable }

func (u UnavailablePrimary) Extract(_ context.Context, _ Input) (extraction.Result, error) {
	reason := u.Reason
	if reason == "" {
		reason = "engine unavailable"
	}
	return extraction.Result{}, fmt.Errorf("%s: %s", extraction.EngineUnavailable, reason)
}
