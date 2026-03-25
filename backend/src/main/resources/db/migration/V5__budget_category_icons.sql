-- Add icon fields to budget categories for UI icon picker support
ALTER TABLE budget_categories
    ADD COLUMN icon_name VARCHAR(120),
    ADD COLUMN icon_bg_color VARCHAR(20);
