-- Provider catalog fields for registry UI (country, corridors, contact, SLA).

ALTER TABLE agents ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS corridors TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS contact TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS sla_hours INTEGER NOT NULL DEFAULT 24;
