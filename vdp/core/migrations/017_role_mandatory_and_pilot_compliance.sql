-- Mandatory flag on process roles + pilot compliance off; root out of process.

ALTER TABLE role_process_configs
    ADD COLUMN IF NOT EXISTS mandatory BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill from stage-binding seed semantics (spine roles).
UPDATE role_process_configs SET mandatory = TRUE
WHERE role IN (
    'user',
    'internal_compliance_officer',
    'compliance_officer',
    'manager',
    'provider',
    'senior_provider'
);

-- Pilot: compliance is not a gate by default.
UPDATE role_process_configs
SET mandatory = FALSE, enabled = FALSE
WHERE role IN ('internal_compliance_officer', 'compliance_officer');

-- Admin is outside the business process.
DELETE FROM role_process_configs WHERE role = 'root';

UPDATE process_policy_meta
SET version = version + 1, updated_by = 'migration_017', updated_at = NOW()
WHERE id = 1;
