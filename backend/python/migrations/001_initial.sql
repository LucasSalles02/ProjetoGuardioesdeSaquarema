CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      turma TEXT NOT NULL DEFAULT '',
      escola TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'USER',
      username TEXT UNIQUE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      revoked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS stats (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      xp INTEGER NOT NULL DEFAULT 0,
      missoes_concluidas INTEGER NOT NULL DEFAULT 0,
      aulas_concluidas INTEGER NOT NULL DEFAULT 0,
      jogos_concluidos INTEGER NOT NULL DEFAULT 0,
      sequencia_dias INTEGER NOT NULL DEFAULT 0,
      last_active_date TEXT
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      xp_ganho INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_activities_user_created
      ON activities(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS mission_submissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mission_id TEXT NOT NULL,
      date_key TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, mission_id, date_key)
    );

    CREATE TABLE IF NOT EXISTS lesson_submissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      module_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, module_id, lesson_id)
    );

    CREATE TABLE IF NOT EXISTS achievement_awards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      achievement_id TEXT NOT NULL,
      xp_awarded INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, achievement_id)
    );

    CREATE TABLE IF NOT EXISTS game_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      game_type TEXT NOT NULL,
      state_json TEXT NOT NULL,
      completed_at TEXT,
      reward_granted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS missions (
      id TEXT PRIMARY KEY,
      titulo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      aprendizado TEXT NOT NULL,
      impacto TEXT NOT NULL,
      xp_recompensa INTEGER NOT NULL,
      categoria TEXT NOT NULL,
      validation_type TEXT NOT NULL DEFAULT 'text',
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      titulo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      tema TEXT NOT NULL,
      objetivo TEXT NOT NULL,
      acao_local TEXT NOT NULL,
      pergunta_guia TEXT NOT NULL,
      accent TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT NOT NULL,
      module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
      titulo TEXT NOT NULL,
      resumo TEXT NOT NULL,
      habilidade TEXT NOT NULL,
      atividade TEXT NOT NULL,
      xp INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (module_id, id)
    );

    CREATE TABLE IF NOT EXISTS games_catalog (
      id TEXT PRIMARY KEY,
      titulo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      xp_recompensa INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

CREATE TABLE import_receipts (source_digest TEXT PRIMARY KEY, imported_at TEXT NOT NULL, table_counts TEXT NOT NULL);
