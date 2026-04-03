-- ─────────────────────────────────────────────────────────────────────
-- V5 · Add icon columns (icon_name, icon_bg_color) to categories and budgets
--      These columns were referenced in entities but missing in migrations
-- ─────────────────────────────────────────────────────────────────────

-- Add icon columns to categories table
ALTER TABLE categories
    ADD COLUMN icon_name VARCHAR(60) NULL,
    ADD COLUMN icon_bg_color VARCHAR(20) NULL;

-- Add icon columns to budgets table
ALTER TABLE budgets
    ADD COLUMN icon_name VARCHAR(120) NULL,
    ADD COLUMN icon_bg_color VARCHAR(20) NULL;

-- Create indexes for faster lookups
CREATE INDEX ix_categories_user_type ON categories(user_id, category_type);
CREATE INDEX ix_budgets_icon_name ON budgets(icon_name);
