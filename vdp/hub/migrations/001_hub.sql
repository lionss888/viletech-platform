-- vdp_hub schema (own database)

CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inbox_events (
    id UUID PRIMARY KEY,
    event_id TEXT UNIQUE,
    aggregate_id VARCHAR(255) NOT NULL,
    aggregate_type VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    event_data JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inbox_events_id_unique ON inbox_events(id);
CREATE INDEX IF NOT EXISTS idx_inbox_events_pending ON inbox_events(status, created_at) WHERE status = 'pending';

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
