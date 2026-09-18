package stand

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// Action is an allowlisted stand command.
type Action string

const (
	ActionAlphaStatus Action = "alpha-status"
	ActionAlphaSmoke  Action = "alpha-smoke"
	ActionGateFast    Action = "gate-fast"
	ActionNotifyGate  Action = "notify-gate"
)

// Job is a stand check run.
type Job struct {
	ID        string `json:"id"`
	Action    string `json:"action"`
	Status    string `json:"status"` // queued|running|done|error
	Cmd       string `json:"cmd,omitempty"`
	LogPath   string `json:"log_path,omitempty"`
	Error     string `json:"error,omitempty"`
	Output    string `json:"output,omitempty"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
	DryRun    bool   `json:"dry_run,omitempty"`
}

// Runner executes allowlisted vdp make / notify commands.
type Runner struct {
	VDPRoot string // path to vdp/
	Home    string // job store under Home/stand/
	DryRun  bool
	mu      sync.Mutex
}

// AllowedActions returns operator-visible allowlist.
func AllowedActions() []Action {
	return []Action{ActionAlphaStatus, ActionAlphaSmoke, ActionGateFast, ActionNotifyGate}
}

func (r *Runner) resolve(action Action) (dir, name string, args []string, err error) {
	root := strings.TrimSpace(r.VDPRoot)
	if root == "" {
		return "", "", nil, fmt.Errorf("VDP root not configured (INTAKE_VDP_ROOT)")
	}
	switch action {
	case ActionAlphaStatus:
		return root, "make", []string{"-C", root, "check-env-parity"}, nil
	case ActionAlphaSmoke:
		return root, "make", []string{"-C", root, "ci-pr-fast"}, nil
	case ActionGateFast:
		return root, "make", []string{"-C", root, "ci-pr-fast"}, nil
	case ActionNotifyGate:
		script := filepath.Join(root, "scripts", "notify-mgmt.sh")
		return root, "bash", []string{script, "--kind", "gate", "--title", "stand-check", "--body", "vedy_bot stand gate"}, nil
	default:
		return "", "", nil, fmt.Errorf("action not allowed: %s", action)
	}
}

// Start runs an allowlisted action asynchronously.
func (r *Runner) Start(action Action) (*Job, error) {
	dir, bin, args, err := r.resolve(action)
	if err != nil {
		return nil, err
	}
	id := fmt.Sprintf("stand-%d", time.Now().UnixNano())
	now := time.Now().UTC().Format(time.RFC3339)
	job := &Job{
		ID:        id,
		Action:    string(action),
		Status:    "queued",
		Cmd:       bin + " " + strings.Join(args, " "),
		CreatedAt: now,
		UpdatedAt: now,
		DryRun:    r.DryRun || envDry(),
	}
	if err := r.save(job); err != nil {
		return nil, err
	}
	go r.run(job, dir, bin, args)
	return job, nil
}

func envDry() bool {
	v := strings.TrimSpace(os.Getenv("INTAKE_STAND_DRY_RUN"))
	return v == "1" || strings.EqualFold(v, "true")
}

func (r *Runner) run(job *Job, dir, bin string, args []string) {
	job.Status = "running"
	job.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	_ = r.save(job)
	logPath := filepath.Join(r.home(), "logs", job.ID+".log")
	_ = os.MkdirAll(filepath.Dir(logPath), 0o700)
	job.LogPath = logPath
	if job.DryRun {
		msg := "dry-run: " + job.Cmd
		_ = os.WriteFile(logPath, []byte(msg+"\n"), 0o600)
		job.Status = "done"
		job.Output = msg
		job.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
		_ = r.save(job)
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Minute)
	defer cancel()
	cmd := exec.CommandContext(ctx, bin, args...)
	cmd.Dir = dir
	var buf bytes.Buffer
	cmd.Stdout = &buf
	cmd.Stderr = &buf
	err := cmd.Run()
	out := truncate(buf.String(), 8000)
	_ = os.WriteFile(logPath, []byte(out), 0o600)
	job.Output = truncate(out, 2000)
	job.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	if err != nil {
		job.Status = "error"
		job.Error = err.Error()
	} else {
		job.Status = "done"
	}
	_ = r.save(job)
}

// Get loads a job.
func (r *Runner) Get(id string) (*Job, error) {
	path := filepath.Join(r.home(), "jobs", id+".json")
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var job Job
	if err := json.Unmarshal(b, &job); err != nil {
		return nil, err
	}
	return &job, nil
}

// ManagerStatus returns a sanitized one-liner (no paths/cmds).
func ManagerStatus(job *Job) string {
	if job == nil {
		return "Статус проверки недоступен."
	}
	switch job.Status {
	case "queued", "running":
		return "Проверка стенда выполняется."
	case "done":
		return "Проверка стенда завершена успешно."
	case "error":
		return "Проверка стенда завершилась с ошибкой. Детали — у оператора."
	default:
		return "Статус проверки: " + job.Status
	}
}

func (r *Runner) home() string {
	h := strings.TrimSpace(r.Home)
	if h == "" {
		h = filepath.Join(os.TempDir(), "vedy_bot_stand")
	}
	return filepath.Join(h, "stand")
}

func (r *Runner) save(job *Job) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	dir := filepath.Join(r.home(), "jobs")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	b, err := json.MarshalIndent(job, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(dir, job.ID+".json"), b, 0o600)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
