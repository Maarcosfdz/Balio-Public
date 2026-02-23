ALTER TABLE users
    ADD COLUMN default_account_id UUID NULL;

ALTER TABLE users
    ADD CONSTRAINT fk_users_default_account
        FOREIGN KEY (default_account_id) REFERENCES accounts(id)
            ON DELETE SET NULL;
