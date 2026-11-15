ALTER TABLE users ADD COLUMN temporary_password_expires_at TIMESTAMPTZ;
-- Old pending credentials based on personal identifiers require administrative reissue.
UPDATE users SET temporary_password_expires_at=CURRENT_TIMESTAMP,
    initial_credential_version=2 WHERE must_change_password=TRUE;
UPDATE sessions SET revoked_at=CURRENT_TIMESTAMP::text
    WHERE revoked_at IS NULL AND user_id IN (SELECT id FROM users WHERE must_change_password=TRUE);
