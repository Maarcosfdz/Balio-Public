-- ─────────────────────────────────────────────────────────────────────
-- V5 · Consolidated migration (replaces old V5..V10 chain)
-- Final schema state:
--   - icon columns in categories/budgets/goals/budget_categories
--   - bank rule action columns (exclude_match, amount_multiplier)
--   - accounts.sync_deleted_transactions flag
-- Note: old temporary bank_ignored_transactions table is intentionally absent.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS icon_name VARCHAR(60),
    ADD COLUMN IF NOT EXISTS icon_bg_color VARCHAR(20);

ALTER TABLE budgets
    ADD COLUMN IF NOT EXISTS icon_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS icon_bg_color VARCHAR(20);

ALTER TABLE goals
    ADD COLUMN IF NOT EXISTS icon_name VARCHAR(60),
    ADD COLUMN IF NOT EXISTS icon_bg_color VARCHAR(20);

ALTER TABLE budget_categories
    ADD COLUMN IF NOT EXISTS icon_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS icon_bg_color VARCHAR(20);

ALTER TABLE bank_transaction_rules
    ADD COLUMN IF NOT EXISTS exclude_match BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS amount_multiplier NUMERIC(12,4);

UPDATE bank_transaction_rules
SET amount_multiplier = 1.0000
WHERE amount_multiplier IS NULL;

ALTER TABLE accounts
    ADD COLUMN IF NOT EXISTS sync_deleted_transactions BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS ix_categories_user_type ON categories(user_id, category_type);
CREATE INDEX IF NOT EXISTS ix_budgets_icon_name ON budgets(icon_name);
CREATE INDEX IF NOT EXISTS ix_goals_icon_name ON goals(icon_name);
