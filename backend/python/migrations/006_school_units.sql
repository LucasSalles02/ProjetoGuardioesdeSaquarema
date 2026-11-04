CREATE TABLE schools (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(160) NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 160),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX schools_name_unique ON schools (lower(name));

CREATE TABLE school_manager_links (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES schools(id),
    manager_id TEXT NOT NULL REFERENCES users(id),
    authorized BOOLEAN NOT NULL DEFAULT TRUE,
    authorized_by TEXT NOT NULL REFERENCES users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (school_id, manager_id)
);

CREATE INDEX school_manager_authorizations ON school_manager_links (manager_id, school_id) WHERE authorized=TRUE;

UPDATE access_profiles SET permissions=permissions || '["institutions.create"]'::jsonb WHERE id='ADMIN';
UPDATE access_profiles SET permissions=permissions || '["school_units.read"]'::jsonb WHERE id='GESTOR_ESCOLAR';
