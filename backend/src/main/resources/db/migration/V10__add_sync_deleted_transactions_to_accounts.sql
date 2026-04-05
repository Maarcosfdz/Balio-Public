ALTER TABLE accounts
ADD COLUMN sync_deleted_transactions BOOLEAN NOT NULL DEFAULT FALSE;
