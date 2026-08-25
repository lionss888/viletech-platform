-- R3 contracts + payment agent templates

ALTER TABLE contracts ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE contracts ALTER COLUMN organization_id TYPE TEXT USING organization_id::text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'agency';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS agent_id TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS template_id TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS uploaded_by TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS account_ref TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS file_id TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS number TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS reject_text TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS history_json TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- rename legacy signed_file_id → keep; file_id is preferred for new writes
ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS on_behalf_organization_id TEXT;

CREATE INDEX IF NOT EXISTS idx_contracts_org ON contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contracts_agent ON contracts(agent_id);
CREATE INDEX IF NOT EXISTS idx_contracts_template ON contracts(is_template) WHERE is_template = TRUE;
