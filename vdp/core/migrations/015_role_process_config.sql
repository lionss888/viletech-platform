-- Role process participation (fixed methodology; roles only).

CREATE TABLE IF NOT EXISTS process_policy_meta (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    version INT NOT NULL DEFAULT 1,
    updated_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_process_configs (
    role TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    priority INT NOT NULL DEFAULT 100,
    influence TEXT NOT NULL DEFAULT 'actor',
    capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO process_policy_meta (id, version, updated_by, updated_at)
VALUES (1, 1, 'seed', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_process_configs (role, enabled, priority, influence, capabilities) VALUES
    ('root', TRUE, 1, 'actor', '["form.view","form.submit","form.cancel_user","form.recognize","org.compliance","form.compliance","manager.ops","manager.payment","provider.payment","treasurer.ops","user.docs","internal.callback","sales.attribution"]'),
    ('user', TRUE, 10, 'actor', '["form.view","form.submit","form.cancel_user","form.recognize","user.docs"]'),
    ('sales', FALSE, 15, 'observer', '["form.view","sales.attribution"]'),
    ('internal_compliance_officer', TRUE, 20, 'actor', '["form.view","org.compliance"]'),
    ('compliance_officer', TRUE, 30, 'actor', '["form.view","form.compliance"]'),
    ('manager', TRUE, 40, 'actor', '["form.view","form.recognize","manager.ops","manager.payment","provider.payment"]'),
    ('treasurer', TRUE, 45, 'actor', '["form.view","manager.ops","manager.payment","treasurer.ops"]'),
    ('provider', TRUE, 50, 'actor', '["form.view","manager.payment","provider.payment"]'),
    ('senior_provider', TRUE, 55, 'actor', '["form.view","manager.payment","provider.payment"]'),
    ('viewer', FALSE, 60, 'observer', '["form.view"]'),
    ('one_c', TRUE, 70, 'actor', '["internal.callback"]'),
    ('bank', TRUE, 80, 'actor', '["form.view","form.submit"]')
ON CONFLICT (role) DO NOTHING;

ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS process_policy_version INT NOT NULL DEFAULT 1;
