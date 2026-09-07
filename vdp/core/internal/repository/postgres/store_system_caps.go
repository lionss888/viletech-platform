package postgres

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/systemcap"
)

func (s *Store) GetRoleSystemCapabilities(ctx context.Context, role domain.Role) ([]string, error) {
	var raw []byte
	err := s.db.QueryRowContext(ctx, `
		SELECT system_capabilities FROM role_system_configs WHERE role=$1`, string(role)).Scan(&raw)
	if err == sql.ErrNoRows {
		if role == domain.RoleRoot {
			out := make([]string, 0, len(systemcap.All()))
			for _, c := range systemcap.All() {
				out = append(out, string(c))
			}
			return out, nil
		}
		return nil, nil
	}
	if err != nil {
		if role == domain.RoleRoot {
			out := make([]string, 0, len(systemcap.All()))
			for _, c := range systemcap.All() {
				out = append(out, string(c))
			}
			return out, nil
		}
		return nil, err
	}
	var caps []string
	_ = json.Unmarshal(raw, &caps)
	return caps, nil
}

func (s *Store) SaveRoleSystemCapabilities(ctx context.Context, role domain.Role, caps []string) error {
	if role == domain.RoleRoot {
		locked := make([]string, 0, len(systemcap.LockedForRoot()))
		have := map[string]bool{}
		for _, c := range caps {
			have[c] = true
		}
		for _, c := range systemcap.LockedForRoot() {
			if !have[string(c)] {
				caps = append(caps, string(c))
			}
			_ = locked
		}
	}
	raw, _ := json.Marshal(caps)
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO role_system_configs (role, system_capabilities, updated_at)
		VALUES ($1,$2,NOW())
		ON CONFLICT (role) DO UPDATE SET system_capabilities=EXCLUDED.system_capabilities, updated_at=NOW()`,
		string(role), raw)
	return err
}
