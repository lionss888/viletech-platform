package stand

// PipelineAdapter wraps Runner for pipeline.Stand.
type PipelineAdapter struct {
	Runner *Runner
	lastID string
}

// StartAction starts an allowlisted action.
func (a *PipelineAdapter) StartAction(action string) (string, error) {
	if a == nil || a.Runner == nil {
		return "", fmtErr("stand not configured")
	}
	job, err := a.Runner.Start(Action(action))
	if err != nil {
		return "", err
	}
	a.lastID = job.ID
	return job.ID, nil
}

// ManagerLine returns sanitized status for a job (or last).
func (a *PipelineAdapter) ManagerLine(jobID string) (string, error) {
	if a == nil || a.Runner == nil {
		return "", fmtErr("stand not configured")
	}
	id := jobID
	if id == "" {
		id = a.lastID
	}
	if id == "" {
		return "Нет запусков проверки стенда.", nil
	}
	job, err := a.Runner.Get(id)
	if err != nil {
		return "", err
	}
	return ManagerStatus(job), nil
}

func fmtErr(s string) error {
	return errString(s)
}

type errString string

func (e errString) Error() string { return string(e) }
