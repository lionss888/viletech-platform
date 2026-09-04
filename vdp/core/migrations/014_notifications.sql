-- Wave notifications: telegram prefs, work chats, join requests, link codes.

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS telegram_notify_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS sms_notify_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS work_chats (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS chat_join_requests (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL REFERENCES work_chats(id),
    account_id UUID NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (chat_id, account_id)
);

CREATE TABLE IF NOT EXISTS telegram_link_codes (
    code TEXT PRIMARY KEY,
    account_id UUID NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

INSERT INTO work_chats (id, title, chat_id, kind, active) VALUES
    ('wc-ops', 'Операционка', 'ops-chat', 'ops', TRUE),
    ('wc-compliance', 'Комплаенс', 'compliance-chat', 'compliance', TRUE)
ON CONFLICT (id) DO NOTHING;
