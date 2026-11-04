CREATE TABLE school_stages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(80) NOT NULL CHECK(length(trim(name)) BETWEEN 2 AND 80),
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK(sort_order BETWEEN 0 AND 999),
    active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX school_stages_name_unique ON school_stages(lower(name));
INSERT INTO school_stages(name,sort_order) VALUES ('2º ano',2),('3º ano',3),('4º ano',4),('5º ano',5),('6º ano',6);

CREATE TABLE school_classes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES schools(id),
    stage_id BIGINT NOT NULL REFERENCES school_stages(id),
    identification VARCHAR(80) NOT NULL CHECK(length(trim(identification)) BETWEEN 2 AND 80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id,school_id)
);
CREATE UNIQUE INDEX school_classes_name_unique ON school_classes(school_id,lower(identification));

CREATE TABLE student_school_memberships (
    student_id TEXT PRIMARY KEY REFERENCES users(id),
    school_id BIGINT NOT NULL REFERENCES schools(id),
    registration_number VARCHAR(40) NOT NULL CHECK(length(trim(registration_number)) BETWEEN 1 AND 40),
    class_id BIGINT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(class_id,school_id) REFERENCES school_classes(id,school_id),
    UNIQUE(school_id,registration_number)
);
CREATE INDEX student_memberships_school ON student_school_memberships(school_id,class_id);

CREATE TABLE class_enrollment_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES users(id),
    school_id BIGINT NOT NULL REFERENCES schools(id),
    from_class_id BIGINT REFERENCES school_classes(id),
    to_class_id BIGINT REFERENCES school_classes(id),
    actor_id TEXT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

UPDATE access_profiles SET permissions=permissions || '["school_stages.read","school_stages.create","school_stages.update"]'::jsonb WHERE id='ADMIN';
