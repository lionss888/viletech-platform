package logger_test

import (
	"context"
	"testing"

	"github.com/viletech/vdp/core/pkg/logger"
)

func TestWithFormPaymentID(t *testing.T) {
	t.Parallel()
	ctx := logger.WithFormPaymentID(context.Background(), "form-9")
	log := logger.FromContext(ctx, logger.New("error"))
	if log == nil {
		t.Fatal("logger")
	}
}
