import { achievementsSeed, dailyMissionsSeed, learningModulesSeed } from "./data/seedData.js";
import { openDatabase, withTransaction } from "./database.js";
import { badRequest, forbidden, notFound, unauthorized } from "./errors.js";
import {
  MEMORY_XP,
  PUZZLE_XP,
  createMemoryState,
  createPuzzleState,
  flipMemoryCard,
  movePuzzleTile,
  publicMemoryState,
  publicPuzzleState,
} from "./games.js";
import {
  assertSafeProfile,
  cleanText,
  generateId,
  generateToken,
  hashPassword,
  normalizeEmail,
  validatePassword,
  verifyPassword,
} from "./security.js";
import { nowISO, previousDayKey, todayKey, weeklyKeys } from "./time.js";
import {
  publicMissionValidation,
  validateLessonSubmission,
  validateMissionSubmission,
} from "./validators.js";

const XP_PER_LEVEL = 500;
const GENERIC_LOGIN_ERROR = "Usuario/email ou senha invalidos.";

export class GuardioesDeSaquaremaService {
  constructor({ dbPath, db } = {}) {
    this.db = db || openDatabase(dbPath);
    this.seedContent();

  }

  close() {
    this.db.close();
  }

  seedContent() {
    const now = nowISO();

    if (this.db.prepare("SELECT COUNT(*) AS total FROM missions").get().total === 0) {
      const insert = this.db.prepare(`
        INSERT INTO missions (
          id, titulo, descricao, aprendizado, impacto, xp_recompensa, categoria,
          validation_type, active, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
      `);

      dailyMissionsSeed.forEach((mission, index) => {
        const validationType = mission.id === "lixo-marinho"
          ? "list"
          : (mission.id === "quiz-ambiental" ? "quiz" : "text");
        insert.run(
          mission.id,
          mission.titulo,
          mission.descricao,
          mission.aprendizado,
          mission.impacto,
          mission.xpRecompensa,
          mission.categoria,
          validationType,
          index + 1,
          now,
          now,
        );
      });
    }

    if (this.db.prepare("SELECT COUNT(*) AS total FROM modules").get().total === 0) {
      const insertModule = this.db.prepare(`
        INSERT INTO modules (
          id, titulo, descricao, tema, objetivo, acao_local, pergunta_guia,
          accent, active, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
      `);
      const insertLesson = this.db.prepare(`
        INSERT INTO lessons (
          id, module_id, titulo, resumo, habilidade, atividade, xp,
          active, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
      `);

      learningModulesSeed.forEach((module, moduleIndex) => {
        insertModule.run(
          module.id,
          module.titulo,
          module.descricao,
          module.tema,
          module.objetivo,
          module.acaoLocal,
          module.perguntaGuia,
          module.accent,
          moduleIndex + 1,
          now,
          now,
        );

        module.lessons.forEach((lesson, lessonIndex) => {
          insertLesson.run(
            lesson.id,
            module.id,
            lesson.titulo,
            lesson.resumo,
            lesson.habilidade,
            lesson.atividade,
            lesson.xp,
            lessonIndex + 1,
            now,
            now,
          );
        });
      });
    }

    if (this.db.prepare("SELECT COUNT(*) AS total FROM games_catalog").get().total === 0) {
      const insert = this.db.prepare(`
        INSERT INTO games_catalog (
          id, titulo, descricao, xp_recompensa, enabled, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 1, ?, ?, ?)
      `);

      insert.run("memory", "Jogo da memoria", "Encontre pares de temas ambientais.", MEMORY_XP, 1, now, now);
      insert.run("puzzle", "Quebra-cabeca 3x3", "Ordene as pecas movendo blocos para o espaco vazio.", PUZZLE_XP, 2, now, now);
    }
  }

  register(dados) {
    return withTransaction(this.db, () => {
      const perfil = assertSafeProfile(dados);
      const existing = this.db.prepare("SELECT id FROM users WHERE email = ?").get(perfil.email);

      if (existing) {
        throw badRequest("Este email ja esta cadastrado.");
      }

      const id = generateId("usr");
      const salt = generateToken();
      const createdAt = nowISO();
      const role = "USER";
      this.db.prepare(`
        INSERT INTO users (
          id, nome, email, turma, escola, role, password_salt, password_hash, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        perfil.nome,
        perfil.email,
        perfil.turma,
        perfil.escola,
        role,
        salt,
        hashPassword(dados.senha, salt),
        createdAt,
        createdAt,
      );
      this.db.prepare("INSERT INTO stats (user_id) VALUES (?)").run(id);

      const token = this.createSession(id);
      return { usuario: this.publicUser(id), token };
    });
  }

  login({ email, username, senha }, adminOnly = false) {
    return withTransaction(this.db, () => {
      const account = adminOnly ? this.db.prepare("SELECT * FROM users WHERE username = ?").get(String(username || "").trim().toLowerCase()) : this.db.prepare("SELECT * FROM users WHERE email = ?").get(normalizeEmail(email));

      if (!account || (adminOnly && account.role !== "ADMIN") || !senha || !verifyPassword(senha, account.password_salt, account.password_hash)) {
        throw unauthorized(GENERIC_LOGIN_ERROR);
      }

      const token = this.createSession(account.id);
      return { usuario: this.publicUser(account.id), token };
    });
  }

  logout(token) {
    if (!token) return { ok: true };
    this.db.prepare("UPDATE sessions SET revoked_at = ? WHERE token = ?").run(nowISO(), token);
    return { ok: true };
  }

  me(token) {
    const userId = this.requireUserId(token);
    return { usuario: this.publicUser(userId) };
  }

  updateProfile(userId, dados) {
    return withTransaction(this.db, () => {
      const current = this.getUserRow(userId);
      const perfil = assertSafeProfile({
        nome: dados.nome ?? current.nome,
        email: current.email,
        turma: dados.turma ?? current.turma,
        escola: dados.escola ?? current.escola,
        senha: "senha-validada",
      }, { requirePassword: false });

      this.db.prepare(`
        UPDATE users
        SET nome = ?, turma = ?, escola = ?, updated_at = ?
        WHERE id = ?
      `).run(perfil.nome, perfil.turma, perfil.escola, nowISO(), userId);

      return { usuario: this.publicUser(userId) };
    });
  }

  changePassword(userId, { senhaAtual, novaSenha }) {
    return withTransaction(this.db, () => {
      if (!validatePassword(novaSenha)) {
        throw badRequest("A nova senha precisa ter pelo menos 8 caracteres.");
      }

      const current = this.getUserRow(userId);
      if (!verifyPassword(senhaAtual, current.password_salt, current.password_hash)) {
        throw badRequest("Nao foi possivel alterar a senha.");
      }

      const salt = generateToken();
      this.db.prepare(`
        UPDATE users
        SET password_salt = ?, password_hash = ?, updated_at = ?
        WHERE id = ?
      `).run(salt, hashPassword(novaSenha, salt), nowISO(), userId);

      this.db.prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ?").run(nowISO(), userId);
      return { ok: true };
    });
  }

  listMissions(userId) {
    const date = todayKey();
    const completed = new Set(
      this.db.prepare(`
        SELECT mission_id
        FROM mission_submissions
        WHERE user_id = ? AND date_key = ?
      `).all(userId, date).map((item) => item.mission_id),
    );

    return {
      missoes: this.listMissionRows().map((mission) => ({
        ...this.publicMission(mission),
        concluida: completed.has(mission.id),
        validacao: publicMissionValidation(mission),
      })),
    };
  }

  submitMission(userId, missionId, payload) {
    return withTransaction(this.db, () => {
      const mission = this.getMissionRow(missionId);
      if (!mission) throw notFound("Missao nao encontrada.");

      const date = todayKey();
      const alreadyDone = this.db.prepare(`
        SELECT id FROM mission_submissions
        WHERE user_id = ? AND mission_id = ? AND date_key = ?
      `).get(userId, missionId, date);

      if (alreadyDone) {
        return this.noRewardResult(userId);
      }

      const validatedPayload = validateMissionSubmission(mission, payload);
      this.db.prepare(`
        INSERT INTO mission_submissions (id, user_id, mission_id, date_key, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        generateId("msn"),
        userId,
        missionId,
        date,
        JSON.stringify(validatedPayload),
        nowISO(),
      );

      return this.finalizeReward(
        userId,
        mission.xp_recompensa,
        "missao",
        mission.titulo,
        { mission: 1 },
      );
    });
  }

  listModules(userId) {
    const completed = this.completedLessonMap(userId);

    return {
      modulos: this.listModuleRows().map((module) => {
        const done = completed.get(module.id) || new Set();
        return this.publicModule(module, done);
      }),
    };
  }

  getModule(userId, moduleId) {
    const module = this.getModuleRow(moduleId);
    if (!module) throw notFound("Modulo nao encontrado.");

    const done = this.completedLessonMap(userId).get(module.id) || new Set();
    return { modulo: this.publicModule(module, done, true) };
  }

  submitLesson(userId, moduleId, lessonId, payload) {
    return withTransaction(this.db, () => {
      const module = this.getModuleRow(moduleId);
      const lesson = module?.lessons.find((item) => item.id === lessonId);

      if (!module || !lesson) {
        throw notFound("Aula nao encontrada.");
      }

      const alreadyDone = this.db.prepare(`
        SELECT id FROM lesson_submissions
        WHERE user_id = ? AND module_id = ? AND lesson_id = ?
      `).get(userId, moduleId, lessonId);

      if (alreadyDone) {
        return {
          ...this.noRewardResult(userId),
          modulo: this.getModule(userId, moduleId).modulo,
        };
      }

      const validatedPayload = validateLessonSubmission(payload);
      this.db.prepare(`
        INSERT INTO lesson_submissions (id, user_id, module_id, lesson_id, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        generateId("les"),
        userId,
        moduleId,
        lessonId,
        JSON.stringify(validatedPayload),
        nowISO(),
      );

      const reward = this.finalizeReward(
        userId,
        lesson.xp,
        "aula",
        `${module.titulo}: ${lesson.titulo}`,
        { lesson: 1 },
      );

      return {
        ...reward,
        modulo: this.getModule(userId, moduleId).modulo,
      };
    });
  }

  getProgress(userId) {
    return {
      stats: this.publicStats(userId),
      conquistas: this.listAchievements(userId).conquistas,
    };
  }

  getHistory(userId) {
    const rows = this.db.prepare(`
      SELECT id, tipo, descricao, xp_ganho, created_at
      FROM activities
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 80
    `).all(userId);

    const activities = rows.map((row) => ({
      id: row.id,
      tipo: row.tipo,
      descricao: row.descricao,
      xpGanho: row.xp_ganho,
      createdAt: row.created_at,
    }));

    const xpByDate = new Map();
    rows.forEach((row) => {
      const key = todayKey(new Date(row.created_at));
      xpByDate.set(key, (xpByDate.get(key) || 0) + row.xp_ganho);
    });

    return {
      grafico: weeklyKeys().map(({ key, label }) => ({
        data: key,
        dia: label,
        xp: xpByDate.get(key) || 0,
      })),
      atividades: activities,
    };
  }

  listAchievements(userId) {
    const awarded = new Set(
      this.db.prepare("SELECT achievement_id FROM achievement_awards WHERE user_id = ?")
        .all(userId)
        .map((row) => row.achievement_id),
    );

    return {
      conquistas: achievementsSeed.map((achievement) => ({
        ...achievement,
        obtida: awarded.has(achievement.id),
      })),
    };
  }

  getGames() {
    return { jogos: this.listGameRows().map((game) => this.publicGame(game)) };
  }

  startMemory(userId) {
    const game = this.getEnabledGameRow("memory");
    return this.createGameSession(userId, "memory", createMemoryState(game.xp_recompensa), publicMemoryState);
  }

  flipMemory(userId, sessionId, cardId) {
    return withTransaction(this.db, () => {
      const session = this.getGameSession(userId, sessionId, "memory");
      const { state, event } = flipMemoryCard(JSON.parse(session.state_json), cardId);
      const reward = this.persistGameState(userId, session, state, event.completed);

      return {
        sessionId,
        jogo: publicMemoryState(state),
        evento: event,
        ...reward,
      };
    });
  }

  startPuzzle(userId) {
    const game = this.getEnabledGameRow("puzzle");
    return this.createGameSession(userId, "puzzle", createPuzzleState(game.xp_recompensa), publicPuzzleState);
  }

  movePuzzle(userId, sessionId, tile) {
    return withTransaction(this.db, () => {
      const session = this.getGameSession(userId, sessionId, "puzzle");
      const { state, event } = movePuzzleTile(JSON.parse(session.state_json), tile);
      const reward = this.persistGameState(userId, session, state, event.completed);

      return {
        sessionId,
        jogo: publicPuzzleState(state),
        evento: event,
        ...reward,
      };
    });
  }

  createSession(userId) {
    const token = generateToken();
    this.db.prepare(`
      INSERT INTO sessions (token, user_id, created_at)
      VALUES (?, ?, ?)
    `).run(token, userId, nowISO());
    return token;
  }

  requireUserId(token) {
    if (!token) {
      throw unauthorized();
    }

    const session = this.db.prepare(`
      SELECT user_id, created_at
      FROM sessions
      WHERE token = ? AND revoked_at IS NULL
    `).get(token);

    if (!session || Date.now() - Date.parse(session.created_at) >= 8 * 60 * 60 * 1000) {
      throw unauthorized();
    }

    this.getUserRow(session.user_id);
    return session.user_id;
  }

  requireAdmin(userId) {
    const user = this.getUserRow(userId);
    if (user.role !== "ADMIN") {
      throw forbidden("Apenas administradores podem gerenciar conteudo.");
    }
    return user;
  }

  listUsers(userId) {
    this.requireAdmin(userId);
    return { usuarios: this.db.prepare("SELECT id, nome, username, email, role, created_at, updated_at FROM users ORDER BY created_at DESC").all() };
  }

  getAdminContent(userId) {
    this.requireAdmin(userId);

    return {
      missoes: this.listMissionRows(true).map((mission) => this.publicMission(mission)),
      modulos: this.listModuleRows(true).map((module) => this.publicModule(module, new Set(), true)),
      jogos: this.listGameRows(true).map((game) => this.publicGame(game)),
    };
  }

  saveMission(userId, missionId, dados = {}) {
    this.requireAdmin(userId);

    return withTransaction(this.db, () => {
      const id = cleanContentId(missionId || dados.id || dados.titulo, "missao");
      const current = this.db.prepare("SELECT * FROM missions WHERE id = ?").get(id);
      const now = nowISO();
      const mission = {
        titulo: contentText(dados.titulo ?? current?.titulo, 100, "Informe o titulo da missao."),
        descricao: contentText(dados.descricao ?? current?.descricao, 500, "Informe a descricao da missao."),
        aprendizado: contentText(dados.aprendizado ?? current?.aprendizado ?? "Acao ambiental", 120),
        impacto: contentText(dados.impacto ?? current?.impacto ?? "Impacto ambiental positivo.", 500),
        xp: contentNumber(dados.xpRecompensa ?? dados.xp_recompensa ?? current?.xp_recompensa ?? 40, 5, 500),
        categoria: contentText(dados.categoria ?? current?.categoria ?? "Geral", 80),
        validationType: ["text", "list"].includes(dados.validationType || dados.validation_type)
          ? (dados.validationType || dados.validation_type)
          : (current?.validation_type || "text"),
        active: (dados.active ?? current?.active ?? true) ? 1 : 0,
      };

      this.db.prepare(`
        INSERT INTO missions (
          id, titulo, descricao, aprendizado, impacto, xp_recompensa, categoria,
          validation_type, active, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          titulo = excluded.titulo,
          descricao = excluded.descricao,
          aprendizado = excluded.aprendizado,
          impacto = excluded.impacto,
          xp_recompensa = excluded.xp_recompensa,
          categoria = excluded.categoria,
          validation_type = excluded.validation_type,
          active = excluded.active,
          updated_at = excluded.updated_at
      `).run(
        id,
        mission.titulo,
        mission.descricao,
        mission.aprendizado,
        mission.impacto,
        mission.xp,
        mission.categoria,
        mission.validationType,
        mission.active,
        current?.sort_order || this.nextSortOrder("missions"),
        current?.created_at || now,
        now,
      );

      return { missao: this.publicMission(this.db.prepare("SELECT * FROM missions WHERE id = ?").get(id)) };
    });
  }

  saveModule(userId, moduleId, dados = {}) {
    this.requireAdmin(userId);

    return withTransaction(this.db, () => {
      const id = cleanContentId(moduleId || dados.id || dados.titulo, "modulo");
      const current = this.db.prepare("SELECT * FROM modules WHERE id = ?").get(id);
      const now = nowISO();
      const module = {
        titulo: contentText(dados.titulo ?? current?.titulo, 100, "Informe o titulo do modulo."),
        descricao: contentText(dados.descricao ?? current?.descricao, 500, "Informe a descricao do modulo."),
        tema: contentText(dados.tema ?? current?.tema ?? "Ambiental", 80),
        objetivo: contentText(dados.objetivo ?? current?.objetivo ?? "Aprender e aplicar uma atitude ambiental.", 500),
        acaoLocal: contentText(dados.acaoLocal ?? dados.acao_local ?? current?.acao_local ?? "Registrar uma acao local.", 500),
        perguntaGuia: contentText(dados.perguntaGuia ?? dados.pergunta_guia ?? current?.pergunta_guia ?? "Como aplicar esse conhecimento?", 500),
        accent: contentText(dados.accent ?? current?.accent ?? "from-sky-600 to-emerald-500", 80),
        active: (dados.active ?? current?.active ?? true) ? 1 : 0,
      };

      this.db.prepare(`
        INSERT INTO modules (
          id, titulo, descricao, tema, objetivo, acao_local, pergunta_guia,
          accent, active, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          titulo = excluded.titulo,
          descricao = excluded.descricao,
          tema = excluded.tema,
          objetivo = excluded.objetivo,
          acao_local = excluded.acao_local,
          pergunta_guia = excluded.pergunta_guia,
          accent = excluded.accent,
          active = excluded.active,
          updated_at = excluded.updated_at
      `).run(
        id,
        module.titulo,
        module.descricao,
        module.tema,
        module.objetivo,
        module.acaoLocal,
        module.perguntaGuia,
        module.accent,
        module.active,
        current?.sort_order || this.nextSortOrder("modules"),
        current?.created_at || now,
        now,
      );

      return { modulo: this.publicModule(this.getModuleRow(id, true), new Set(), true) };
    });
  }

  saveLesson(userId, moduleId, lessonId, dados = {}) {
    this.requireAdmin(userId);

    return withTransaction(this.db, () => {
      const module = this.getModuleRow(moduleId, true);
      if (!module) throw notFound("Modulo nao encontrado.");

      const id = cleanContentId(lessonId || dados.id || dados.titulo, "aula");
      const current = this.db.prepare("SELECT * FROM lessons WHERE module_id = ? AND id = ?").get(moduleId, id);
      const now = nowISO();
      const lesson = {
        titulo: contentText(dados.titulo ?? current?.titulo, 100, "Informe o titulo da aula."),
        resumo: contentText(dados.resumo ?? current?.resumo, 500, "Informe o resumo da aula."),
        habilidade: contentText(dados.habilidade ?? current?.habilidade ?? "Aplicar conhecimento ambiental", 160),
        atividade: contentText(dados.atividade ?? current?.atividade ?? "Responda a atividade com suas palavras.", 300),
        xp: contentNumber(dados.xp ?? current?.xp ?? 50, 5, 500),
        active: (dados.active ?? current?.active ?? true) ? 1 : 0,
      };

      this.db.prepare(`
        INSERT INTO lessons (
          id, module_id, titulo, resumo, habilidade, atividade, xp,
          active, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(module_id, id) DO UPDATE SET
          titulo = excluded.titulo,
          resumo = excluded.resumo,
          habilidade = excluded.habilidade,
          atividade = excluded.atividade,
          xp = excluded.xp,
          active = excluded.active,
          updated_at = excluded.updated_at
      `).run(
        id,
        moduleId,
        lesson.titulo,
        lesson.resumo,
        lesson.habilidade,
        lesson.atividade,
        lesson.xp,
        lesson.active,
        current?.sort_order || this.nextLessonSortOrder(moduleId),
        current?.created_at || now,
        now,
      );

      return { modulo: this.publicModule(this.getModuleRow(moduleId, true), new Set(), true) };
    });
  }

  saveGame(userId, gameId, dados = {}) {
    this.requireAdmin(userId);

    return withTransaction(this.db, () => {
      const id = cleanContentId(gameId || dados.id, "game");
      if (!["memory", "puzzle"].includes(id)) {
        throw badRequest("Por enquanto, os motores disponiveis sao memory e puzzle.");
      }

      const current = this.db.prepare("SELECT * FROM games_catalog WHERE id = ?").get(id);
      const now = nowISO();
      const game = {
        titulo: contentText(dados.titulo ?? current?.titulo, 100, "Informe o titulo do jogo."),
        descricao: contentText(dados.descricao ?? current?.descricao, 300, "Informe a descricao do jogo."),
        xp: contentNumber(dados.xpRecompensa ?? dados.xp_recompensa ?? current?.xp_recompensa ?? (id === "memory" ? MEMORY_XP : PUZZLE_XP), 5, 500),
        enabled: (dados.enabled ?? current?.enabled ?? true) ? 1 : 0,
      };

      this.db.prepare(`
        INSERT INTO games_catalog (
          id, titulo, descricao, xp_recompensa, enabled, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          titulo = excluded.titulo,
          descricao = excluded.descricao,
          xp_recompensa = excluded.xp_recompensa,
          enabled = excluded.enabled,
          updated_at = excluded.updated_at
      `).run(
        id,
        game.titulo,
        game.descricao,
        game.xp,
        game.enabled,
        current?.sort_order || this.nextSortOrder("games_catalog"),
        current?.created_at || now,
        now,
      );

      return { jogo: this.publicGame(this.db.prepare("SELECT * FROM games_catalog WHERE id = ?").get(id)) };
    });
  }

  getUserRow(userId) {
    const row = this.db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!row) throw unauthorized();
    return row;
  }

  getStatsRow(userId) {
    const row = this.db.prepare("SELECT * FROM stats WHERE user_id = ?").get(userId);
    if (row) return row;

    this.db.prepare("INSERT INTO stats (user_id) VALUES (?)").run(userId);
    return this.db.prepare("SELECT * FROM stats WHERE user_id = ?").get(userId);
  }

  publicUser(userId) {
    const user = this.getUserRow(userId);
    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      turma: user.turma,
      escola: user.escola,
      username: user.username,
      role: user.role,
      tipoUsuario: user.role,
      admin: user.role === "ADMIN",
      ...this.publicStats(userId),
    };
  }

  publicStats(userId) {
    return normalizeStats(this.getStatsRow(userId));
  }

  listMissionRows(includeInactive = false) {
    return this.db.prepare(`
      SELECT *
      FROM missions
      ${includeInactive ? "" : "WHERE active = 1"}
      ORDER BY sort_order ASC, titulo ASC
    `).all();
  }

  getMissionRow(missionId, includeInactive = false) {
    return this.db.prepare(`
      SELECT *
      FROM missions
      WHERE id = ? ${includeInactive ? "" : "AND active = 1"}
    `).get(missionId);
  }

  publicMission(mission) {
    return {
      id: mission.id,
      titulo: mission.titulo,
      descricao: mission.descricao,
      aprendizado: mission.aprendizado,
      impacto: mission.impacto,
      xpRecompensa: mission.xp_recompensa,
      categoria: mission.categoria,
      validationType: mission.validation_type,
      active: Boolean(mission.active),
    };
  }

  listModuleRows(includeInactive = false) {
    return this.db.prepare(`
      SELECT *
      FROM modules
      ${includeInactive ? "" : "WHERE active = 1"}
      ORDER BY sort_order ASC, titulo ASC
    `).all().map((module) => ({
      ...module,
      lessons: this.listLessonRows(module.id, includeInactive),
    }));
  }

  getModuleRow(moduleId, includeInactive = false) {
    const module = this.db.prepare(`
      SELECT *
      FROM modules
      WHERE id = ? ${includeInactive ? "" : "AND active = 1"}
    `).get(moduleId);

    if (!module) return null;
    return {
      ...module,
      lessons: this.listLessonRows(module.id, includeInactive),
    };
  }

  listLessonRows(moduleId, includeInactive = false) {
    return this.db.prepare(`
      SELECT *
      FROM lessons
      WHERE module_id = ? ${includeInactive ? "" : "AND active = 1"}
      ORDER BY sort_order ASC, titulo ASC
    `).all(moduleId).map((lesson) => this.publicLesson(lesson));
  }

  publicLesson(lesson) {
    return {
      id: lesson.id,
      titulo: lesson.titulo,
      resumo: lesson.resumo,
      habilidade: lesson.habilidade,
      atividade: lesson.atividade,
      xp: lesson.xp,
      active: Boolean(lesson.active),
    };
  }

  listGameRows(includeDisabled = false) {
    return this.db.prepare(`
      SELECT *
      FROM games_catalog
      ${includeDisabled ? "" : "WHERE enabled = 1"}
      ORDER BY sort_order ASC, titulo ASC
    `).all();
  }

  getEnabledGameRow(gameId) {
    const game = this.db.prepare("SELECT * FROM games_catalog WHERE id = ? AND enabled = 1").get(gameId);
    if (!game) throw notFound("Jogo nao encontrado ou desativado.");
    return game;
  }

  publicGame(game) {
    return {
      id: game.id,
      titulo: game.titulo,
      descricao: game.descricao,
      xpRecompensa: game.xp_recompensa,
      enabled: Boolean(game.enabled),
    };
  }

  nextSortOrder(table) {
    return (this.db.prepare(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM ${table}`).get().next) || 1;
  }

  nextLessonSortOrder(moduleId) {
    return this.db.prepare(`
      SELECT COALESCE(MAX(sort_order), 0) + 1 AS next
      FROM lessons
      WHERE module_id = ?
    `).get(moduleId).next || 1;
  }

  completedLessonMap(userId) {
    const rows = this.db.prepare(`
      SELECT module_id, lesson_id
      FROM lesson_submissions
      WHERE user_id = ?
    `).all(userId);
    const map = new Map();

    rows.forEach((row) => {
      if (!map.has(row.module_id)) {
        map.set(row.module_id, new Set());
      }
      map.get(row.module_id).add(row.lesson_id);
    });

    return map;
  }

  publicModule(module, completedLessons, includeLessons = false) {
    const concluidas = completedLessons.size;
    const lessons = module.lessons || [];
    const base = {
      id: module.id,
      titulo: module.titulo,
      descricao: module.descricao,
      tema: module.tema,
      objetivo: module.objetivo,
      acaoLocal: module.acaoLocal || module.acao_local,
      perguntaGuia: module.perguntaGuia || module.pergunta_guia,
      accent: module.accent,
      active: Boolean(module.active ?? true),
      aulas: lessons.length,
      concluidas,
      percentual: lessons.length ? Math.round((concluidas / lessons.length) * 100) : 0,
    };

    if (!includeLessons) {
      return base;
    }

    return {
      ...base,
      lessons: lessons.map((lesson) => ({
        ...lesson,
        concluida: completedLessons.has(lesson.id),
      })),
    };
  }

  noRewardResult(userId) {
    const usuario = this.publicUser(userId);
    return {
      xpGanho: 0,
      levelUp: false,
      novoNivel: usuario.nivel,
      usuario,
      novasConquistas: [],
    };
  }

  finalizeReward(userId, baseXP, tipo, descricao, counters = {}) {
    const before = this.publicStats(userId);
    this.grantXP(userId, baseXP, tipo, descricao, counters);
    const novasConquistas = this.unlockAchievements(userId);
    const usuario = this.publicUser(userId);

    return {
      xpGanho: usuario.xp - before.xp,
      levelUp: usuario.nivel > before.nivel,
      novoNivel: usuario.nivel,
      usuario,
      novasConquistas,
    };
  }

  grantXP(userId, amount, tipo, descricao, counters = {}) {
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    const stats = this.getStatsRow(userId);
    const activeDate = todayKey();
    const continued = stats.last_active_date === previousDayKey(activeDate);
    const sameDay = stats.last_active_date === activeDate;
    const sequencia = sameDay ? stats.sequencia_dias : (continued ? stats.sequencia_dias + 1 : 1);

    this.db.prepare(`
      UPDATE stats
      SET
        xp = xp + ?,
        missoes_concluidas = missoes_concluidas + ?,
        aulas_concluidas = aulas_concluidas + ?,
        jogos_concluidos = jogos_concluidos + ?,
        sequencia_dias = ?,
        last_active_date = ?
      WHERE user_id = ?
    `).run(
      amount,
      counters.mission || 0,
      counters.lesson || 0,
      counters.game || 0,
      sequencia,
      activeDate,
      userId,
    );

    this.db.prepare(`
      INSERT INTO activities (id, user_id, tipo, descricao, xp_ganho, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(generateId("act"), userId, tipo, cleanText(descricao, 160), amount, nowISO());
  }

  unlockAchievements(userId) {
    const unlocked = [];
    let changed = true;

    while (changed) {
      changed = false;
      const awarded = new Set(
        this.db.prepare("SELECT achievement_id FROM achievement_awards WHERE user_id = ?")
          .all(userId)
          .map((row) => row.achievement_id),
      );
      const conditions = this.achievementConditions(userId);

      achievementsSeed.forEach((achievement) => {
        if (!conditions[achievement.id] || awarded.has(achievement.id)) {
          return;
        }

        this.db.prepare(`
          INSERT INTO achievement_awards (id, user_id, achievement_id, xp_awarded, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(generateId("ach"), userId, achievement.id, achievement.xp, nowISO());
        this.grantXP(userId, achievement.xp, "conquista", `Conquista: ${achievement.titulo}`);
        unlocked.push({ ...achievement, obtida: true });
        changed = true;
      });
    }

    return unlocked;
  }

  achievementConditions(userId) {
    const stats = this.publicStats(userId);
    const modules = this.listModules(userId).modulos;
    const vidaMarinha = modules.find((module) => module.id === "vida-marinha");

    return {
      "primeira-missao": stats.missoesConcluidas >= 1,
      "guardiao-do-mar": stats.missoesConcluidas >= 10,
      "sequencia-tres": stats.sequenciaDias >= 3,
      "vida-marinha": vidaMarinha?.percentual === 100,
      "mil-xp": stats.xp >= 1000,
      "nivel-cinco": stats.nivel >= 5,
    };
  }

  createGameSession(userId, gameType, state, publicState) {
    return withTransaction(this.db, () => {
      const id = generateId("game");
      const createdAt = nowISO();
      this.db.prepare(`
        INSERT INTO game_sessions (
          id, user_id, game_type, state_json, completed_at, reward_granted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, 0, ?, ?)
      `).run(id, userId, gameType, JSON.stringify(state), createdAt, createdAt);

      return {
        sessionId: id,
        jogo: publicState(state),
      };
    });
  }

  getGameSession(userId, sessionId, gameType) {
    const row = this.db.prepare(`
      SELECT *
      FROM game_sessions
      WHERE id = ? AND user_id = ? AND game_type = ?
    `).get(sessionId, userId, gameType);

    if (!row) {
      throw notFound("Sessao de jogo nao encontrada.");
    }

    return row;
  }

  persistGameState(userId, session, state, completed) {
    let reward = this.noRewardResult(userId);
    let rewardGranted = session.reward_granted;
    let completedAt = session.completed_at;

    if (completed && !session.reward_granted) {
      const isMemory = session.game_type === "memory";
      reward = this.finalizeReward(
        userId,
        state.xpReward,
        "jogo",
        isMemory ? "Jogo da memoria concluido" : "Quebra-cabeca concluido",
        { game: 1 },
      );
      rewardGranted = 1;
      completedAt = nowISO();
    }

    this.db.prepare(`
      UPDATE game_sessions
      SET state_json = ?, completed_at = ?, reward_granted = ?, updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify(state), completedAt, rewardGranted, nowISO(), session.id);

    return reward;
  }
}

function normalizeStats(stats = {}) {
  const xp = Number.isFinite(stats.xp) ? Math.max(0, stats.xp) : 0;
  const nivel = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpProximoNivel = nivel * XP_PER_LEVEL;
  const percentualNivel = Math.min(100, Math.round((xp / xpProximoNivel) * 100));

  return {
    xp,
    nivel,
    xpProximoNivel,
    percentualNivel,
    missoesConcluidas: Number.isFinite(stats.missoes_concluidas) ? stats.missoes_concluidas : 0,
    aulasConcluidas: Number.isFinite(stats.aulas_concluidas) ? stats.aulas_concluidas : 0,
    jogosConcluidos: Number.isFinite(stats.jogos_concluidos) ? stats.jogos_concluidos : 0,
    sequenciaDias: Number.isFinite(stats.sequencia_dias) ? stats.sequencia_dias : 0,
    lastActiveDate: stats.last_active_date || null,
  };
}

function cleanContentId(value, prefix) {
  const base = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return base || generateId(prefix);
}

function contentText(value, maxLength, message = "Campo obrigatorio.") {
  const cleaned = cleanText(value, maxLength);
  if (!cleaned) {
    throw badRequest(message);
  }
  return cleaned;
}

function contentNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw badRequest(`Informe um numero entre ${min} e ${max}.`);
  }
  return Math.round(number);
}
