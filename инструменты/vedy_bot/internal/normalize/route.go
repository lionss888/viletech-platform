package normalize

// Route is where an inbound update goes after Classify.
type Route string

const (
	RouteThreadOnly Route = "thread_only" // mirror to console thread, no inbox/HITL
	RouteHelp       Route = "help"
	RouteIntake     Route = "intake" // inbox (+ HITL when enabled)
)

// RouteOf maps a trigger to the processing route.
func RouteOf(trig Trigger) Route {
	switch trig {
	case TriggerHelp:
		return RouteHelp
	case TriggerMention, TriggerVvod:
		return RouteIntake
	default:
		return RouteThreadOnly
	}
}

// CreatesHITLCard reports whether the trigger can create an inbox/HITL card.
func CreatesHITLCard(trig Trigger) bool {
	return RouteOf(trig) == RouteIntake
}
