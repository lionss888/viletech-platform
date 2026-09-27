-- Legacy treasurer rows disabled before disposition existed: treat as explicit skip.
UPDATE role_process_configs
SET disable_mode = 'skip',
    handoff_role = 'manager',
    influence = CASE WHEN influence = 'none' THEN 'none' ELSE influence END
WHERE role = 'treasurer'
  AND enabled = FALSE
  AND COALESCE(disable_mode, '') = '';

UPDATE process_policy_meta
SET version = version + 1, updated_by = 'migration_021', updated_at = NOW()
WHERE id = 1
  AND EXISTS (
    SELECT 1 FROM role_process_configs
    WHERE role = 'treasurer' AND enabled = FALSE AND disable_mode = 'skip'
  );
