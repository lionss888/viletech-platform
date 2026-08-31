package registry_test

import (
	"context"
	"testing"

	"github.com/viletech/vdp/hub/internal/domain"
	"github.com/viletech/vdp/hub/internal/registry"
)

type stub struct{}

func (stub) Name() string    { return "stub" }
func (stub) Version() string { return "1" }
func (stub) Type() domain.Type { return domain.TypePartner }
func (stub) Actions() []string { return []string{"x"} }
func (stub) Execute(context.Context, string, map[string]any) (map[string]any, error) {
	return map[string]any{"ok": true}, nil
}
func (stub) HealthCheck(context.Context) error { return nil }

func TestRegisterGet(t *testing.T) {
	t.Parallel()
	reg := registry.New()
	if err := reg.Register(stub{}); err != nil {
		t.Fatal(err)
	}
	plugin, err := reg.Get("stub")
	if err != nil || plugin.Name() != "stub" {
		t.Fatalf("%v %#v", err, plugin)
	}
	if len(reg.All()) != 1 {
		t.Fatal("all")
	}
}
