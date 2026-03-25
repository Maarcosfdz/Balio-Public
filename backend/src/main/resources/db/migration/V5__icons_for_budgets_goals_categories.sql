-- ─────────────────────────────────────────────────────────────
-- V5 · Icon customization
--   - categories/goals/budgets: icon_name, icon_bg_color
-- ─────────────────────────────────────────────────────────────

ALTER TABLE categories
    ADD COLUMN icon_name     VARCHAR(60),
    ADD COLUMN icon_bg_color VARCHAR(20);

ALTER TABLE goals
    ADD COLUMN icon_name     VARCHAR(60),
    ADD COLUMN icon_bg_color VARCHAR(20);

ALTER TABLE budgets
    ADD COLUMN icon_name     VARCHAR(60),
    ADD COLUMN icon_bg_color VARCHAR(20);
