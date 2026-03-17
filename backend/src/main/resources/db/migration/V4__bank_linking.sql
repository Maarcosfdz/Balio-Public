-- ============================================================
-- V4: Bank linking – TrueLayer integration
-- ============================================================

-- 1. bank_connections: stores OAuth tokens per linked BANK account
CREATE TABLE bank_connections (
        id                      UUID PRIMARY KEY,
        account_id              UUID NOT NULL UNIQUE,
        user_id                 UUID NOT NULL,
        provider                VARCHAR(100),
        truelayer_account_id    VARCHAR(100),
        access_token            TEXT NOT NULL,
        refresh_token           TEXT NOT NULL,
        token_expiry            TIMESTAMP NOT NULL,
        consent_expires         TIMESTAMP,
        last_sync               TIMESTAMP,

        CONSTRAINT fk_bc_account
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
        CONSTRAINT fk_bc_user
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. bank_transaction_rules: user-defined mapping rules for bank transactions
CREATE TABLE bank_transaction_rules (
        id                      UUID PRIMARY KEY,
        user_id                 UUID NOT NULL,
        name_pattern            VARCHAR(200),
        bank_category           VARCHAR(100),
        mapped_name             VARCHAR(120),
        mapped_category_id      UUID,
        priority                INT NOT NULL DEFAULT 0,

        CONSTRAINT fk_btr_user
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_btr_category
            FOREIGN KEY (mapped_category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 3. Extend transactions with bank metadata
ALTER TABLE transactions
    ADD COLUMN bank_category VARCHAR(100),
    ADD COLUMN external_id   VARCHAR(150);

CREATE UNIQUE INDEX ix_transactions_external
    ON transactions(account_id, external_id)
    WHERE external_id IS NOT NULL;

-- 4. Indices
CREATE INDEX ix_bank_connections_user ON bank_connections(user_id);
CREATE INDEX ix_bank_transaction_rules_user ON bank_transaction_rules(user_id);

-- 5. chart_widgets: persisted user-defined analytics widgets
CREATE TABLE chart_widgets (
        id              UUID PRIMARY KEY,
        user_id         UUID NOT NULL,
        name            VARCHAR(100) NOT NULL,
        widget_type     VARCHAR(20) NOT NULL,
        chart_type      VARCHAR(30) NOT NULL,
        configuration   JSONB NOT NULL,
        is_pinned       BOOLEAN NOT NULL DEFAULT false,
        is_visible      BOOLEAN NOT NULL DEFAULT true,
        display_order   INT,
        layout_size     VARCHAR(20),

        CHECK (widget_type IN ('CHART', 'KPI', 'TABLE')),
        CHECK (chart_type IN ('BAR', 'LINE', 'AREA', 'PIE', 'DONUT',
                              'STACKED_BAR', 'KPI_CARD', 'SUMMARY_TABLE')),

        CONSTRAINT fk_chart_widgets_user
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX ix_chart_widgets_user ON chart_widgets(user_id);
CREATE INDEX ix_chart_widgets_user_pinned ON chart_widgets(user_id, is_pinned);
CREATE INDEX ix_chart_widgets_user_visible ON chart_widgets(user_id, is_visible);
