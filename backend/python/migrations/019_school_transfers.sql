CREATE TABLE school_transfer_requests (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES users(id),
    student_name TEXT NOT NULL,
    registration_number TEXT NOT NULL,
    source_school_id BIGINT NOT NULL REFERENCES schools(id),
    source_name TEXT NOT NULL,
    destination_school_id BIGINT NOT NULL REFERENCES schools(id),
    destination_name TEXT NOT NULL,
    justification TEXT NOT NULL,
    evidence_reference TEXT NOT NULL DEFAULT '',
    evidence_filename TEXT,
    evidence_mime TEXT,
    evidence_data BYTEA,
    status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK(status IN ('PENDENTE','REJEITADA','APROVADA','EXECUTADA')),
    requested_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL,
    decided_by TEXT REFERENCES users(id),
    decided_at TEXT,
    decision_note TEXT NOT NULL DEFAULT '',
    executed_by TEXT REFERENCES users(id),
    executed_at TEXT,
    CHECK(source_school_id<>destination_school_id)
);
CREATE UNIQUE INDEX school_transfer_open_student ON school_transfer_requests(student_id) WHERE status IN ('PENDENTE','APROVADA');
CREATE INDEX school_transfer_origin ON school_transfer_requests(source_school_id,created_at);
CREATE TABLE school_transfer_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES school_transfer_requests(id),
    status TEXT NOT NULL CHECK(status IN ('PENDENTE','REJEITADA','APROVADA','EXECUTADA')),
    actor_id TEXT NOT NULL REFERENCES users(id),
    actor_name TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);
CREATE TABLE school_transfer_membership_history (
    transfer_id TEXT PRIMARY KEY REFERENCES school_transfer_requests(id),
    student_id TEXT NOT NULL REFERENCES users(id),
    school_id BIGINT NOT NULL REFERENCES schools(id),
    registration_number TEXT NOT NULL,
    class_id BIGINT REFERENCES school_classes(id),
    membership_updated_at TIMESTAMPTZ NOT NULL,
    closed_by TEXT NOT NULL REFERENCES users(id),
    closed_at TEXT NOT NULL
);
UPDATE access_profiles SET permissions=permissions || '["transfers.read","transfers.review","transfers.execute"]'::jsonb WHERE id='ADMIN' AND system=TRUE;
UPDATE access_profiles SET permissions=permissions || '["transfers.read","transfers.create"]'::jsonb WHERE id='GESTOR_ESCOLAR' AND system=TRUE;
