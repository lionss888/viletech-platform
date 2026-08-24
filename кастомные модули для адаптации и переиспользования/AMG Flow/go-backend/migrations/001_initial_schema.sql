-- AMG Flow Go Backend Initial Schema
-- Миграция 001: Создание базовых таблиц

-- Включаем расширение для UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Таблица сессий
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Индексы для сессий
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);

-- Таблица разговоров
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id),
    external_id VARCHAR(255),
    title VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Индексы для разговоров
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_external_id ON conversations(external_id);
CREATE INDEX IF NOT EXISTS idx_conversations_is_active ON conversations(is_active);

-- Таблица сообщений
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id),
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Индексы для сообщений
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Таблица моделей AI
CREATE TABLE IF NOT EXISTS models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    description TEXT,
    model_type VARCHAR(50) DEFAULT 'chat' CHECK (model_type IN ('chat', 'completion', 'embedding')),
    provider VARCHAR(50) DEFAULT 'ollama',
    config JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Индексы для моделей
CREATE INDEX IF NOT EXISTS idx_models_name ON models(name);
CREATE INDEX IF NOT EXISTS idx_models_is_active ON models(is_active);
CREATE INDEX IF NOT EXISTS idx_models_provider ON models(provider);

-- Таблица рабочих процессов
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Индексы для рабочих процессов
CREATE INDEX IF NOT EXISTS idx_workflows_name ON workflows(name);
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON workflows(is_active);

-- Таблица UI компонентов для BDUI
CREATE TABLE IF NOT EXISTS ui_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    schema JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Индексы для UI компонентов
CREATE INDEX IF NOT EXISTS idx_ui_components_name ON ui_components(name);
CREATE INDEX IF NOT EXISTS idx_ui_components_type ON ui_components(type);
CREATE INDEX IF NOT EXISTS idx_ui_components_is_active ON ui_components(is_active);

-- Таблица UI форм для BDUI
CREATE TABLE IF NOT EXISTS ui_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255),
    description TEXT,
    schema JSONB NOT NULL,
    validation JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Индексы для UI форм
CREATE INDEX IF NOT EXISTS idx_ui_forms_name ON ui_forms(name);
CREATE INDEX IF NOT EXISTS idx_ui_forms_is_active ON ui_forms(is_active);

-- Таблица UI вкладок для BDUI
CREATE TABLE IF NOT EXISTS ui_tabs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255),
    description TEXT,
    component_id UUID NOT NULL REFERENCES ui_components(id),
    "order" INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Индексы для UI вкладок
CREATE INDEX IF NOT EXISTS idx_ui_tabs_name ON ui_tabs(name);
CREATE INDEX IF NOT EXISTS idx_ui_tabs_component_id ON ui_tabs(component_id);
CREATE INDEX IF NOT EXISTS idx_ui_tabs_order ON ui_tabs("order");
CREATE INDEX IF NOT EXISTS idx_ui_tabs_is_active ON ui_tabs(is_active);

-- Вставляем базовые данные
INSERT INTO models (name, display_name, description, model_type, provider, is_active) VALUES
('llama3.2:3b-instruct-q4_0', 'Llama 3.2 3B Instruct', 'Быстрая модель для чата', 'chat', 'ollama', true),
('codellama:7b-instruct', 'CodeLlama 7B Instruct', 'Модель для программирования', 'chat', 'ollama', true),
('llama3.2:1b-instruct-q4_0', 'Llama 3.2 1B Instruct', 'Очень быстрая модель', 'chat', 'ollama', true)
ON CONFLICT (name) DO NOTHING;

-- Вставляем базовые UI компоненты для BDUI
INSERT INTO ui_components (name, type, schema) VALUES
('main-chat', 'chat', '{"type": "chat", "props": {"placeholder": "Type your message...", "useRag": true, "useSmartPrompts": true}}'),
('analytics-dashboard', 'dashboard', '{"type": "dashboard", "props": {"showMetrics": true, "enableExport": true}}'),
('development-panel', 'panel', '{"type": "panel", "props": {"tools": ["refactor", "test", "document"]}}'),
('workflow-manager', 'workflow', '{"type": "workflow", "props": {"enableAutomation": true}}')
ON CONFLICT (name) DO NOTHING;

-- Вставляем базовые UI формы
INSERT INTO ui_forms (name, title, schema) VALUES
('chat-form', 'Chat Form', '{"fields": [{"name": "message", "type": "textarea", "required": true, "placeholder": "Enter your message"}]}'),
('model-selection', 'Model Selection', '{"fields": [{"name": "model", "type": "select", "options": ["llama3.2:3b-instruct-q4_0", "codellama:7b-instruct"]}]}')
ON CONFLICT (name) DO NOTHING;

-- Вставляем базовые UI вкладки
INSERT INTO ui_tabs (name, title, component_id, "order") VALUES
('chat-tab', 'Chat', (SELECT id FROM ui_components WHERE name = 'main-chat'), 1),
('analytics-tab', 'Analytics', (SELECT id FROM ui_components WHERE name = 'analytics-dashboard'), 2),
('development-tab', 'Development', (SELECT id FROM ui_components WHERE name = 'development-panel'), 3),
('workflow-tab', 'Workflows', (SELECT id FROM ui_components WHERE name = 'workflow-manager'), 4)
ON CONFLICT (name) DO NOTHING;
