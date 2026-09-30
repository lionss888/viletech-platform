-- Counterparty optional fields from initiation §2 (registration number, legal address).
ALTER TABLE counterparties ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE counterparties ADD COLUMN IF NOT EXISTS legal_address TEXT;
