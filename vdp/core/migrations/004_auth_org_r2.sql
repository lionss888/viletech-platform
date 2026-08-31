-- R2 auth/org: registration activation + verification codes

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS lang TEXT;

CREATE TABLE IF NOT EXISTS verification_codes (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    kind TEXT NOT NULL,
    expires_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_email_kind ON verification_codes(email, kind);

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS org_type TEXT NOT NULL DEFAULT 'client';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subaccounts TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS invited_ids TEXT;
