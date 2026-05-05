-- V7 · Goal ↔ Account linking
-- Allows each goal to be linked to one or more bank accounts.
-- The application enforces that the total saved amount across all
-- goals sharing the same accounts does not exceed their combined balance.

CREATE TABLE goal_accounts (
    goal_id    UUID NOT NULL,
    account_id UUID NOT NULL,

    PRIMARY KEY (goal_id, account_id),

    CONSTRAINT fk_ga_goal    FOREIGN KEY (goal_id)    REFERENCES goals(id)    ON DELETE CASCADE,
    CONSTRAINT fk_ga_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX ix_goal_accounts_goal    ON goal_accounts(goal_id);
CREATE INDEX ix_goal_accounts_account ON goal_accounts(account_id);
