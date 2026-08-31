-- R10 Bank API channel
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS client_type TEXT NOT NULL DEFAULT 'ui';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bank_fixed_commission_percent TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS apply_platform_markup BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_agent_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bank_webhook_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bank_webhook_secret TEXT;

ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'ui';
ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS correlation_id TEXT;
ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE TABLE IF NOT EXISTS bank_idempotency (
    scope TEXT NOT NULL,
    idem_key TEXT NOT NULL,
    form_payment_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (scope, idem_key)
);

CREATE INDEX IF NOT EXISTS idx_form_payments_channel ON form_payments(channel);
CREATE INDEX IF NOT EXISTS idx_form_payments_idempotency ON form_payments(account_id, idempotency_key);
