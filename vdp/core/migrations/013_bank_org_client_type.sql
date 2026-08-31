-- Backfill bank client org after ADD COLUMN client_type DEFAULT 'ui' on existing rows.
UPDATE organizations
SET client_type = 'bank'
WHERE id = '88888888-8888-8888-8888-888888888888'
  AND client_type <> 'bank';
