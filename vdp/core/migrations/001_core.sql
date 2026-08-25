-- vdp_core schema (own database)

CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    organization_id UUID,
    blocked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id),
    status TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    blocked BOOLEAN NOT NULL DEFAULT FALSE,
    rating TEXT NOT NULL DEFAULT '',
    inn TEXT,
    name TEXT,
    country TEXT,
    fields_frozen BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form_payments (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    provider_id UUID,
    agent_id UUID,
    manager_id UUID,
    status TEXT NOT NULL,
    prev_status TEXT,
    direction TEXT NOT NULL,
    kind TEXT NOT NULL,
    rate_on_provider BOOLEAN NOT NULL DEFAULT FALSE,
    execution_deadline TIMESTAMPTZ,
    rate_value TEXT,
    rate_currency TEXT,
    rate_source TEXT,
    fee_amount TEXT,
    fee_percent TEXT,
    fee_currency TEXT,
    invoice_amount TEXT,
    currency TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_form_payments_account ON form_payments(account_id);
CREATE INDEX IF NOT EXISTS idx_form_payments_provider ON form_payments(provider_id);
CREATE INDEX IF NOT EXISTS idx_form_payments_status ON form_payments(status);
CREATE INDEX IF NOT EXISTS idx_form_payments_org ON form_payments(organization_id);

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY,
    form_payment_id UUID NOT NULL REFERENCES form_payments(id),
    type TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    content_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compliance_history (
    id UUID PRIMARY KEY,
    form_payment_id UUID NOT NULL REFERENCES form_payments(id),
    actor_id UUID NOT NULL,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_history_form ON compliance_history(form_payment_id);

CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY,
    aggregate_id VARCHAR(255) NOT NULL,
    aggregate_type VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    event_data JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_error TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_events_pending ON outbox_events(status, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_outbox_events_aggregate ON outbox_events(aggregate_id);
