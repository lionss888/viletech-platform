-- B.2: organization signer/contact fields (Nest IOrganization parity) + report/purpose form fields

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS business_form TEXT NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS signer_name TEXT NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS signer_position TEXT NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS signer_other_position TEXT NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS legal_address TEXT NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ogrn TEXT NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS kpp TEXT NOT NULL DEFAULT '';

ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS payment_purpose TEXT NOT NULL DEFAULT '';
ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS actual_payment_amount TEXT NOT NULL DEFAULT '';
ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS actual_payment_date TEXT NOT NULL DEFAULT '';
