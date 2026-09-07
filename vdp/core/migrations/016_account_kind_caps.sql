-- Account kind + capability overrides (RBAC A+B).

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_kind TEXT NOT NULL DEFAULT 'user';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS business_cap_overrides JSONB;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS system_cap_overrides JSONB;

UPDATE accounts SET account_kind = 'admin' WHERE role = 'root';
UPDATE accounts SET account_kind = 'user' WHERE role <> 'root' AND (account_kind IS NULL OR account_kind = '');

-- Remove root from process participation (admin is outside fixed process).
DELETE FROM role_process_configs WHERE role = 'root';

UPDATE role_process_configs
SET capabilities = '["form.view","form.submit","bank.channel"]'::jsonb
WHERE role = 'bank';

-- System capability templates for admin typed roles.
CREATE TABLE IF NOT EXISTS role_system_configs (
    role TEXT PRIMARY KEY,
    system_capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO role_system_configs (role, system_capabilities) VALUES
    ('root', '["accounts.manage","directories.manage","forms.admin","process_roles.manage","system.admin"]')
ON CONFLICT (role) DO NOTHING;
