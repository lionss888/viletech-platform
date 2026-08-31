-- Wave 0/2 extended core schema

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS passport TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS refresh_token TEXT;

ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS counterparty_id UUID;
ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS contract_id UUID;
ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS platform_postpay_mode TEXT;
ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS sign_method TEXT;
ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS no_documents BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS important BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS client_agreed_provider BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS confirmation_hash TEXT;
ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS confirmation_file_id TEXT;
ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS contract_number TEXT;
ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS contract_date TEXT;
ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS invoice_json TEXT;
ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS docs_json TEXT;

CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    status TEXT NOT NULL,
    template_key TEXT,
    signed_file_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS counterparties (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT,
    inn TEXT,
    banks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    author_id UUID NOT NULL,
    body TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY,
    owner_id UUID,
    form_id UUID,
    storage_key TEXT NOT NULL,
    content_type TEXT,
    content_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    inn TEXT
);

CREATE TABLE IF NOT EXISTS hs_codes (
    code TEXT PRIMARY KEY,
    description TEXT
);

CREATE TABLE IF NOT EXISTS currencies (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS configurations (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS liquidity_offers (
    id UUID PRIMARY KEY,
    direction TEXT NOT NULL,
    provider_id UUID,
    amount TEXT,
    currency TEXT,
    status TEXT NOT NULL DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS virtual_accounts (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL,
    kind TEXT NOT NULL,
    balance TEXT NOT NULL DEFAULT '0',
    currency TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS treasurer_tasks (
    id UUID PRIMARY KEY,
    form_payment_id UUID NOT NULL,
    kind TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS unblock_requests (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    requested_by UUID NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
