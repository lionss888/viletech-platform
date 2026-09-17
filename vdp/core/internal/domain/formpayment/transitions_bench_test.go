package formpayment

import "testing"

func BenchmarkIsAllowedTransition(b *testing.B) {
	cases := []struct {
		from Status
		to   Status
		dir  Direction
		rate bool
	}{
		{StatusDraft, StatusFormWaitingVerification, DirectionImport, false},
		{StatusFormAccepted, StatusSigningOrder, DirectionImport, false},
		{StatusDraft, StatusCompleted, DirectionExport, true},
		{StatusPaymentSent, StatusReportWaiting, DirectionImport, false},
	}
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		c := cases[i%len(cases)]
		_ = IsAllowedTransition(c.from, c.to, c.dir, c.rate)
	}
}
