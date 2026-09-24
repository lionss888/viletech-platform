package router

import "testing"

func TestClassifyAndAllowed(t *testing.T) {
	t.Parallel()
	manager := map[int64]struct{}{-100: {}}
	operator := map[int64]struct{}{-200: {}}
	if Classify(-100, manager, operator) != ChannelManager {
		t.Fatal("manager")
	}
	if Classify(-200, manager, operator) != ChannelOperator {
		t.Fatal("operator")
	}
	if Allowed(-1, manager, operator) {
		t.Fatal("unknown not allowed")
	}
	if !Allowed(-100, manager, operator) || !Allowed(-200, manager, operator) {
		t.Fatal("allowlists")
	}
}

func TestTargetForKindMatrix(t *testing.T) {
	t.Parallel()
	manager := map[int64]struct{}{-100: {}}
	operator := map[int64]struct{}{-200: {}}
	cases := []struct {
		kind    string
		opSet   map[int64]struct{}
		wantID  int64
		wantCh  Channel
		opBound bool
	}{
		{kind: "reminder", opSet: operator, wantID: -200, wantCh: ChannelOperator, opBound: true},
		{kind: "operator_digest", opSet: operator, wantID: -200, wantCh: ChannelOperator, opBound: true},
		{kind: "operator_prompt", opSet: operator, wantID: -200, wantCh: ChannelOperator, opBound: true},
		{kind: "proposal", opSet: operator, wantID: -100, wantCh: ChannelManager, opBound: false},
		{kind: "help", opSet: operator, wantID: -100, wantCh: ChannelManager, opBound: false},
		{kind: "stale", opSet: operator, wantID: -100, wantCh: ChannelManager, opBound: false},
		{kind: "stand", opSet: operator, wantID: -100, wantCh: ChannelManager, opBound: false},
		// No operator chat → reminder falls back to manager intake.
		{kind: "reminder", opSet: nil, wantID: -100, wantCh: ChannelManager, opBound: true},
		{kind: "operator_digest", opSet: nil, wantID: -100, wantCh: ChannelManager, opBound: true},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.kind+"_"+string(tc.wantCh), func(t *testing.T) {
			t.Parallel()
			if IsOperatorBound(tc.kind) != tc.opBound {
				t.Fatalf("IsOperatorBound(%q)=%v", tc.kind, IsOperatorBound(tc.kind))
			}
			id, ch := TargetForKind(tc.kind, manager, tc.opSet, -100)
			if id != tc.wantID || ch != tc.wantCh {
				t.Fatalf("got %d %s want %d %s", id, ch, tc.wantID, tc.wantCh)
			}
		})
	}
}

func TestPrimary(t *testing.T) {
	t.Parallel()
	if Primary(nil) != 0 {
		t.Fatal("empty")
	}
	id := Primary(map[int64]struct{}{-200: {}})
	if id != -200 {
		t.Fatalf("id=%d", id)
	}
}
