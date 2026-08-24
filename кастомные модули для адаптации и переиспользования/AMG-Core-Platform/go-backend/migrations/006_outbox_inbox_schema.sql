-- Inbox-Outbox Pattern Tables
-- This migration creates tables for guaranteed event delivery

-- Outbox table for publishing events
CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id VARCHAR(255) NOT NULL,
    aggregate_type VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    event_data JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_error TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inbox table for receiving events
CREATE TABLE IF NOT EXISTS inbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id VARCHAR(255) NOT NULL,
    aggregate_type VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    event_data JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for outbox_events
CREATE INDEX IF NOT EXISTS idx_outbox_events_aggregate_id ON outbox_events(aggregate_id);
CREATE INDEX IF NOT EXISTS idx_outbox_events_aggregate_type ON outbox_events(aggregate_type);
CREATE INDEX IF NOT EXISTS idx_outbox_events_event_type ON outbox_events(event_type);
CREATE INDEX IF NOT EXISTS idx_outbox_events_status ON outbox_events(status);
CREATE INDEX IF NOT EXISTS idx_outbox_events_created_at ON outbox_events(created_at);
CREATE INDEX IF NOT EXISTS idx_outbox_events_pending ON outbox_events(status, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_outbox_events_failed ON outbox_events(status, retry_count, created_at) WHERE status = 'failed' AND retry_count < max_retries;

-- Create indexes for inbox_events
CREATE INDEX IF NOT EXISTS idx_inbox_events_aggregate_id ON inbox_events(aggregate_id);
CREATE INDEX IF NOT EXISTS idx_inbox_events_aggregate_type ON inbox_events(aggregate_type);
CREATE INDEX IF NOT EXISTS idx_inbox_events_event_type ON inbox_events(event_type);
CREATE INDEX IF NOT EXISTS idx_inbox_events_status ON inbox_events(status);
CREATE INDEX IF NOT EXISTS idx_inbox_events_created_at ON inbox_events(created_at);
CREATE INDEX IF NOT EXISTS idx_inbox_events_pending ON inbox_events(status, created_at) WHERE status = 'pending';

-- Create trigger to update updated_at timestamp for outbox_events
DROP TRIGGER IF EXISTS update_outbox_events_updated_at ON outbox_events;
CREATE TRIGGER update_outbox_events_updated_at
    BEFORE UPDATE ON outbox_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to update updated_at timestamp for inbox_events
DROP TRIGGER IF EXISTS update_inbox_events_updated_at ON inbox_events;
CREATE TRIGGER update_inbox_events_updated_at
    BEFORE UPDATE ON inbox_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample outbox events
INSERT INTO outbox_events (aggregate_id, aggregate_type, event_type, event_data, status) VALUES
('user-1', 'user', 'user_created', '{"user_id": "user-1", "email": "user@example.com", "name": "John Doe"}', 'pending'),
('user-2', 'user', 'user_updated', '{"user_id": "user-2", "email": "user2@example.com", "name": "Jane Doe"}', 'pending'),
('payment-1', 'payment', 'payment_processed', '{"payment_id": "payment-1", "amount": 100.00, "currency": "USD"}', 'pending'),
('wallet-1', 'wallet', 'wallet_created', '{"wallet_id": "wallet-1", "user_id": "user-1", "currency": "USD"}', 'pending')
ON CONFLICT (id) DO NOTHING;

-- Insert sample inbox events
INSERT INTO inbox_events (aggregate_id, aggregate_type, event_type, event_data, status) VALUES
('user-1', 'user', 'user_created', '{"user_id": "user-1", "email": "user@example.com", "name": "John Doe"}', 'pending'),
('user-2', 'user', 'user_updated', '{"user_id": "user-2", "email": "user2@example.com", "name": "Jane Doe"}', 'pending'),
('payment-1', 'payment', 'payment_processed', '{"payment_id": "payment-1", "amount": 100.00, "currency": "USD"}', 'pending'),
('wallet-1', 'wallet', 'wallet_created', '{"wallet_id": "wallet-1", "user_id": "user-1", "currency": "USD"}', 'pending')
ON CONFLICT (id) DO NOTHING;
