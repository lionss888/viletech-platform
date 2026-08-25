-- Additive upgrades for existing hub DBs that applied an older 001.

ALTER TABLE inbox_events ADD COLUMN IF NOT EXISTS event_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_inbox_events_event_id_unique ON inbox_events(event_id);

CREATE TABLE IF NOT EXISTS integration_operations (
    id UUID PRIMARY KEY,
    integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
    integration_name TEXT NOT NULL,
    action TEXT NOT NULL,
    params JSONB NOT NULL DEFAULT '{}',
    result JSONB,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    duration_ms BIGINT,
    event_id TEXT,
    form_payment_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_integration_operations_status ON integration_operations(status);
CREATE INDEX IF NOT EXISTS idx_integration_operations_event_id ON integration_operations(event_id);
CREATE INDEX IF NOT EXISTS idx_integration_operations_created_at ON integration_operations(created_at);
