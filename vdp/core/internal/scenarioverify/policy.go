package scenarioverify

import "strings"

// AllowsMutatingRuns reports whether ENVIRONMENT permits status-changing probe runs.
// Plan: local/compose/alpha/demo/test (+ dev aliases). gamma/prod/staging/beta → dry_run only.
func AllowsMutatingRuns(environment string) bool {
	switch strings.ToLower(strings.TrimSpace(environment)) {
	case "", "development", "dev", "local", "test", "ci", "alpha", "demo":
		return true
	default:
		return false
	}
}

// ResolveMode picks an effective mode. Empty requested → mutating if allowed else dry_run.
// Requesting mutating on a locked env forces dry_run (no error) so Root UI can still run checks.
func ResolveMode(requested Mode, environment string) Mode {
	req := Mode(strings.ToLower(strings.TrimSpace(string(requested))))
	switch req {
	case ModeHealth:
		return ModeHealth
	case ModeDryRun:
		return ModeDryRun
	case ModeMutating:
		if AllowsMutatingRuns(environment) {
			return ModeMutating
		}
		return ModeDryRun
	case "":
		if AllowsMutatingRuns(environment) {
			return ModeMutating
		}
		return ModeDryRun
	default:
		return ModeDryRun
	}
}
