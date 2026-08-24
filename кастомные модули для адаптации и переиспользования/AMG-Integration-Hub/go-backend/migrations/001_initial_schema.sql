-- AMG Integration Bus - Initial Database Schema
-- Version: 1.0.0
-- Description: Initial database schema for integration bus

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create enum types
CREATE TYPE integration_status AS ENUM (
    'active',
    'inactive', 
    'error',
    'pending',
    'maintenance'
);

CREATE TYPE integration_type AS ENUM (
    'banking',
    'payment',
    'crm',
    'analytics',
    'marketing',
    'communication'
);

CREATE TYPE operation_status AS ENUM (
    'pending',
    'running',
    'completed',
    'failed',
    'cancelled'
);

CREATE TYPE log_level AS ENUM (
    'debug',
    'info',
    'warn',
    'error',
    'fatal'
);

-- Create integrations table
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    type integration_type NOT NULL,
    status integration_status NOT NULL DEFAULT 'pending',
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    description TEXT,
    config JSONB NOT NULL DEFAULT '{}',
    credentials JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_sync TIMESTAMP WITH TIME ZONE
);

-- Create integration_operations table
CREATE TABLE integration_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    params JSONB NOT NULL DEFAULT '{}',
    result JSONB,
    status operation_status NOT NULL DEFAULT 'pending',
    error TEXT,
    duration BIGINT, -- milliseconds
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create integration_metrics table
CREATE TABLE integration_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(50),
    labels JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create integration_logs table
CREATE TABLE integration_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    level log_level NOT NULL,
    message TEXT NOT NULL,
    context JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create users table for authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create refresh_tokens table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_integrations_name ON integrations(name);
CREATE INDEX idx_integrations_type ON integrations(type);
CREATE INDEX idx_integrations_status ON integrations(status);
CREATE INDEX idx_integrations_created_at ON integrations(created_at);

CREATE INDEX idx_integration_operations_integration_id ON integration_operations(integration_id);
CREATE INDEX idx_integration_operations_status ON integration_operations(status);
CREATE INDEX idx_integration_operations_created_at ON integration_operations(created_at);
CREATE INDEX idx_integration_operations_action ON integration_operations(action);

CREATE INDEX idx_integration_metrics_integration_id ON integration_metrics(integration_id);
CREATE INDEX idx_integration_metrics_name ON integration_metrics(name);
CREATE INDEX idx_integration_metrics_timestamp ON integration_metrics(timestamp);
CREATE INDEX idx_integration_metrics_integration_timestamp ON integration_metrics(integration_id, timestamp);

CREATE INDEX idx_integration_logs_integration_id ON integration_logs(integration_id);
CREATE INDEX idx_integration_logs_level ON integration_logs(level);
CREATE INDEX idx_integration_logs_timestamp ON integration_logs(timestamp);
CREATE INDEX idx_integration_logs_integration_timestamp ON integration_logs(integration_id, timestamp);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(active);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Create GIN indexes for JSONB fields
CREATE INDEX idx_integrations_config_gin ON integrations USING GIN(config);
CREATE INDEX idx_integrations_credentials_gin ON integrations USING GIN(credentials);
CREATE INDEX idx_integrations_metadata_gin ON integrations USING GIN(metadata);

CREATE INDEX idx_integration_operations_params_gin ON integration_operations USING GIN(params);
CREATE INDEX idx_integration_operations_result_gin ON integration_operations USING GIN(result);

CREATE INDEX idx_integration_metrics_labels_gin ON integration_metrics USING GIN(labels);
CREATE INDEX idx_integration_logs_context_gin ON integration_logs USING GIN(context);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_integrations_updated_at 
    BEFORE UPDATE ON integrations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Delete metrics older than 90 days
    DELETE FROM integration_metrics 
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    -- Delete logs older than 30 days
    DELETE FROM integration_logs 
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    -- Delete completed operations older than 7 days
    DELETE FROM integration_operations 
    WHERE status = 'completed' 
    AND created_at < NOW() - INTERVAL '7 days';
    
    -- Delete expired refresh tokens
    DELETE FROM refresh_tokens 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Insert default admin user (password: admin123)
INSERT INTO users (email, username, password_hash, first_name, last_name, role) VALUES
('admin@amg-flow.com', 'admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', 'admin');

-- Create view for integration statistics
CREATE VIEW integration_stats AS
SELECT 
    i.id,
    i.name,
    i.type,
    i.status,
    COUNT(DISTINCT o.id) as total_operations,
    COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END) as successful_operations,
    COUNT(DISTINCT CASE WHEN o.status = 'failed' THEN o.id END) as failed_operations,
    AVG(CASE WHEN o.duration > 0 THEN o.duration END) as avg_duration_ms,
    MAX(o.created_at) as last_operation,
    COUNT(DISTINCT m.id) as total_metrics,
    MAX(m.timestamp) as last_metric,
    COUNT(DISTINCT l.id) as total_logs,
    COUNT(DISTINCT CASE WHEN l.level = 'error' THEN l.id END) as error_logs,
    MAX(l.timestamp) as last_log
FROM integrations i
LEFT JOIN integration_operations o ON i.id = o.integration_id
LEFT JOIN integration_metrics m ON i.id = m.integration_id
LEFT JOIN integration_logs l ON i.id = l.integration_id
GROUP BY i.id, i.name, i.type, i.status;
