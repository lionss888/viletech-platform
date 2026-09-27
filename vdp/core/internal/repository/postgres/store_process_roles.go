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
		SELECT role, enabled, COALESCE(mandatory, FALSE), priority, influence, capabilities,
			COALESCE(disable_mode, ''), COALESCE(handoff_role, '')
		FROM role_process_configs ORDER BY priority ASC, role ASC`)
	if err != nil {
		return formpayment.DefaultProcessPolicySnapshot(), nil
	}
	defer rows.Close()
	snap := formpayment.ProcessPolicySnapshot{Version: version, UpdatedAt: updatedAt}
	if updatedBy.Valid {
		snap.UpdatedBy = updatedBy.String
	}
	for rows.Next() {
		var role, influence, disableMode, handoffRole string
		var enabled, mandatory bool
		var priority int
		var capsRaw []byte
		if err := rows.Scan(&role, &enabled, &mandatory, &priority, &influence, &capsRaw, &disableMode, &handoffRole); err != nil {
			return formpayment.DefaultProcessPolicySnapshot(), nil
		}
		var caps []formpayment.Capability
		_ = json.Unmarshal(capsRaw, &caps)
		parsed, ok := domain.ParseRole(role)
		if !ok {
			continue
		}
		if !formpayment.IsProcessEligibleRole(parsed) {
			continue
		}
		var handoff domain.Role
		if handoffRole != "" {
			if hr, hok := domain.ParseRole(handoffRole); hok {
				handoff = hr
			}
		}
		snap.Roles = append(snap.Roles, formpayment.RoleProcessConfig{
			Role: parsed, Enabled: enabled, Mandatory: mandatory, Priority: priority,
			Influence: formpayment.Influence(influence), Capabilities: caps,
			DisableMode: formpayment.DisableMode(disableMode), HandoffRole: handoff,
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
		if !formpayment.IsProcessEligibleRole(cfg.Role) {
			continue
		}
		caps, _ := json.Marshal(cfg.Capabilities)
		_, err = tx.ExecContext(ctx, `
			INSERT INTO role_process_configs (role, enabled, mandatory, priority, influence, capabilities, disable_mode, handoff_role, updated_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
			ON CONFLICT (role) DO UPDATE SET
				enabled=EXCLUDED.enabled, mandatory=EXCLUDED.mandatory, priority=EXCLUDED.priority,
				influence=EXCLUDED.influence, capabilities=EXCLUDED.capabilities,
				disable_mode=EXCLUDED.disable_mode, handoff_role=EXCLUDED.handoff_role, updated_at=NOW()`,
			string(cfg.Role), cfg.Enabled, cfg.Mandatory, cfg.Priority, string(cfg.Influence), caps,
			string(cfg.DisableMode), string(cfg.HandoffRole))
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}
