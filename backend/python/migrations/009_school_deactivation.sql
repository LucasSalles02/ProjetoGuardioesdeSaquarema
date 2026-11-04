ALTER TABLE schools ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE schools ADD COLUMN deactivated_at TIMESTAMPTZ;
ALTER TABLE schools ADD COLUMN deactivated_by TEXT REFERENCES users(id);

CREATE TABLE school_deactivations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES schools(id),
    actor_id TEXT NOT NULL REFERENCES users(id),
    student_links JSONB NOT NULL,
    manager_ids JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

UPDATE access_profiles SET permissions=permissions || '["institutions.deactivate"]'::jsonb WHERE id='ADMIN';
