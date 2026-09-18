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

	"github.com/viletech/tools/vedy_bot/internal/store"
)

// Job is an async agent request.
type Job struct {
	ID         string   `json:"id"`
	Status     string   `json:"status"` // queued|running|done|error
	Mode       string   `json:"mode"`   // analyze_selected|analyze_chat|ask_agent|local_analyze
	Prompt     string   `json:"prompt"`
	MessageIDs []string `json:"message_ids,omitempty"`
	Result     string   `json:"result,omitempty"`
	Error      string   `json:"error,omitempty"`
	CreatedAt  string   `json:"created_at"`
	UpdatedAt  string   `json:"updated_at"`
	UseKnowledge bool   `json:"use_knowledge,omitempty"`
}

// Runner executes agent jobs (Cursor SDK bridge; local_analyze is explicit stub).
type Runner struct {
	Store     *store.Store
	Workspace string
	APIKey    string
	BridgeJS  string // path to ask.mjs; empty = auto near module
	NodeBin   string
	// KnowledgePack optionally prepends retrieved context (P1). Nil = skip.
	KnowledgePack func(query string) (string, error)
	// CloudDefault when empty env: "1" means cloud.
	CloudDefault string
	// LocalFallbackCloud retries cloud when local fails (P4).
	LocalFallbackCloud bool
}

// StartJob creates and runs a job in background.
// apiKeyOverride is used when set (from console UI); otherwise Runner.APIKey / env.
func (r *Runner) StartJob(mode string, msgIDs []string, extra, apiKeyOverride string) (*Job, error) {
	return r.StartJobOpts(mode, msgIDs, extra, apiKeyOverride, false)
}

// StartJobOpts is StartJob with optional knowledge pack.
func (r *Runner) StartJobOpts(mode string, msgIDs []string, extra, apiKeyOverride string, useKnowledge bool) (*Job, error) {
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
	if (mode == "ask_agent" || mode == "analyze_selected" || mode == "analyze_chat") && len(msgs) == 0 {
		all, err := r.Store.ListThreadRecent(80)
		if err != nil {
			return nil, err
		}
		msgs = all
	}
	if looksLikeAPIKey(extra) {
		return nil, fmt.Errorf("в поле вопроса похож на API-ключ — вставь ключ в CURSOR_API_KEY / поле «Ключ агента», а сюда — текст вопроса")
	}
	prompt := buildPrompt(mode, msgs, extra)
	now := time.Now().UTC().Format(time.RFC3339)
	job := &Job{
		ID:           id,
		Status:       "queued",
		Mode:         mode,
		Prompt:       prompt,
		MessageIDs:   msgIDs,
		CreatedAt:    now,
		UpdatedAt:    now,
		UseKnowledge: useKnowledge,
	}
	if err := r.Store.SaveAgentJob(id, job); err != nil {
		return nil, err
	}
	go r.run(job, strings.TrimSpace(apiKeyOverride))
	return job, nil
}

// StartRawPrompt runs a job with a fully built prompt (TG auto path).
func (r *Runner) StartRawPrompt(mode, prompt string, useKnowledge bool) (*Job, error) {
	id := fmt.Sprintf("job-%d", time.Now().UnixNano())
	now := time.Now().UTC().Format(time.RFC3339)
	if mode == "" {
		mode = "ask_agent"
	}
	job := &Job{
		ID:           id,
		Status:       "queued",
		Mode:         mode,
		Prompt:       prompt,
		CreatedAt:    now,
		UpdatedAt:    now,
		UseKnowledge: useKnowledge,
	}
	if err := r.Store.SaveAgentJob(id, job); err != nil {
		return nil, err
	}
	go r.run(job, "")
	return job, nil
}

func looksLikeAPIKey(s string) bool {
	s = strings.TrimSpace(s)
	if s == "" || strings.Contains(s, " ") || strings.Contains(s, "\n") {
		return false
	}
	low := strings.ToLower(s)
	return strings.HasPrefix(low, "key_") || strings.HasPrefix(low, "crsr_") ||
		(len(s) >= 24 && len(s) <= 128 && !strings.ContainsAny(s, ".,;:!?"))
}

func (r *Runner) run(job *Job, apiKeyOverride string) {
	job.Status = "running"
	job.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	_ = r.Store.SaveAgentJob(job.ID, job)

	prompt := job.Prompt
	if job.UseKnowledge && r.KnowledgePack != nil {
		pack, err := r.KnowledgePack(prompt)
		if err != nil {
			r.failJob(job, fmt.Errorf("knowledge: %w", err))
			return
		}
		if strings.TrimSpace(pack) != "" {
			prompt = "Контекст из базы знаний:\n" + pack + "\n\n---\n\n" + prompt
		}
	}

	var result string
	var err error
	switch job.Mode {
	case "local_analyze":
		result = localAnalyze(prompt)
	case "ask_agent", "analyze_selected", "analyze_chat":
		result, err = r.runCursorAgent(context.Background(), prompt, apiKeyOverride)
	default:
		err = fmt.Errorf("unknown mode %q", job.Mode)
	}
	if err != nil {
		r.failJob(job, err)
		return
	}
	job.Status = "done"
	job.Result = result
	job.Error = ""
	job.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	_ = r.Store.SaveAgentJob(job.ID, job)
	_ = r.mirrorAgentReply(job)
}

func (r *Runner) failJob(job *Job, err error) {
	job.Status = "error"
	job.Error = err.Error()
	job.Result = ""
	job.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	_ = r.Store.SaveAgentJob(job.ID, job)
	_ = r.Store.AppendThread(store.ThreadMsg{
		MessageID: time.Now().UnixNano(),
		Direction: "agent",
		FromUser:  "agent",
		Text:      "Ошибка агента: " + err.Error(),
		Kind:      job.Mode + "_error",
	})
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

func (r *Runner) runCursorAgent(ctx context.Context, prompt, apiKeyOverride string) (string, error) {
	key := strings.TrimSpace(apiKeyOverride)
	if key == "" {
		key = strings.TrimSpace(r.APIKey)
	}
	if key == "" {
		key = strings.TrimSpace(os.Getenv("CURSOR_API_KEY"))
	}
	if key == "" {
		return "", fmt.Errorf("нет CURSOR_API_KEY — вставь ключ в поле «Ключ агента» или в ~/.vedy_bot/env")
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
	cloudFlag := strings.TrimSpace(os.Getenv("INTAKE_AGENT_CLOUD"))
	if cloudFlag == "" {
		cloudFlag = strings.TrimSpace(r.CloudDefault)
	}
	if cloudFlag == "" {
		cloudFlag = "1"
	}
	out, err := r.execBridge(ctx, node, bridge, cwd, key, prompt, cloudFlag)
	if err != nil && cloudFlag != "1" && cloudFlag != "true" && r.LocalFallbackCloud {
		out, err = r.execBridge(ctx, node, bridge, cwd, key, prompt, "1")
		if err != nil {
			return "", fmt.Errorf("local fail, cloud retry fail: %w", err)
		}
		return out, nil
	}
	return out, err
}

func (r *Runner) execBridge(ctx context.Context, node, bridge, cwd, key, prompt, cloudFlag string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Minute)
	defer cancel()
	cmd := exec.CommandContext(ctx, node, bridge)
	cmd.Dir = filepath.Dir(bridge)
	cmd.Env = append(os.Environ(),
		"CURSOR_API_KEY="+key,
		"INTAKE_WORKSPACE="+cwd,
		"INTAKE_AGENT_PROMPT="+prompt,
		"INTAKE_AGENT_CLOUD="+cloudFlag,
	)
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
		filepath.Join("инструменты", "vedy_bot", "agent-bridge", "ask.mjs"),
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
	case "local_analyze":
		b.WriteString("Локальный rule-based разбор (без IDE).\n\n")
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
	b.WriteString("3. Для ответа агента IDE задайте CURSOR_API_KEY и режим analyze/ask (не local_analyze).\n")
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

// Configured reports whether a Cursor key is available (env or runner field).
func (r *Runner) Configured() bool {
	if strings.TrimSpace(r.APIKey) != "" {
		return true
	}
	return strings.TrimSpace(os.Getenv("CURSOR_API_KEY")) != ""
}

// BridgeReady reports whether ask.mjs is resolvable.
func (r *Runner) BridgeReady() bool {
	if r.BridgeJS != "" {
		st, err := os.Stat(r.BridgeJS)
		return err == nil && !st.IsDir()
	}
	return findBridge() != ""
}
