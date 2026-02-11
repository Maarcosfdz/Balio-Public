CREATE TABLE users (
        id UUID PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        nickname VARCHAR(60) NOT NULL,
        password VARCHAR(255) NOT NULL
);

CREATE TABLE accounts (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        name VARCHAR(80) NOT NULL,
        type VARCHAR(20) NOT NULL,
        currency CHAR(3) NOT NULL DEFAULT 'EUR',
        balance NUMERIC(14,2) NOT NULL DEFAULT 0,

        CHECK (type IN ('CASH','BANK','OTHER')),
        CHECK (currency ~ '^[A-Z]{3}$'),

        CONSTRAINT fk_accounts_user
           FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE categories (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        name VARCHAR(60) NOT NULL,
        category_type VARCHAR(10) NOT NULL,

        CHECK (category_type IN ('EXPENSE', 'INCOME')),

        CONSTRAINT fk_categories_user
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE transactions (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,

        account_id UUID NULL,
        category_id UUID NULL,

        type VARCHAR(10) NOT NULL,
        name VARCHAR(120) NOT NULL,
        amount NUMERIC(14,2) NOT NULL,
        date DATE NOT NULL,
        affects_balance BOOLEAN NOT NULL DEFAULT true,

        CHECK (type IN ('EXPENSE', 'INCOME')),
        CHECK (amount > 0),

        CONSTRAINT fk_transactions_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

        CONSTRAINT fk_transactions_account
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,

        CONSTRAINT fk_transactions_category
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE filters (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        name VARCHAR(80) NOT NULL,
        definition JSONB NOT NULL,

        CONSTRAINT fk_filters_user
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE goals (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        name VARCHAR(80) NOT NULL,
        target_amount NUMERIC(14,2) NOT NULL,
        current_amount NUMERIC(14,2) NOT NULL DEFAULT 0,

        CHECK (target_amount > 0),
        CHECK (current_amount >= 0),

        CONSTRAINT fk_goals_user
           FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX ix_accounts_user ON accounts(user_id);
CREATE INDEX ix_categories_user ON categories(user_id);
CREATE INDEX ix_transactions_user_date ON transactions(user_id, date);
CREATE INDEX ix_transactions_account ON transactions(account_id);
CREATE INDEX ix_transactions_category ON transactions(category_id);
CREATE INDEX ix_filters_user ON filters(user_id);
CREATE INDEX ix_goals_user ON goals(user_id);
