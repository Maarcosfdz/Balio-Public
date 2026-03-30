-- ─────────────────────────────────────────────────────────────
-- V4 · Multi-currency support
--   - transactions: original_amount, original_currency, exchange_rate
--   - users: preferred_currency
--   - scheduled_transactions: original_currency, exchange_rate
-- ─────────────────────────────────────────────────────────────

-- 1. Add currency columns to transactions (nullable first for backfill)
ALTER TABLE transactions
    ADD COLUMN original_amount   NUMERIC(14,2),
    ADD COLUMN original_currency CHAR(3),
    ADD COLUMN exchange_rate     NUMERIC(18,8);

-- 2. Backfill existing rows: original = account amount, rate = 1
UPDATE transactions t
SET original_amount   = t.amount,
    original_currency = COALESCE(
        (SELECT a.currency FROM accounts a WHERE a.id = t.account_id),
        'EUR'
    ),
    exchange_rate     = 1.00000000;

-- 3. Make NOT NULL after backfill
ALTER TABLE transactions
    ALTER COLUMN original_amount   SET NOT NULL,
    ALTER COLUMN original_currency SET NOT NULL,
    ALTER COLUMN exchange_rate     SET NOT NULL;

-- 4. Add constraints
ALTER TABLE transactions
    ADD CONSTRAINT chk_tx_original_currency CHECK (original_currency ~ '^[A-Z]{3}$'),
    ADD CONSTRAINT chk_tx_exchange_rate     CHECK (exchange_rate > 0);

-- 5. Add preferredCurrency to users
ALTER TABLE users
    ADD COLUMN preferred_currency CHAR(3) NOT NULL DEFAULT 'EUR';

ALTER TABLE users
    ADD CONSTRAINT chk_user_preferred_currency CHECK (preferred_currency ~ '^[A-Z]{3}$');

-- 6. Add currency columns to scheduled_transactions
ALTER TABLE scheduled_transactions
    ADD COLUMN original_currency CHAR(3),
    ADD COLUMN exchange_rate     NUMERIC(18,8);

UPDATE scheduled_transactions st
SET original_currency = COALESCE(
        (SELECT a.currency FROM accounts a WHERE a.id = st.account_id),
        'EUR'
    ),
    exchange_rate     = 1.00000000;

ALTER TABLE scheduled_transactions
    ALTER COLUMN original_currency SET NOT NULL,
    ALTER COLUMN exchange_rate     SET NOT NULL;

-- Add icon fields to budget categories for UI icon picker support
ALTER TABLE budget_categories
    ADD COLUMN icon_name VARCHAR(120),
    ADD COLUMN icon_bg_color VARCHAR(20);
