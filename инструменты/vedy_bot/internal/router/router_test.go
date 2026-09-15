package router

import "testing"

func TestClassifyAndTarget(t *testing.T) {
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
	id, ch := TargetForKind("reminder", manager, operator, -100)
	if id != -200 || ch != ChannelOperator {
		t.Fatalf("reminder got %d %s", id, ch)
	}
	id, ch = TargetForKind("proposal", manager, operator, -100)
	if id != -100 || ch != ChannelManager {
		t.Fatalf("proposal got %d %s", id, ch)
	}
	id, ch = TargetForKind("reminder", manager, nil, -100)
	if id != -100 || ch != ChannelManager {
		t.Fatalf("fallback reminder got %d %s", id, ch)
	}
}
