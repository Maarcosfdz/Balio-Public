-- V6 · Budget category excluded transactions
-- Allows individual auto-linked transactions to be excluded
-- from a budget category's spending calculation.

CREATE TABLE budget_category_excluded_transactions (
    budget_category_id UUID NOT NULL,
    transaction_id     UUID NOT NULL,

    PRIMARY KEY (budget_category_id, transaction_id),

    CONSTRAINT fk_bcex_budget_category
        FOREIGN KEY (budget_category_id) REFERENCES budget_categories(id) ON DELETE CASCADE,
    CONSTRAINT fk_bcex_transaction
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);
