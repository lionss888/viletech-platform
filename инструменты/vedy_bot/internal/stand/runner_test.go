package stand

import (
	"strings"
	"testing"
	"time"
)

func TestDryRunJob(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	r := &Runner{VDPRoot: home, Home: home, DryRun: true}
	job, err := r.Start(ActionGateFast)
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 100; i++ {
		got, err := r.Get(job.ID)
		if err != nil {
			t.Fatal(err)
		}
		if got.Status == "done" {
			if !strings.Contains(got.Output, "dry-run") {
				t.Fatalf("output=%q", got.Output)
			}
			msg := ManagerStatus(got)
			if strings.Contains(msg, home) || strings.Contains(msg, "make") {
				t.Fatalf("leaked tech: %q", msg)
			}
			return
		}
		if got.Status == "error" {
			t.Fatalf("%+v", got)
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatal("timeout")
}

func TestUnknownAction(t *testing.T) {
	t.Parallel()
	r := &Runner{VDPRoot: t.TempDir(), Home: t.TempDir()}
	_, err := r.Start(Action("rm-rf"))
	if err == nil {
		t.Fatal("expected error")
	}
}
