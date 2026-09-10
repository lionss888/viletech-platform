package agent

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/viletech/tools/intake/internal/store"
)

// Job is an async agent request.
type Job struct {
	ID        string            `json:"id"`
	Status    string            `json:"status"` // queued|running|done|error
	Mode      string            `json:"mode"`   // analyze_selected|analyze_chat|ask_agent
	Prompt    string            `json:"prompt"`
	MessageIDs []string         `json:"message_ids,omitempty"`
	Result    string            `json:"result,omitempty"`
	Error     string            `json:"error,omitempty"`
	CreatedAt string            `json:"created_at"`
	UpdatedAt string            `json:"updated_at"`
}

// Runner executes agent jobs (local rule analyze and/or Cursor SDK bridge).
type Runner struct {
	Store     *store.Store
	Workspace string
	APIKey    string
	BridgeJS  string // path to ask.mjs; empty = auto near module
	NodeBin   string
}

// StartJob creates and runs a job in background.
func (r *Runner) StartJob(mode string, msgIDs []string, extra string) (*Job, error) {
	id := fmt.Sprintf("job-%d", time.Now().UnixNano())
	msgs, err := r.Store.GetThreadByIDs(msgIDs)
	if err != nil {
		return nil, err
	}
	if mode == "analyze_chat" || (mode == "analyze_selected" && len(msgs) == 0 && len(msgIDs) == 0) {
		all, err := r.Store.ListThreadRecent(300)
		if err != nil {
			return nil, err
		}
		msgs = all
	}
	prompt := buildPrompt(mode, msgs, extra)
	now := time.Now().UTC().Format(time.RFC3339)
	job := &Job{
		ID:         id,
		Status:     "queued",
		Mode:       mode,
		Prompt:     prompt,
		MessageIDs: msgIDs,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
	if err := r.Store.SaveAgentJob(id, job); err != nil {
		return nil, err
	}
	go r.run(job)
	return job, nil
}

func (r *Runner) run(job *Job) {
	job.Status = "running"
	job.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	_ = r.Store.SaveAgentJob(job.ID, job)

	var result string
	var err error
	switch job.Mode {
	case "ask_agent":
		result, err = r.runCursorAgent(context.Background(), job.Prompt)
		if err != nil {
			// Fallback local analysis so UI always gets something useful.
			fallback := localAnalyze(job.Prompt)
			job.Status = "done"
			job.Result = fallback + "\n\n---\nАгент IDE недоступен (" + err.Error() + "). Показан локальный разбор."
			job.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
			_ = r.Store.SaveAgentJob(job.ID, job)
			_ = r.mirrorAgentReply(job)
			return
		}
	default:
		result = localAnalyze(job.Prompt)
	}
	job.Status = "done"
	job.Result = result
	job.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	_ = r.Store.SaveAgentJob(job.ID, job)
	_ = r.mirrorAgentReply(job)
}

func (r *Runner) mirrorAgentReply(job *Job) error {
	if r.Store == nil || strings.TrimSpace(job.Result) == "" {
		return nil
	}
	return r.Store.AppendThread(store.ThreadMsg{
		MessageID: time.Now().UnixNano(),
		Direction: "agent",
		FromUser:  "agent",
		Text:      job.Result,
		Kind:      job.Mode,
	})
}

func (r *Runner) runCursorAgent(ctx context.Context, prompt string) (string, error) {
	key := strings.TrimSpace(r.APIKey)
	if key == "" {
		key = strings.TrimSpace(os.Getenv("CURSOR_API_KEY"))
	}
	if key == "" {
		return "", fmt.Errorf("нет CURSOR_API_KEY")
	}
	bridge := r.BridgeJS
	if bridge == "" {
		bridge = findBridge()
	}
	if bridge == "" {
		return "", fmt.Errorf("нет agent-bridge/ask.mjs")
	}
	node := r.NodeBin
	if node == "" {
		node = "node"
	}
	cwd := r.Workspace
	if cwd == "" {
		cwd = "."
	}
	ctx, cancel := context.WithTimeout(ctx, 8*time.Minute)
	defer cancel()
	cmd := exec.CommandContext(ctx, node, bridge)
	cmd.Dir = filepath.Dir(bridge)
	cmd.Env = append(os.Environ(),
		"CURSOR_API_KEY="+key,
		"INTAKE_WORKSPACE="+cwd,
		"INTAKE_AGENT_PROMPT="+prompt,
	)
	if cloud := strings.TrimSpace(os.Getenv("INTAKE_AGENT_CLOUD")); cloud != "" {
		cmd.Env = append(cmd.Env, "INTAKE_AGENT_CLOUD="+cloud)
	}
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("%w: %s", err, truncate(stderr.String(), 400))
	}
	out := strings.TrimSpace(stdout.String())
	if out == "" {
		return "", fmt.Errorf("пустой ответ агента: %s", truncate(stderr.String(), 400))
	}
	return out, nil
}

func findBridge() string {
	if env := strings.TrimSpace(os.Getenv("INTAKE_AGENT_BRIDGE")); env != "" {
		if st, err := os.Stat(env); err == nil && !st.IsDir() {
			abs, _ := filepath.Abs(env)
			return abs
		}
	}
	candidates := []string{
		"agent-bridge/ask.mjs",
		filepath.Join("инструменты", "поток-вводных", "agent-bridge", "ask.mjs"),
	}
	if wd, err := os.Getwd(); err == nil {
		candidates = append(candidates,
			filepath.Join(wd, "agent-bridge", "ask.mjs"),
			filepath.Join(wd, "..", "agent-bridge", "ask.mjs"),
		)
	}
	if exe, err := os.Executable(); err == nil {
		candidates = append(candidates, filepath.Join(filepath.Dir(exe), "agent-bridge", "ask.mjs"))
	}
	for _, c := range candidates {
		if st, err := os.Stat(c); err == nil && !st.IsDir() {
			abs, _ := filepath.Abs(c)
			return abs
		}
	}
	return ""
}

func buildPrompt(mode string, msgs []store.ThreadMsg, extra string) string {
	var b strings.Builder
	switch mode {
	case "analyze_selected":
		b.WriteString("Проанализируй выбранные сообщения из рабочего Telegram-чата. Дай: краткую суть, риски, вопросы менеджеру, следующий шаг.\n\n")
	case "analyze_chat":
		b.WriteString("Проанализируй фрагмент рабочего Telegram-чата. Дай: темы, открытые вопросы, решения, что требует действий.\n\n")
	default:
		b.WriteString("Запрос оператора к агенту по сообщениям рабочего чата.\n\n")
	}
	if strings.TrimSpace(extra) != "" {
		b.WriteString("Доп. указание оператора:\n")
		b.WriteString(strings.TrimSpace(extra))
		b.WriteString("\n\n")
	}
	b.WriteString("Сообщения:\n")
	for _, m := range msgs {
		b.WriteString(fmt.Sprintf("- [%s] %s (%s): %s\n", m.At, m.FromUser, m.Direction, m.Text))
	}
	return b.String()
}

func localAnalyze(prompt string) string {
	lines := strings.Split(prompt, "\n")
	var msgs []string
	for _, ln := range lines {
		if strings.HasPrefix(ln, "- [") {
			msgs = append(msgs, ln)
		}
	}
	var b strings.Builder
	b.WriteString("Локальный разбор (без IDE-агента)\n\n")
	b.WriteString(fmt.Sprintf("Сообщений в выборке: %d\n", len(msgs)))
	if len(msgs) == 0 {
		b.WriteString("Выборка пуста — дождитесь появления сообщений в ленте (зеркало с момента запуска poller).\n")
		return b.String()
	}
	b.WriteString("Ключевые реплики:\n")
	n := len(msgs)
	if n > 8 {
		msgs = append(msgs[:4], msgs[n-4:]...)
	}
	for _, m := range msgs {
		b.WriteString(m)
		b.WriteString("\n")
	}
	b.WriteString("\nРекомендации:\n")
	b.WriteString("1. Уточнить у менеджера ожидаемый исход, если есть расхождения.\n")
	b.WriteString("2. Вынести в карточку HITL только то, что требует согласования.\n")
	b.WriteString("3. Для ответа агента IDE задайте CURSOR_API_KEY и повторите «Спросить у агента».\n")
	return b.String()
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

// GetJob loads job by id.
func (r *Runner) GetJob(id string) (*Job, error) {
	var job Job
	if err := r.Store.LoadAgentJob(id, &job); err != nil {
		return nil, err
	}
	return &job, nil
}
