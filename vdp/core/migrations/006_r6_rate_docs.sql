-- R6 rate / commission / POG / templates

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS rate_settings TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS bank_rate_readonly BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS pog_status TEXT;
ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS pog_file_id TEXT;
ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS pog_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS pog_kind TEXT;

CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    direction TEXT NOT NULL DEFAULT 'import',
    mapping_json TEXT NOT NULL DEFAULT '{}',
    file_id TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
