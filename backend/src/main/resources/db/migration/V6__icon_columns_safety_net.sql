-- ─────────────────────────────────────────────────────────────────────
-- V6 · Icon columns safety net
-- Merged from old V7 to keep one pending migration only.
-- Idempotent by design (safe on partially migrated databases).
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

CREATE INDEX IF NOT EXISTS ix_budgets_icon_name ON budgets(icon_name);
CREATE INDEX IF NOT EXISTS ix_goals_icon_name ON goals(icon_name);
CREATE INDEX IF NOT EXISTS ix_categories_user_type ON categories(user_id, category_type);
