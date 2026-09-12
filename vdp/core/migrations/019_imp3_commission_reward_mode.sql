-- IMP3: deal reward mode + fixed fee component (§10.5).
ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS fee_reward_mode TEXT;
ALTER TABLE form_payments ADD COLUMN IF NOT EXISTS fee_fix TEXT;
ALTER TABLE form_orders ADD COLUMN IF NOT EXISTS fee_reward_mode TEXT;
ALTER TABLE form_orders ADD COLUMN IF NOT EXISTS fee_fix TEXT;
