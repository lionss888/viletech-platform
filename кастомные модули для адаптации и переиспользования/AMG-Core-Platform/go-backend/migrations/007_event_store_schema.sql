-- Event Store Schema Migration
-- This migration creates the event store tables for event sourcing

-- Create event_store_events table
CREATE TABLE IF NOT EXISTS event_store_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(255) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    aggregate_type VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    metadata JSONB,
    version INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    source VARCHAR(255) NOT NULL,
    correlation_id VARCHAR(255),
    causation_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_store_events_type ON event_store_events(type);
CREATE INDEX IF NOT EXISTS idx_event_store_events_aggregate_id ON event_store_events(aggregate_id);
CREATE INDEX IF NOT EXISTS idx_event_store_events_aggregate_type ON event_store_events(aggregate_type);
CREATE INDEX IF NOT EXISTS idx_event_store_events_timestamp ON event_store_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_event_store_events_correlation_id ON event_store_events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_event_store_events_causation_id ON event_store_events(causation_id);

-- Create composite index for aggregate queries
CREATE INDEX IF NOT EXISTS idx_event_store_events_aggregate_version ON event_store_events(aggregate_id, version);

-- Create event projections table for tracking projection state
CREATE TABLE IF NOT EXISTS event_projections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projection_name VARCHAR(255) NOT NULL UNIQUE,
    last_processed_event_id UUID,
    last_processed_timestamp TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create event bus metrics table
CREATE TABLE IF NOT EXISTS event_bus_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(255) NOT NULL,
    metric_value BIGINT NOT NULL,
    metric_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for metrics queries
CREATE INDEX IF NOT EXISTS idx_event_bus_metrics_name_timestamp ON event_bus_metrics(metric_name, metric_timestamp);

-- Insert sample event store events
INSERT INTO event_store_events (type, aggregate_id, aggregate_type, data, metadata, version, timestamp, source, correlation_id, causation_id) VALUES
('UserCreated', 'user-001', 'User', '{"email": "john@example.com", "first_name": "John", "last_name": "Doe"}', '{"ip_address": "192.168.1.1", "user_agent": "Mozilla/5.0"}', 1, NOW(), 'user-service', 'corr-001', 'caus-001'),
('UserUpdated', 'user-001', 'User', '{"email": "john.doe@example.com", "first_name": "John", "last_name": "Doe"}', '{"ip_address": "192.168.1.1", "user_agent": "Mozilla/5.0"}', 2, NOW(), 'user-service', 'corr-002', 'caus-002'),
('PaymentInitiated', 'payment-001', 'Payment', '{"amount": 100.00, "currency": "USD", "user_id": "user-001"}', '{"payment_method": "credit_card", "processor": "stripe"}', 1, NOW(), 'payment-service', 'corr-003', 'caus-003'),
('PaymentProcessed', 'payment-001', 'Payment', '{"amount": 100.00, "currency": "USD", "user_id": "user-001", "status": "completed"}', '{"payment_method": "credit_card", "processor": "stripe", "transaction_id": "txn-123"}', 2, NOW(), 'payment-service', 'corr-004', 'caus-004'),
('AccountCreated', 'account-001', 'Account', '{"user_id": "user-001", "account_type": "checking", "balance": 0.00}', '{"bank_code": "001", "branch_code": "001"}', 1, NOW(), 'banking-service', 'corr-005', 'caus-005');

-- Insert sample projection states
INSERT INTO event_projections (projection_name, last_processed_event_id, last_processed_timestamp, status) VALUES
('UserProjection', (SELECT id FROM event_store_events WHERE type = 'UserCreated' LIMIT 1), NOW(), 'active'),
('PaymentProjection', (SELECT id FROM event_store_events WHERE type = 'PaymentInitiated' LIMIT 1), NOW(), 'active'),
('BankingProjection', (SELECT id FROM event_store_events WHERE type = 'AccountCreated' LIMIT 1), NOW(), 'active');

-- Insert sample metrics
INSERT INTO event_bus_metrics (metric_name, metric_value, metric_timestamp) VALUES
('events_published', 100, NOW()),
('events_consumed', 95, NOW()),
('events_failed', 5, NOW()),
('publish_latency_ms', 50, NOW()),
('consume_latency_ms', 30, NOW());
