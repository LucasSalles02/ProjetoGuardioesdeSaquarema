ALTER TABLE users ADD COLUMN cpf VARCHAR(11);
ALTER TABLE users ADD COLUMN birth_date DATE;
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD CONSTRAINT users_cpf_format CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$');
CREATE UNIQUE INDEX users_cpf_unique ON users(cpf) WHERE cpf IS NOT NULL;
