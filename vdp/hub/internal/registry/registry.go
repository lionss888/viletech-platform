package registry

import (
	"fmt"
	"sync"

	"github.com/viletech/vdp/hub/internal/domain"
)

type Registry struct {
	mu      sync.RWMutex
	plugins map[string]domain.Plugin
}

func New() *Registry {
	return &Registry{plugins: map[string]domain.Plugin{}}
}

func (r *Registry) Register(plugin domain.Plugin) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.plugins[plugin.Name()]; exists {
		return fmt.Errorf("plugin %s already registered", plugin.Name())
	}
	r.plugins[plugin.Name()] = plugin
	return nil
}

func (r *Registry) Get(name string) (domain.Plugin, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	plugin, ok := r.plugins[name]
	if !ok {
		return nil, fmt.Errorf("plugin %s not found", name)
	}
	return plugin, nil
}

func (r *Registry) All() []domain.Plugin {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]domain.Plugin, 0, len(r.plugins))
	for _, plugin := range r.plugins {
		out = append(out, plugin)
	}
	return out
}
