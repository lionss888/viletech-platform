package logger

import (
	"bytes"
	"context"
	"log/slog"
	"strings"
	"testing"
)

// TestWithFormPaymentID verifies context-based form_payment_id correlation.
func TestWithFormPaymentID(t *testing.T) {
	logBuf := &bytes.Buffer{}
	testLog := slog.New(slog.NewJSONHandler(logBuf, &slog.HandlerOptions{Level: slog.LevelInfo}))

	ctx := WithFormPaymentID(context.Background(), "form-123")
	log := FromContext(ctx, testLog)
	log.Info("test message")

	logOutput := logBuf.String()
	if !strings.Contains(logOutput, `"form_payment_id":"form-123"`) {
		t.Errorf("Expected form_payment_id in log output, got: %s", logOutput)
	}
}

// TestWithEventID verifies context-based event_id correlation.
func TestWithEventID(t *testing.T) {
	logBuf := &bytes.Buffer{}
	testLog := slog.New(slog.NewJSONHandler(logBuf, &slog.HandlerOptions{Level: slog.LevelInfo}))

	ctx := WithEventID(context.Background(), "evt-456")
	log := FromContext(ctx, testLog)
	log.Info("test message")

	logOutput := logBuf.String()
	if !strings.Contains(logOutput, `"event_id":"evt-456"`) {
		t.Errorf("Expected event_id in log output, got: %s", logOutput)
	}
}

// TestBothCorrelationFields verifies both event_id and form_payment_id work together.
func TestBothCorrelationFields(t *testing.T) {
	logBuf := &bytes.Buffer{}
	testLog := slog.New(slog.NewJSONHandler(logBuf, &slog.HandlerOptions{Level: slog.LevelInfo}))

	ctx := context.Background()
	ctx = WithEventID(ctx, "evt-789")
	ctx = WithFormPaymentID(ctx, "form-789")
	log := FromContext(ctx, testLog)
	log.Info("test message")

	logOutput := logBuf.String()
	if !strings.Contains(logOutput, `"event_id":"evt-789"`) {
		t.Error("Expected event_id in log output")
	}
	if !strings.Contains(logOutput, `"form_payment_id":"form-789"`) {
		t.Error("Expected form_payment_id in log output")
	}
}

// TestFromContextWithoutFields verifies FromContext returns base logger when no fields present.
func TestFromContextWithoutFields(t *testing.T) {
	logBuf := &bytes.Buffer{}
	testLog := slog.New(slog.NewJSONHandler(logBuf, &slog.HandlerOptions{Level: slog.LevelInfo}))

	ctx := context.Background()
	log := FromContext(ctx, testLog)
	log.Info("test message")

	logOutput := logBuf.String()
	if !strings.Contains(logOutput, `"msg":"test message"`) {
		t.Error("Expected basic log message")
	}
	// Should not have correlation fields
	if strings.Contains(logOutput, `"event_id"`) {
		t.Error("Did not expect event_id in log output")
	}
	if strings.Contains(logOutput, `"form_payment_id"`) {
		t.Error("Did not expect form_payment_id in log output")
	}
}
