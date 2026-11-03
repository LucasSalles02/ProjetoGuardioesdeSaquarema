CREATE TABLE registration_requests (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    cpf VARCHAR(11) NOT NULL CHECK (cpf ~ '^[0-9]{11}$'),
    birth_date DATE NOT NULL,
    turma TEXT NOT NULL DEFAULT '',
    escola TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    created_at TEXT NOT NULL,
    reviewed_at TEXT,
    reviewed_by TEXT REFERENCES users(id),
    user_id TEXT REFERENCES users(id),
    rejection_reason TEXT
);
CREATE UNIQUE INDEX registration_requests_pending_cpf ON registration_requests(cpf) WHERE status='PENDING';
CREATE UNIQUE INDEX registration_requests_pending_email ON registration_requests(email) WHERE status='PENDING';
CREATE UNIQUE INDEX registration_requests_pending_username ON registration_requests(username) WHERE status='PENDING';
