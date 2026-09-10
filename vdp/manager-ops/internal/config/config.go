package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds runtime settings for manager-ops.
type Config struct {
	Addr            string
	CoreURL         string
	HubSharedSecret string
	TelegramToken   string
	DataDir         string
	HTTPTimeout     time.Duration
	AllowlistChats  []string
}

// FromEnv loads config from environment.
func FromEnv() Config {
	timeoutMS, _ := strconv.Atoi(env("HTTP_TIMEOUT_MS", "5000"))
	if timeoutMS <= 0 {
		timeoutMS = 5000
	}
	return Config{
		Addr:            env("PORT", "8094"),
		CoreURL:         strings.TrimRight(strings.TrimSpace(os.Getenv("CORE_URL")), "/"),
		HubSharedSecret: os.Getenv("HUB_SHARED_SECRET"),
		TelegramToken:   os.Getenv("TELEGRAM_BOT_TOKEN"),
		DataDir:         env("MANAGER_OPS_DATA_DIR", "/var/lib/manager-ops"),
		HTTPTimeout:     time.Duration(timeoutMS) * time.Millisecond,
		AllowlistChats:  splitCSV(os.Getenv("MANAGER_OPS_CHAT_IDS")),
	}
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func splitCSV(s string) []string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
