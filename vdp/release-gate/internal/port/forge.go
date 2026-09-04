package port

import (
	"context"

	"github.com/viletech/vdp/release-gate/internal/domain"
)

type Forge interface {
	Name() string
	ListReleases(ctx context.Context) ([]domain.Release, error)
	DispatchDeploy(ctx context.Context, env domain.Environment, imagesRunID string) error
	SetSchedule(ctx context.Context, env domain.Environment, mode, window string) error
	SetApprovers(ctx context.Context, env domain.Environment, logins []string) error
}
