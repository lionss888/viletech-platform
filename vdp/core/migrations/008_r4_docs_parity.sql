-- R4 docs parity: counterparty approval + org card file

ALTER TABLE counterparties ADD COLUMN IF NOT EXISTS last_approval_status TEXT;
ALTER TABLE counterparties ADD COLUMN IF NOT EXISTS last_approval_date TIMESTAMPTZ;
ALTER TABLE counterparties ADD COLUMN IF NOT EXISTS last_approval_comment TEXT;

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS organization_card_file_id TEXT;
