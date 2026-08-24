-- Saga Pattern Tables
-- This migration creates tables for distributed transaction sagas

-- Sagas table
CREATE TABLE IF NOT EXISTS sagas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    correlation_id VARCHAR(255) NOT NULL,
    data JSONB,
    result JSONB,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for sagas
CREATE INDEX IF NOT EXISTS idx_sagas_correlation_id ON sagas(correlation_id);
CREATE INDEX IF NOT EXISTS idx_sagas_status ON sagas(status);
CREATE INDEX IF NOT EXISTS idx_sagas_type ON sagas(type);
CREATE INDEX IF NOT EXISTS idx_sagas_created_at ON sagas(created_at);

-- Saga steps table
CREATE TABLE IF NOT EXISTS saga_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saga_id UUID NOT NULL REFERENCES sagas(id) ON DELETE CASCADE,
    step_name VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    data JSONB,
    result JSONB,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for saga steps
CREATE INDEX IF NOT EXISTS idx_saga_steps_saga_id ON saga_steps(saga_id);
CREATE INDEX IF NOT EXISTS idx_saga_steps_status ON saga_steps(status);
CREATE INDEX IF NOT EXISTS idx_saga_steps_order ON saga_steps(saga_id, "order");

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to sagas table
DROP TRIGGER IF EXISTS update_sagas_updated_at ON sagas;
CREATE TRIGGER update_sagas_updated_at
    BEFORE UPDATE ON sagas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to saga_steps table
DROP TRIGGER IF EXISTS update_saga_steps_updated_at ON saga_steps;
CREATE TRIGGER update_saga_steps_updated_at
    BEFORE UPDATE ON saga_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample saga types
INSERT INTO sagas (type, status, correlation_id, data) VALUES
('user_registration', 'pending', 'sample-user-1', '{"user_id": "sample-user-1", "email": "user@example.com"}'),
('payment_processing', 'pending', 'sample-payment-1', '{"payment_id": "sample-payment-1", "amount": 100.00}'),
('account_verification', 'pending', 'sample-verification-1', '{"user_id": "sample-user-1", "verification_type": "email"}')
ON CONFLICT (id) DO NOTHING;
