-- V7 · Bank/import rule actions: exclude match and amount multiplier

ALTER TABLE bank_transaction_rules
    ADD COLUMN IF NOT EXISTS exclude_match BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS amount_multiplier NUMERIC(12,4);

UPDATE bank_transaction_rules
SET amount_multiplier = 1.0000
WHERE amount_multiplier IS NULL;
