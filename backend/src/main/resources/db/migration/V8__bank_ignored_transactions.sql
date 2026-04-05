-- ─────────────────────────────────────────────────────────────
-- V8 · Persist user-ignored bank transactions
-- ─────────────────────────────────────────────────────────────

CREATE TABLE bank_ignored_transactions (
    id          UUID         PRIMARY KEY,
    user_id     UUID         NOT NULL,
    account_id  UUID         NOT NULL,
    external_id VARCHAR(150) NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_bit_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_bit_account
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX ux_bank_ignored_transactions
    ON bank_ignored_transactions(user_id, account_id, external_id);

CREATE INDEX ix_bank_ignored_transactions_account
    ON bank_ignored_transactions(account_id);
