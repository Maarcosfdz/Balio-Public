-- ─────────────────────────────────────────────────────────────
-- V3 · Budgets: budget planning with categories linked to
--      transaction categories and manual transaction assignment
-- ─────────────────────────────────────────────────────────────

-- 1. budgets
CREATE TABLE budgets (
    id          UUID         PRIMARY KEY,
    user_id     UUID         NOT NULL,
    name        VARCHAR(80)  NOT NULL,
    periodicity VARCHAR(20)  NOT NULL,
    start_date  DATE         NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CHECK (periodicity IN ('WEEKLY', 'MONTHLY', 'QUARTERLY',
                            'FOUR_MONTHLY', 'BIANNUAL', 'ANNUAL')),

    CONSTRAINT fk_budgets_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX ix_budgets_user ON budgets(user_id);

-- 2. budget_categories (each budget can have up to 40)
CREATE TABLE budget_categories (
    id            UUID          PRIMARY KEY,
    budget_id     UUID          NOT NULL,
    name          VARCHAR(80)   NOT NULL,
    max_amount    NUMERIC(14,2) NOT NULL,
    display_order INT           NOT NULL DEFAULT 0,

    CHECK (max_amount > 0),

    CONSTRAINT fk_bc_budget
        FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
);

CREATE INDEX ix_budget_categories_budget ON budget_categories(budget_id);

-- 3. Join table: budget_category ↔ transaction category (auto-link)
CREATE TABLE budget_category_linked_categories (
    budget_category_id UUID NOT NULL,
    category_id        UUID NOT NULL,

    PRIMARY KEY (budget_category_id, category_id),

    CONSTRAINT fk_bclc_budget_category
        FOREIGN KEY (budget_category_id) REFERENCES budget_categories(id) ON DELETE CASCADE,
    CONSTRAINT fk_bclc_category
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- 4. Join table: budget_category ↔ transaction (manual link)
CREATE TABLE budget_category_transactions (
    budget_category_id UUID NOT NULL,
    transaction_id     UUID NOT NULL,

    PRIMARY KEY (budget_category_id, transaction_id),

    CONSTRAINT fk_bct_budget_category
        FOREIGN KEY (budget_category_id) REFERENCES budget_categories(id) ON DELETE CASCADE,
    CONSTRAINT fk_bct_transaction
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);
