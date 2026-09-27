-- Treasurer disable disposition: handoff or skip without silent continuity.

ALTER TABLE role_process_configs
    ADD COLUMN IF NOT EXISTS disable_mode TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS handoff_role TEXT NOT NULL DEFAULT '';
