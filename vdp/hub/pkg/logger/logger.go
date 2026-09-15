package logger

import (
	"context"
	"log/slog"
	"os"
)

type ctxKey string

const (
	keyEventID       ctxKey = "event_id"
	keyFormPaymentID ctxKey = "form_payment_id"
)

func New(level string) *slog.Logger {
	var lvl slog.Level
	switch level {
	case "debug":
		lvl = slog.LevelDebug
	case "warn":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: lvl}))
}

// WithEventID stores a correlation event id on ctx for FromContext.
func WithEventID(ctx context.Context, eventID string) context.Context {
	return context.WithValue(ctx, keyEventID, eventID)
}

// WithFormPaymentID stores the form-payment id on ctx for structured logs.
func WithFormPaymentID(ctx context.Context, formPaymentID string) context.Context {
	return context.WithValue(ctx, keyFormPaymentID, formPaymentID)
}

// FromContext returns base with event_id / form_payment_id attrs when present.
func FromContext(ctx context.Context, base *slog.Logger) *slog.Logger {
	if base == nil {
		base = slog.Default()
	}
	attrs := make([]any, 0, 4)
	if v, ok := ctx.Value(keyEventID).(string); ok && v != "" {
		attrs = append(attrs, "event_id", v)
	}
	if v, ok := ctx.Value(keyFormPaymentID).(string); ok && v != "" {
		attrs = append(attrs, "form_payment_id", v)
	}
	if len(attrs) == 0 {
		return base
	}
	return base.With(attrs...)
}
