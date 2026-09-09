package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseChatIDs(t *testing.T) {
	t.Parallel()
	m, err := parseChatIDs("-1004449173165, -1")
	if err != nil || len(m) != 2 {
		t.Fatalf("m=%v err=%v", m, err)
	}
	if _, ok := m[-1004449173165]; !ok {
		t.Fatal("missing super group id")
	}
}

func TestLoadFromEnvFile(t *testing.T) {
	dir := t.TempDir()
	envPath := filepath.Join(dir, "env")
	content := "TELEGRAM_INTAKE_TOKEN=test-token-123\nTELEGRAM_INTAKE_CHAT_IDS=-1004449173165\n"
	if err := os.WriteFile(envPath, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("INTAKE_HOME", dir)
	t.Setenv("TELEGRAM_INTAKE_TOKEN", "")
	t.Setenv("TELEGRAM_INTAKE_CHAT_IDS", "")
	t.Setenv("MGMT_NOTIFY_TOKEN", "")
	t.Setenv("MGMT_NOTIFY_CHAT_ID", "")
	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Token != "test-token-123" {
		t.Fatalf("token=%q", cfg.Token)
	}
	if _, ok := cfg.ChatIDs[-1004449173165]; !ok {
		t.Fatal("chat missing")
	}
}
