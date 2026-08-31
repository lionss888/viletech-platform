-- R5 multi-order: principal instructions on form-payment

CREATE TABLE IF NOT EXISTS form_orders (
    id TEXT PRIMARY KEY,
    form_payment_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    status TEXT NOT NULL,
    file_ids TEXT,
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

CREATE INDEX IF NOT EXISTS idx_form_orders_form ON form_orders(form_payment_id);

ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS active_order_id TEXT;
