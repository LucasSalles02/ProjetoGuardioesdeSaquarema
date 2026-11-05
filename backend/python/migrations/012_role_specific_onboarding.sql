ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ADD COLUMN registration_number VARCHAR(40);
ALTER TABLE users ADD COLUMN guardians JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN initial_credential_version SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE users ADD CONSTRAINT users_guardians_array CHECK(jsonb_typeof(guardians)='array');
UPDATE users u SET registration_number=m.registration_number
FROM student_school_memberships m WHERE m.student_id=u.id AND u.role='USER';
-- Credentials are hashed by the Python migration hook; no plaintext password is stored.
