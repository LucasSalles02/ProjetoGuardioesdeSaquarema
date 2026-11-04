CREATE TABLE access_profiles (
 id TEXT PRIMARY KEY, name VARCHAR(60) NOT NULL,
 base_role TEXT NOT NULL CHECK (base_role IN ('ADMIN','GESTOR_ESCOLAR','USER')),
 system BOOLEAN NOT NULL DEFAULT FALSE, description TEXT NOT NULL DEFAULT '',
 permissions JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(permissions)='array'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX access_profiles_name_unique ON access_profiles (lower(name));
INSERT INTO access_profiles (id,name,base_role,system,description,permissions) VALUES
('ADMIN','Administrador','ADMIN',TRUE,'Gerenciamento geral de usuarios, conteudos, missoes e vinculos institucionais.','["achievements.read", "classes.create", "classes.read", "classes.update", "content.create", "content.delete", "content.read", "content.update", "enrollments.read", "enrollments.update", "game_admin.update", "games.play", "games.read", "institutions.read", "institutions.update", "learning.complete", "learning.read", "mission_admin.create", "mission_admin.update", "missions.read", "missions.submit", "profiles.create", "profiles.read", "profiles.update", "progress.read", "school_progress.read", "school_progress.reports", "users.create", "users.deactivate", "users.read", "users.reset", "users.update"]'::jsonb),
('GESTOR_ESCOLAR','Gestão Escolar','GESTOR_ESCOLAR',TRUE,'Organizacao de turmas e acompanhamento pedagogico somente nas escolas autorizadas.','["classes.create", "classes.read", "classes.update", "enrollments.read", "enrollments.update", "school_progress.read", "school_progress.reports"]'::jsonb),
('USER','Aluno','USER',TRUE,'Conteudos, jogos, missoes e consulta do proprio progresso.','["achievements.read", "games.play", "games.read", "learning.complete", "learning.read", "missions.read", "missions.submit", "progress.read"]'::jsonb);
ALTER TABLE users ADD COLUMN access_profile_id TEXT REFERENCES access_profiles(id);
CREATE INDEX users_access_profile ON users(access_profile_id);
