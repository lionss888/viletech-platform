package httpapi_test

import (
	"bytes"
	"context"
	"log/slog"
	"strings"
	"testing"

	"github.com/viletech/vdp/core/pkg/logger"
)

// TestLoggerContextCorrelation verifies the logger.FromContext helper properly extracts
// correlation fields from context. This is the Phase 4 verification that context-based
// correlation logging works as designed for money path observability.
func TestLoggerContextCorrelation(t *testing.T) {
	logBuf := &bytes.Buffer{}
	testLog := slog.New(slog.NewJSONHandler(logBuf, &slog.HandlerOptions{Level: slog.LevelInfo}))

	t.Run("WithFormPaymentID adds field to logs", func(t *testing.T) {
		logBuf.Reset()
		ctx := logger.WithFormPaymentID(context.Background(), "form-123")
		log := logger.FromContext(ctx, testLog)
		log.Info("test message")

		logOutput := logBuf.String()
		if !strings.Contains(logOutput, `"form_payment_id":"form-123"`) {
			t.Errorf("Expected form_payment_id in log output, got: %s", logOutput)
		}
	})

	t.Run("WithRequestID adds field to logs", func(t *testing.T) {
		logBuf.Reset()
		ctx := logger.WithRequestID(context.Background(), "req-456")
		log := logger.FromContext(ctx, testLog)
		log.Info("test message")

		logOutput := logBuf.String()
		if !strings.Contains(logOutput, `"request_id":"req-456"`) {
			t.Errorf("Expected request_id in log output, got: %s", logOutput)
		}
	})

	t.Run("Both correlation fields together", func(t *testing.T) {
		logBuf.Reset()
		ctx := context.Background()
		ctx = logger.WithRequestID(ctx, "req-789")
		ctx = logger.WithFormPaymentID(ctx, "form-789")
		log := logger.FromContext(ctx, testLog)
		log.Info("test message")

		logOutput := logBuf.String()
		if !strings.Contains(logOutput, `"request_id":"req-789"`) {
			t.Error("Expected request_id in log output")
		}
		if !strings.Contains(logOutput, `"form_payment_id":"form-789"`) {
			t.Error("Expected form_payment_id in log output")
		}
	})
}
