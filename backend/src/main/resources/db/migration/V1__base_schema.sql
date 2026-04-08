-- ─────────────────────────────────────────────────────────────
-- V1 · Base schema: users, accounts, categories, transactions,
--      filters, goals, refresh_tokens
-- ─────────────────────────────────────────────────────────────

CREATE TABLE users (
    id         UUID         PRIMARY KEY,
    email      VARCHAR(255) NOT NULL UNIQUE,
    nickname   VARCHAR(60)  NOT NULL,
    password   VARCHAR(255) NOT NULL,
    -- added in same iteration to avoid a separate ALTER TABLE migration
    default_account_id UUID NULL
);

CREATE TABLE accounts (
    id       UUID          PRIMARY KEY,
    user_id  UUID          NOT NULL,
    name     VARCHAR(80)   NOT NULL,
    type     VARCHAR(20)   NOT NULL,
    currency CHAR(3)       NOT NULL DEFAULT 'EUR',
    balance  NUMERIC(14,2) NOT NULL DEFAULT 0,

    CHECK (type IN ('CASH', 'BANK', 'OTHER')),
    CHECK (currency ~ '^[A-Z]{3}$'),

    CONSTRAINT fk_accounts_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Now that accounts exists we can add the FK on users
ALTER TABLE users
    ADD CONSTRAINT fk_users_default_account
        FOREIGN KEY (default_account_id) REFERENCES accounts(id)
            ON DELETE SET NULL;

CREATE TABLE categories (
    id            UUID        PRIMARY KEY,
    user_id       UUID        NOT NULL,
    name          VARCHAR(60) NOT NULL,
    category_type VARCHAR(10) NOT NULL,

    CHECK (category_type IN ('EXPENSE', 'INCOME')),

    CONSTRAINT fk_categories_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE transactions (
    id              UUID          PRIMARY KEY,
    user_id         UUID          NOT NULL,
    account_id      UUID          NULL,
    category_id     UUID          NULL,
    type            VARCHAR(10)   NOT NULL,
    name            VARCHAR(120)  NOT NULL,
    amount          NUMERIC(14,2) NOT NULL,
    date            DATE          NOT NULL,
    affects_balance BOOLEAN       NOT NULL DEFAULT true,

    CHECK (type IN ('EXPENSE', 'INCOME')),
    CHECK (amount > 0),

    CONSTRAINT fk_transactions_user
        FOREIGN KEY (user_id)     REFERENCES users(id)       ON DELETE CASCADE,
    CONSTRAINT fk_transactions_account
        FOREIGN KEY (account_id)  REFERENCES accounts(id)    ON DELETE SET NULL,
    CONSTRAINT fk_transactions_category
        FOREIGN KEY (category_id) REFERENCES categories(id)  ON DELETE SET NULL
);

CREATE TABLE filters (
    id         UUID        PRIMARY KEY,
    user_id    UUID        NOT NULL,
    name       VARCHAR(80) NOT NULL,
    definition JSONB       NOT NULL,

    CONSTRAINT fk_filters_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE goals (
    id             UUID          PRIMARY KEY,
    user_id        UUID          NOT NULL,
    name           VARCHAR(80)   NOT NULL,
    target_amount  NUMERIC(14,2) NOT NULL,
    current_amount NUMERIC(14,2) NOT NULL DEFAULT 0,

    CHECK (target_amount  > 0),
    CHECK (current_amount >= 0),

    CONSTRAINT fk_goals_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE refresh_tokens (
    id         UUID                     PRIMARY KEY,
    user_id    UUID                     NOT NULL,
    token      VARCHAR(255)             NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    revoked    BOOLEAN                  NOT NULL DEFAULT false,

    CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX ix_accounts_user            ON accounts(user_id);
CREATE INDEX ix_categories_user          ON categories(user_id);
CREATE INDEX ix_transactions_user_date   ON transactions(user_id, date);
CREATE INDEX ix_transactions_account     ON transactions(account_id);
CREATE INDEX ix_transactions_category    ON transactions(category_id);
CREATE INDEX ix_filters_user             ON filters(user_id);
CREATE INDEX ix_goals_user               ON goals(user_id);
CREATE INDEX ix_refresh_tokens_user      ON refresh_tokens(user_id);
CREATE INDEX ix_refresh_tokens_token     ON refresh_tokens(token);
CREATE INDEX ix_refresh_tokens_expires   ON refresh_tokens(expires_at);
