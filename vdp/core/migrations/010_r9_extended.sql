-- R9: liquidity form link, VA lookup helpers, treasurer/agent extensions
ALTER TABLE liquidity_offers ADD COLUMN IF NOT EXISTS form_payment_id UUID;
ALTER TABLE treasurer_tasks ADD COLUMN IF NOT EXISTS amount TEXT;
ALTER TABLE treasurer_tasks ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE treasurer_tasks ADD COLUMN IF NOT EXISTS assignee_id UUID;
ALTER TABLE treasurer_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS stamp_file_id TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS signature_file_id TEXT;
