package httpapi_test

import (
	"testing"
)

// TestR8ReturnClarifyStub is a minimal placeholder for HTTP routing (stage 2).
// Domain guards (episode active, only manager/client, question/answer required) are tested in return_clarify_test.go (unit tests).
// Full workflow cycle (manager → client → manager) is in return-episode-clarify.spec.ts (Playwright).
func TestR8ReturnClarifyStub(t *testing.T) {
	t.Parallel()
	// HTTP endpoints registered in r8_return_routes.go:
	// - POST /api/v1/forms/:id/return/clarify (manager)
	// - POST /api/v1/forms/:id/return/clarify-reply (client)
	// Full integration tests deferred to E2E
}
