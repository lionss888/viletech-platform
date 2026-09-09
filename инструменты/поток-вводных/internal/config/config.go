package config

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// Config holds intake runtime settings.
type Config struct {
	Token          string
	ChatIDs        map[int64]struct{}
	Home           string
	BotUsername    string
	HTTPTimeout    time.Duration
	PollTimeoutSec int
}

// Load reads env and optional INTAKE_HOME/env or ~/.vdp-intake/env.
func Load() (Config, error) {
	home := strings.TrimSpace(os.Getenv("INTAKE_HOME"))
	if home == "" {
		home = filepath.Join(os.Getenv("HOME"), ".vdp-intake")
	}
	envFile := filepath.Join(home, "env")
	if f := strings.TrimSpace(os.Getenv("INTAKE_ENV_FILE")); f != "" {
		envFile = f
	}
	_ = loadEnvFile(envFile)

	token := strings.TrimSpace(firstNonEmpty(
		os.Getenv("TELEGRAM_INTAKE_TOKEN"),
		os.Getenv("MGMT_NOTIFY_TOKEN"),
	))
	if token == "" {
		return Config{}, fmt.Errorf("TELEGRAM_INTAKE_TOKEN required")
	}
	chatRaw := strings.TrimSpace(firstNonEmpty(
		os.Getenv("TELEGRAM_INTAKE_CHAT_IDS"),
		os.Getenv("MGMT_NOTIFY_CHAT_ID"),
	))
	chats, err := parseChatIDs(chatRaw)
	if err != nil {
		return Config{}, err
	}
	if len(chats) == 0 {
		return Config{}, fmt.Errorf("TELEGRAM_INTAKE_CHAT_IDS required")
	}
	bot := strings.TrimPrefix(strings.TrimSpace(os.Getenv("TELEGRAM_INTAKE_BOT_USERNAME")), "@")
	if bot == "" {
		bot = "vdp_intake_bot"
	}
	timeoutMS, _ := strconv.Atoi(envOr("HTTP_TIMEOUT_MS", "15000"))
	if timeoutMS <= 0 {
		timeoutMS = 15000
	}
	pollSec, _ := strconv.Atoi(envOr("TELEGRAM_POLL_TIMEOUT_SEC", "25"))
	if pollSec <= 0 {
		pollSec = 25
	}
	return Config{
		Token:          token,
		ChatIDs:        chats,
		Home:           home,
		BotUsername:    bot,
		HTTPTimeout:    time.Duration(timeoutMS) * time.Millisecond,
		PollTimeoutSec: pollSec,
	}, nil
}

func parseChatIDs(raw string) (map[int64]struct{}, error) {
	out := map[int64]struct{}{}
	for _, part := range strings.Split(raw, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		id, err := strconv.ParseInt(part, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("invalid chat_id %q", part)
		}
		out[id] = struct{}{}
	}
	return out, nil
}

func loadEnvFile(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") || !strings.Contains(line, "=") {
			continue
		}
		k, v, _ := strings.Cut(line, "=")
		k = strings.TrimSpace(k)
		v = strings.TrimSpace(v)
		v = strings.Trim(v, `"'`)
		if k == "" {
			continue
		}
		if os.Getenv(k) == "" {
			_ = os.Setenv(k, v)
		}
	}
	return sc.Err()
}

func envOr(k, def string) string {
	if v := strings.TrimSpace(os.Getenv(k)); v != "" {
		return v
	}
	return def
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}
