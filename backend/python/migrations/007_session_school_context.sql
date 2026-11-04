ALTER TABLE sessions ADD COLUMN school_id BIGINT REFERENCES schools(id);
CREATE INDEX sessions_school_context ON sessions(school_id) WHERE school_id IS NOT NULL;
