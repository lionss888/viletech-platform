package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
)

func (s *Store) GetProcessPolicySnapshot(ctx context.Context) (formpayment.ProcessPolicySnapshot, error) {
	var version int
	var updatedBy sql.NullString
	var updatedAt time.Time
	err := s.db.QueryRowContext(ctx, `
		SELECT version, updated_by, updated_at FROM process_policy_meta WHERE id=1`).Scan(&version, &updatedBy, &updatedAt)
	if err == sql.ErrNoRows {
		return formpayment.DefaultProcessPolicySnapshot(), nil
	}
	if err != nil {
		// Table may be missing on old DBs — fall back to defaults.
		return formpayment.DefaultProcessPolicySnapshot(), nil
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT role, enabled, priority, influence, capabilities FROM role_process_configs ORDER BY priority ASC, role ASC`)
	if err != nil {
		return formpayment.DefaultProcessPolicySnapshot(), nil
	}
	defer rows.Close()
	snap := formpayment.ProcessPolicySnapshot{Version: version, UpdatedAt: updatedAt}
	if updatedBy.Valid {
		snap.UpdatedBy = updatedBy.String
	}
	for rows.Next() {
		var role, influence string
		var enabled bool
		var priority int
		var capsRaw []byte
		if err := rows.Scan(&role, &enabled, &priority, &influence, &capsRaw); err != nil {
			return formpayment.DefaultProcessPolicySnapshot(), nil
		}
		var caps []formpayment.Capability
		_ = json.Unmarshal(capsRaw, &caps)
		parsed, ok := domain.ParseRole(role)
		if !ok {
			continue
		}
		snap.Roles = append(snap.Roles, formpayment.RoleProcessConfig{
			Role: parsed, Enabled: enabled, Priority: priority,
			Influence: formpayment.Influence(influence), Capabilities: caps,
		})
	}
	if len(snap.Roles) == 0 {
		return formpayment.DefaultProcessPolicySnapshot(), nil
	}
	return snap, nil
}

func (s *Store) SaveProcessPolicySnapshot(ctx context.Context, snap formpayment.ProcessPolicySnapshot) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	_, err = tx.ExecContext(ctx, `
		INSERT INTO process_policy_meta (id, version, updated_by, updated_at)
		VALUES (1, $1, $2, $3)
		ON CONFLICT (id) DO UPDATE SET version=EXCLUDED.version, updated_by=EXCLUDED.updated_by, updated_at=EXCLUDED.updated_at`,
		snap.Version, snap.UpdatedBy, snap.UpdatedAt)
	if err != nil {
		return err
	}
	for _, cfg := range snap.Roles {
		caps, _ := json.Marshal(cfg.Capabilities)
		_, err = tx.ExecContext(ctx, `
			INSERT INTO role_process_configs (role, enabled, priority, influence, capabilities, updated_at)
			VALUES ($1,$2,$3,$4,$5,NOW())
			ON CONFLICT (role) DO UPDATE SET
				enabled=EXCLUDED.enabled, priority=EXCLUDED.priority, influence=EXCLUDED.influence,
				capabilities=EXCLUDED.capabilities, updated_at=NOW()`,
			string(cfg.Role), cfg.Enabled, cfg.Priority, string(cfg.Influence), caps)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}
