-- Включаем расширение pgvector для векторного поиска
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- ДОКУМЕНТЫ ПЛАТЕЖЕЙ
-- ============================================

-- Таблица документов платежей (традиционные и крипто)
CREATE TABLE IF NOT EXISTS payment_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('traditional', 'crypto')),
    format VARCHAR(50) NOT NULL,  -- 'SWIFT', 'PDF', 'JSON', 'blockchain'
    raw_data BYTEA,
    parsed_data JSONB,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'review_required')),
    operator_id UUID,
    customer_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_documents_type ON payment_documents(type);
CREATE INDEX IF NOT EXISTS idx_payment_documents_status ON payment_documents(status);
CREATE INDEX IF NOT EXISTS idx_payment_documents_customer ON payment_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_documents_created ON payment_documents(created_at DESC);

-- ============================================
-- РЕЗУЛЬТАТЫ АНАЛИЗА
-- ============================================

-- Таблица результатов анализа документов
CREATE TABLE IF NOT EXISTS analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES payment_documents(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50) NOT NULL,  -- 'document', 'compliance', 'risk', 'sentiment'
    result_data JSONB NOT NULL,
    confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
    model_version VARCHAR(100),
    duration_ms INTEGER NOT NULL,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_results_document ON analysis_results(document_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_type ON analysis_results(analysis_type);
CREATE INDEX IF NOT EXISTS idx_analysis_results_success ON analysis_results(success);

-- ============================================
-- COMPLIANCE ПРОВЕРКИ
-- ============================================

-- Таблица compliance проверок
CREATE TABLE IF NOT EXISTS compliance_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES payment_documents(id) ON DELETE CASCADE,
    check_type VARCHAR(50) NOT NULL,  -- 'sanctions', 'kyc', 'aml', 'travel_rule', 'fatf'
    status VARCHAR(50) NOT NULL CHECK (status IN ('passed', 'failed', 'warning', 'pending')),
    details JSONB,
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_checks_document ON compliance_checks(document_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_type ON compliance_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_status ON compliance_checks(status);

-- ============================================
-- ОЦЕНКА РИСКОВ
-- ============================================

-- Таблица оценок рисков
CREATE TABLE IF NOT EXISTS risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES payment_documents(id) ON DELETE CASCADE,
    risk_score FLOAT CHECK (risk_score >= 0 AND risk_score <= 1),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    factors JSONB,
    economic_indices JSONB,
    recommendation VARCHAR(50) NOT NULL CHECK (recommendation IN ('approve', 'reject', 'review', 'request_info')),
    model_version VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_document ON risk_assessments(document_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_level ON risk_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_score ON risk_assessments(risk_score DESC);

-- ============================================
-- БЛОКЧЕЙН ТРАНЗАКЦИИ
-- ============================================

-- Таблица блокчейн транзакций
CREATE TABLE IF NOT EXISTS blockchain_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_hash VARCHAR(100) UNIQUE NOT NULL,
    blockchain VARCHAR(50) NOT NULL,  -- 'ethereum', 'bitcoin', 'tron', etc.
    from_address VARCHAR(100) NOT NULL,
    to_address VARCHAR(100) NOT NULL,
    amount DECIMAL(30, 10),
    currency VARCHAR(10),
    block_number BIGINT,
    timestamp TIMESTAMP,
    transaction_data JSONB,
    graph_data JSONB,  -- Данные графового анализа
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blockchain_tx_hash ON blockchain_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_from ON blockchain_transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_blockchain_to ON blockchain_transactions(to_address);
CREATE INDEX IF NOT EXISTS idx_blockchain_timestamp ON blockchain_transactions(timestamp DESC);

-- ============================================
-- ЭКОНОМИЧЕСКИЕ ИНДЕКСЫ
-- ============================================

-- Таблица экономических индексов
CREATE TABLE IF NOT EXISTS economic_indices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code VARCHAR(3) NOT NULL,
    index_type VARCHAR(50) NOT NULL,  -- 'economic_freedom', 'corruption', 'gdp_growth', etc.
    value FLOAT NOT NULL,
    year INTEGER NOT NULL,
    source VARCHAR(100),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(country_code, index_type, year)
);

CREATE INDEX IF NOT EXISTS idx_economic_indices_country ON economic_indices(country_code);
CREATE INDEX IF NOT EXISTS idx_economic_indices_type ON economic_indices(index_type);
CREATE INDEX IF NOT EXISTS idx_economic_indices_year ON economic_indices(year DESC);

-- ============================================
-- ОБРАТНАЯ СВЯЗЬ ОПЕРАТОРОВ
-- ============================================

-- Таблица обратной связи от операторов
CREATE TABLE IF NOT EXISTS operator_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES payment_documents(id) ON DELETE SET NULL,
    analysis_id UUID REFERENCES analysis_results(id) ON DELETE SET NULL,
    operator_id UUID NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_type VARCHAR(50),  -- 'accuracy', 'speed', 'usability', 'other'
    comment TEXT,
    corrected_data JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operator_feedback_document ON operator_feedback(document_id);
CREATE INDEX IF NOT EXISTS idx_operator_feedback_rating ON operator_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_operator_feedback_created ON operator_feedback(created_at DESC);

-- ============================================
-- АДАПТИВНОЕ ОБУЧЕНИЕ
-- ============================================

-- Таблица примеров для адаптивного обучения
CREATE TABLE IF NOT EXISTS adaptive_learning_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL,  -- 'payment_traditional', 'payment_crypto', etc.
    example_type VARCHAR(50) NOT NULL,  -- 'document', 'compliance', 'risk'
    input_data JSONB NOT NULL,
    expected_output JSONB NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    is_positive BOOLEAN NOT NULL DEFAULT true,
    negative_reason TEXT,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    quality_score FLOAT DEFAULT 5.0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adaptive_learning_category ON adaptive_learning_examples(category);
CREATE INDEX IF NOT EXISTS idx_adaptive_learning_rating ON adaptive_learning_examples(rating DESC);
CREATE INDEX IF NOT EXISTS idx_adaptive_learning_positive ON adaptive_learning_examples(is_positive);
CREATE INDEX IF NOT EXISTS idx_adaptive_learning_quality ON adaptive_learning_examples(quality_score DESC);

-- ============================================
-- БАЗА ЗНАНИЙ ДЛЯ RAG
-- ============================================

-- Таблица базы знаний для Compliance и финансовых правил
CREATE TABLE IF NOT EXISTS compliance_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(200) NOT NULL,  -- 'sanctions', 'aml', 'kyc', 'swift', 'crypto'
    content_type VARCHAR(200) NOT NULL,  -- 'regulation', 'guideline', 'example', 'faq'
    content TEXT NOT NULL,
    keywords TEXT[],
    embedding vector(768),  -- вектор для RAG (768 для nomic-embed-text)
    source VARCHAR(200),
    quality_score FLOAT DEFAULT 5.0,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- UNIQUE constraint для предотвращения дубликатов
CREATE UNIQUE INDEX IF NOT EXISTS idx_compliance_kb_unique 
ON compliance_knowledge_base(category, content_type, content);

CREATE INDEX IF NOT EXISTS idx_compliance_kb_category ON compliance_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_compliance_kb_type ON compliance_knowledge_base(content_type);
CREATE INDEX IF NOT EXISTS idx_compliance_kb_quality ON compliance_knowledge_base(quality_score DESC);

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_knowledge_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автообновления updated_at
DROP TRIGGER IF EXISTS compliance_kb_updated_at ON compliance_knowledge_base;
CREATE TRIGGER compliance_kb_updated_at
    BEFORE UPDATE ON compliance_knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_timestamp();

-- Функция поиска похожих примеров по вектору
CREATE OR REPLACE FUNCTION search_similar_compliance(
    query_embedding vector(768),
    match_category VARCHAR(200) DEFAULT NULL,
    match_type VARCHAR(200) DEFAULT NULL,
    match_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    category VARCHAR(200),
    content_type VARCHAR(200),
    content TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kb.id,
        kb.category,
        kb.content_type,
        kb.content,
        1 - (kb.embedding <=> query_embedding) AS similarity
    FROM compliance_knowledge_base kb
    WHERE 
        kb.embedding IS NOT NULL
        AND (match_category IS NULL OR kb.category = match_category)
        AND (match_type IS NULL OR kb.content_type = match_type)
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ИСТОЧНИКИ ЗНАНИЙ (Knowledge Sources Management)
-- ============================================

-- Таблица источников знаний (для управления заказчиком)
CREATE TABLE IF NOT EXISTS knowledge_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('url', 'file', 'api', 'manual')),
    source_url TEXT,
    file_path TEXT,
    file_format VARCHAR(50),  -- 'csv', 'txt', 'pdf', 'json'
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    auto_refresh BOOLEAN DEFAULT false,
    refresh_interval INTERVAL,
    last_refreshed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    metadata JSONB,
    category VARCHAR(100),  -- Категория знаний: 'project_management', 'compliance', etc.
    owner_only BOOLEAN DEFAULT false  -- Доступ только для владельца (created_by)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_active ON knowledge_sources(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_type ON knowledge_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_created ON knowledge_sources(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_category ON knowledge_sources(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_owner ON knowledge_sources(created_by) WHERE owner_only = true;

-- Триггер для автообновления updated_at в knowledge_sources
DROP TRIGGER IF EXISTS knowledge_sources_updated_at ON knowledge_sources;
CREATE TRIGGER knowledge_sources_updated_at
    BEFORE UPDATE ON knowledge_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_timestamp();

-- Таблица фрагментов знаний (chunks для RAG)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES knowledge_sources(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_type VARCHAR(50),  -- 'text', 'table', 'list'
    embedding vector(768),  -- pgvector embedding (768 для nomic-embed-text)
    metadata JSONB,  -- Дополнительные метаданные (страница, раздел и т.д.)
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_source ON knowledge_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_created ON knowledge_chunks(created_at DESC);

-- Индекс для векторного поиска (IVFFlat для больших объемов данных)
-- Создается после добавления данных для лучшей производительности
-- CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding ON knowledge_chunks 
--     USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Для небольших объемов данных используем HNSW
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding ON knowledge_chunks
    USING hnsw (embedding vector_cosine_ops);

-- Функция поиска похожих chunks по вектору
CREATE OR REPLACE FUNCTION search_similar_knowledge(
    query_embedding vector(768),
    match_source_ids UUID[] DEFAULT NULL,
    match_limit INTEGER DEFAULT 5,
    min_similarity FLOAT DEFAULT 0.7,
    match_user_id UUID DEFAULT NULL,  -- Фильтр по владельцу для owner_only контента
    match_category VARCHAR(100) DEFAULT NULL  -- Фильтр по категории
)
RETURNS TABLE (
    id UUID,
    source_id UUID,
    source_name VARCHAR(255),
    content TEXT,
    content_type VARCHAR(50),
    metadata JSONB,
    similarity FLOAT,
    category VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kc.id,
        kc.source_id,
        ks.name AS source_name,
        kc.content,
        kc.content_type,
        kc.metadata,
        1 - (kc.embedding <=> query_embedding) AS similarity,
        ks.category
    FROM knowledge_chunks kc
    JOIN knowledge_sources ks ON kc.source_id = ks.id
    WHERE 
        kc.embedding IS NOT NULL
        AND ks.is_active = true
        AND (match_source_ids IS NULL OR kc.source_id = ANY(match_source_ids))
        AND (1 - (kc.embedding <=> query_embedding)) >= min_similarity
        -- Фильтрация owner_only: показываем если не owner_only ИЛИ если user_id совпадает
        AND (ks.owner_only = false OR ks.created_by = match_user_id)
        -- Фильтрация по категории
        AND (match_category IS NULL OR ks.category = match_category)
    ORDER BY kc.embedding <=> query_embedding
    LIMIT match_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- СТАТИСТИКА И ПРЕДСТАВЛЕНИЯ
-- ============================================

-- Представление для статистики анализа
CREATE OR REPLACE VIEW analysis_stats AS
SELECT 
    COUNT(*) as total_documents,
    COUNT(CASE WHEN pd.status = 'completed' THEN 1 END) as completed_documents,
    COUNT(CASE WHEN pd.status = 'failed' THEN 1 END) as failed_documents,
    COUNT(CASE WHEN pd.status = 'review_required' THEN 1 END) as review_required,
    AVG(ar.duration_ms) as avg_duration_ms,
    AVG(ar.confidence_score) as avg_confidence,
    AVG(of.rating) as avg_operator_rating
FROM payment_documents pd
LEFT JOIN analysis_results ar ON pd.id = ar.document_id
LEFT JOIN operator_feedback of ON pd.id = of.document_id;

-- ============================================
-- ФУНКЦИИ ДЛЯ ПЕРЕСЧЕТА ВЕСОВ
-- ============================================

-- Функция пересчета quality_score для адаптивного обучения
CREATE OR REPLACE FUNCTION recalculate_learning_quality_scores()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE adaptive_learning_examples 
    SET quality_score = 
        (rating * 0.6) + 
        (LEAST(usage_count, 100) / 100.0 * 2.0) + 
        (CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 0.5 ELSE 0.25 END);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Функция пересчета quality_score для базы знаний
CREATE OR REPLACE FUNCTION recalculate_knowledge_quality_scores()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE compliance_knowledge_base 
    SET quality_score = 
        5.0 - (CASE WHEN usage_count = 0 THEN 0 ELSE LEAST(usage_count / 20.0, 2.0) END) +
        (CASE WHEN created_at > NOW() - INTERVAL '90 days' THEN 0.5 ELSE 0 END);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Комплексная функция пересчета всех весов (вызывается ежедневно)
CREATE OR REPLACE FUNCTION recalculate_all_weights()
RETURNS TABLE (
    learning_updated INTEGER,
    knowledge_updated INTEGER
) AS $$
BEGIN
    learning_updated := recalculate_learning_quality_scores();
    knowledge_updated := recalculate_knowledge_quality_scores();
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ЛОГИ РАСПОЗНАВАНИЯ НАМЕРЕНИЙ
-- ============================================

-- Таблица логов распознавания намерений
CREATE TABLE IF NOT EXISTS intent_recognition_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    detected_intent VARCHAR(100) NOT NULL,
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
    matched_pattern_id INTEGER,
    all_matches JSONB,  -- Все совпадения с уверенностью: [{"intent": "...", "confidence": 0.8}, ...]
    entities JSONB,  -- Извлеченные сущности
    response_type VARCHAR(50),  -- 'handler' или 'llm'
    handler_name VARCHAR(100),  -- Имя обработчика, если использовался
    processing_time_ms INTEGER,
    user_id UUID,
    session_id UUID,
    metadata JSONB,  -- Дополнительные метаданные
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intent_logs_intent ON intent_recognition_logs(detected_intent);
CREATE INDEX IF NOT EXISTS idx_intent_logs_confidence ON intent_recognition_logs(confidence);
CREATE INDEX IF NOT EXISTS idx_intent_logs_created ON intent_recognition_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intent_logs_user ON intent_recognition_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_intent_logs_response_type ON intent_recognition_logs(response_type);

-- ============================================
-- ПАТТЕРНЫ РАСПОЗНАВАНИЯ НАМЕРЕНИЙ
-- ============================================

-- Таблица паттернов распознавания (для динамического управления)
CREATE TABLE IF NOT EXISTS intent_patterns (
    id SERIAL PRIMARY KEY,
    intent_type VARCHAR(100) NOT NULL,
    keywords JSONB NOT NULL DEFAULT '[]',  -- Массив ключевых слов
    required_keywords JSONB DEFAULT '[]',  -- Обязательные ключевые слова (ИЛИ логика)
    exclude_keywords JSONB DEFAULT '[]',  -- Исключающие ключевые слова
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    confidence_boost FLOAT DEFAULT 0.3,  -- Бонус за required_keywords
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,  -- Системный паттерн (нельзя удалить)
    description TEXT,
    examples JSONB DEFAULT '[]',  -- Примеры запросов для этого паттерна
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_intent_patterns_unique ON intent_patterns(intent_type, version) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_intent_patterns_active ON intent_patterns(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_intent_patterns_priority ON intent_patterns(priority DESC);

-- Триггер для автообновления updated_at в intent_patterns
DROP TRIGGER IF EXISTS intent_patterns_updated_at ON intent_patterns;
CREATE TRIGGER intent_patterns_updated_at
    BEFORE UPDATE ON intent_patterns
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_timestamp();

-- ============================================
-- ИСТОРИЯ ИЗМЕНЕНИЙ ПАТТЕРНОВ
-- ============================================

-- Таблица истории изменений паттернов (для отката)
CREATE TABLE IF NOT EXISTS intent_pattern_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id INTEGER REFERENCES intent_patterns(id) ON DELETE SET NULL,
    intent_type VARCHAR(100) NOT NULL,
    old_data JSONB NOT NULL,  -- Предыдущее состояние паттерна
    new_data JSONB NOT NULL,  -- Новое состояние паттерна
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('create', 'update', 'delete', 'auto_optimize')),
    change_reason TEXT,  -- Причина изменения (вручную / автоматически)
    applied_by VARCHAR(100),  -- 'user', 'auto_optimizer', 'api'
    is_rolled_back BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pattern_history_pattern ON intent_pattern_history(pattern_id);
CREATE INDEX IF NOT EXISTS idx_pattern_history_type ON intent_pattern_history(change_type);
CREATE INDEX IF NOT EXISTS idx_pattern_history_created ON intent_pattern_history(created_at DESC);

-- ============================================
-- ПРЕДЛОЖЕНИЯ ПО УЛУЧШЕНИЮ ПАТТЕРНОВ
-- ============================================

-- Таблица предложений по улучшению (от LLM-анализатора)
CREATE TABLE IF NOT EXISTS intent_pattern_improvements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id INTEGER REFERENCES intent_patterns(id) ON DELETE CASCADE,
    intent_type VARCHAR(100) NOT NULL,
    suggested_keywords JSONB,  -- Предлагаемые новые keywords
    suggested_required_keywords JSONB,
    suggested_exclude_keywords JSONB,
    suggested_priority INTEGER,
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),  -- Уверенность LLM в улучшении
    analysis_data JSONB,  -- Данные анализа (примеры запросов, статистика)
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'auto_applied')),
    applied_at TIMESTAMP,
    reviewed_by UUID,
    review_comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pattern_improvements_status ON intent_pattern_improvements(status);
CREATE INDEX IF NOT EXISTS idx_pattern_improvements_pattern ON intent_pattern_improvements(pattern_id);
CREATE INDEX IF NOT EXISTS idx_pattern_improvements_created ON intent_pattern_improvements(created_at DESC);

-- ============================================
-- МИГРАЦИИ (для существующих БД)
-- ============================================

-- Добавление category и owner_only в knowledge_sources (если таблица уже существует)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'knowledge_sources' AND column_name = 'category') THEN
        ALTER TABLE knowledge_sources ADD COLUMN category VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'knowledge_sources' AND column_name = 'owner_only') THEN
        ALTER TABLE knowledge_sources ADD COLUMN owner_only BOOLEAN DEFAULT false;
    END IF;
END $$;
