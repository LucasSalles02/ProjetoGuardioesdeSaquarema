"""Business rules ported from the Node backend, with the same REST payloads."""
import json
import math
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

from psycopg import sql

from . import games
from .errors import ApiError, unauthorized
from .security import clean, email, hash_password, identifier, profile, token, valid_password, verify_password
from .time import day, now, previous_day, week
from .validation import mission_validation, validate_mission, validate_text
from . import user_management
from .identity import cpf_digits, matches_cpf

SEED = json.loads((Path(__file__).parent / "data" / "seed.json").read_text(encoding="utf-8"))


class Service:
    def __init__(self, db):
        self.db = db

    def one(self, query, params=()):
        return self.db.execute(query, params).fetchone()

    def all(self, query, params=()):
        return self.db.execute(query, params).fetchall()

    def seed(self):
        self.db.execute("SELECT pg_advisory_xact_lock(18022027)")
        stamp = now()
        if not self.one("SELECT COUNT(*) AS n FROM missions")["n"]:
            for index, item in enumerate(SEED["missions"], 1):
                self.upsert("missions", {"id": item["id"], "titulo": item["titulo"], "descricao": item["descricao"],
                    "aprendizado": item["aprendizado"], "impacto": item["impacto"], "xp_recompensa": item["xpRecompensa"],
                    "categoria": item["categoria"], "validation_type": "list" if item["id"] == "lixo-marinho" else "quiz" if item["id"] == "quiz-ambiental" else "text",
                    "active": 1, "sort_order": index, "created_at": stamp, "updated_at": stamp})
        if not self.one("SELECT COUNT(*) AS n FROM modules")["n"]:
            for index, item in enumerate(SEED["modules"], 1):
                self.upsert("modules", {"id": item["id"], **{key: item[key] for key in ["titulo", "descricao", "tema", "objetivo", "accent"]},
                    "acao_local": item["acaoLocal"], "pergunta_guia": item["perguntaGuia"], "active": 1,
                    "sort_order": index, "created_at": stamp, "updated_at": stamp})
                for order, lesson in enumerate(item["lessons"], 1):
                    self.upsert("lessons", {**lesson, "module_id": item["id"], "active": 1,
                        "sort_order": order, "created_at": stamp, "updated_at": stamp}, ("module_id", "id"))
        if not self.one("SELECT COUNT(*) AS n FROM games_catalog")["n"]:
            for index, (game_id, title, description, xp) in enumerate([
                ("memory", "Jogo da memoria", "Encontre pares de temas ambientais.", games.MEMORY_XP),
                ("puzzle", "Quebra-cabeca 3x3", "Ordene as pecas movendo blocos para o espaco vazio.", games.PUZZLE_XP)], 1):
                self.upsert("games_catalog", {"id": game_id, "titulo": title, "descricao": description,
                    "xp_recompensa": xp, "enabled": 1, "sort_order": index, "created_at": stamp, "updated_at": stamp})

    def upsert(self, table, record, keys=("id",)):
        columns = list(record)
        updates = [key for key in columns if key not in keys and key not in ["created_at", "sort_order"]]
        query = sql.SQL("INSERT INTO {} ({}) VALUES ({}) ON CONFLICT ({}) DO UPDATE SET {}").format(
            sql.Identifier(table), sql.SQL(",").join(map(sql.Identifier, columns)),
            sql.SQL(",").join(sql.Placeholder() for _ in columns), sql.SQL(",").join(map(sql.Identifier, keys)),
            sql.SQL(",").join(sql.SQL("{}=EXCLUDED.{}").format(sql.Identifier(key), sql.Identifier(key)) for key in updates))
        self.db.execute(query, [record[key] for key in columns])

    def register(self, data):
        safe = profile(data)
        if self.one("SELECT id FROM users WHERE email=%s", (safe["email"],)):
            raise ApiError("Este email ja esta cadastrado.")
        user_id, salt, stamp = identifier("usr"), token(), now()
        self.db.execute("INSERT INTO users (id,nome,email,turma,escola,role,password_salt,password_hash,created_at,updated_at) VALUES (%s,%s,%s,%s,%s,'USER',%s,%s,%s,%s)",
            (user_id, safe["nome"], safe["email"], safe["turma"], safe["escola"], salt, hash_password(data["senha"], salt), stamp, stamp))
        self.db.execute("INSERT INTO stats (user_id) VALUES (%s)", (user_id,))
        return {"usuario": self.user(user_id), "token": self.create_session(user_id)}

    def login(self, data, admin=False):
        identity = data.get("cpf") or data.get("username" if admin else "email", "")
        try:
            cpf = cpf_digits(identity)
        except ApiError:
            cpf = None
        account = self.one("SELECT * FROM users WHERE " + ("cpf=%s" if cpf else "username=%s" if admin else "email=%s") + " FOR UPDATE",
                           (cpf or (str(identity).strip().lower() if admin else email(identity)),))
        candidate = data.get("senha")
        if account and account["must_change_password"] and matches_cpf(candidate, account["cpf"]):
            candidate = account["cpf"]
        if not account or not account["active"] or (admin and account["role"] != "ADMIN") or not verify_password(candidate, account["password_salt"], account["password_hash"]):
            raise ApiError("Usuario/email ou senha invalidos.", 401)
        return {"usuario": self.user(account["id"]), "token": self.create_session(account["id"])}

    def create_session(self, user_id):
        value = token()
        self.db.execute("INSERT INTO sessions (token,user_id,created_at) VALUES (%s,%s,%s)", (value, user_id, now()))
        return value

    def authenticate(self, value, allow_password_setup=False):
        # Serialize operations for an account, preserving exactly-once rewards under concurrent requests.
        account = self.one("SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=%s AND s.revoked_at IS NULL FOR UPDATE OF u", (value,))
        session = self.one("SELECT * FROM sessions WHERE token=%s AND revoked_at IS NULL", (value,))
        if not account or not account["active"] or not session:
            raise unauthorized()
        try:
            age = (datetime.now(timezone.utc) - datetime.fromisoformat(session["created_at"].replace("Z", "+00:00"))).total_seconds()
        except (ValueError, TypeError):
            raise unauthorized() from None
        if not 0 <= age < 8 * 60 * 60:
            raise unauthorized()
        if account["must_change_password"] and not allow_password_setup:
            raise ApiError("Defina sua nova senha antes de acessar o sistema.", 403)
        return account["id"]

    def logout(self, value):
        self.db.execute("UPDATE sessions SET revoked_at=%s WHERE token=%s", (now(), value))
        return {"ok": True}

    def require_admin(self, user_id):
        account = self.one("SELECT role,active,must_change_password FROM users WHERE id=%s", (user_id,))
        if not account or not account["active"] or account["must_change_password"] or account["role"] != "ADMIN":
            raise ApiError("Apenas administradores podem gerenciar conteudo.", 403)

    def user(self, user_id):
        account = self.one("SELECT * FROM users WHERE id=%s", (user_id,))
        if not account:
            raise unauthorized()
        return {**{key: account[key] for key in ["id", "nome", "email", "turma", "escola", "username", "role", "active", "must_change_password"]},
                "tipoUsuario": account["role"], "admin": account["role"] == "ADMIN", **self.stats(user_id)}

    def stats(self, user_id):
        self.db.execute("INSERT INTO stats (user_id) VALUES (%s) ON CONFLICT DO NOTHING", (user_id,))
        row = self.one("SELECT * FROM stats WHERE user_id=%s", (user_id,))
        xp = max(0, row["xp"])
        # Existing rule intentionally retained; EV02 changes progression separately.
        level = xp // 500 + 1
        return {"xp": xp, "nivel": level, "xpProximoNivel": level * 500,
                "percentualNivel": min(100, math.floor(xp / (level * 500) * 100 + .5)),
                "missoesConcluidas": row["missoes_concluidas"], "aulasConcluidas": row["aulas_concluidas"],
                "jogosConcluidos": row["jogos_concluidos"], "sequenciaDias": row["sequencia_dias"], "lastActiveDate": row["last_active_date"]}

    def update_profile(self, user_id, data):
        raise ApiError("Somente administradores podem editar dados cadastrais pelo gerenciamento de usuarios.", 403)

    def change_password(self, user_id, data):
        if not valid_password(data.get("novaSenha")):
            raise ApiError("A nova senha precisa ter entre 8 e 256 caracteres.")
        current = self.one("SELECT * FROM users WHERE id=%s", (user_id,))
        if matches_cpf(data.get("novaSenha"), current["cpf"]):
            raise ApiError("Escolha uma senha diferente do CPF.")
        if not verify_password(data.get("senhaAtual"), current["password_salt"], current["password_hash"]):
            raise ApiError("Nao foi possivel alterar a senha.")
        salt = token()
        self.db.execute("UPDATE users SET password_salt=%s,password_hash=%s,updated_at=%s WHERE id=%s",
                        (salt, hash_password(data["novaSenha"], salt), now(), user_id))
        self.db.execute("UPDATE sessions SET revoked_at=%s WHERE user_id=%s", (now(), user_id))
        return {"ok": True}

    def first_access_password(self, user_id, data):
        current = self.one("SELECT * FROM users WHERE id=%s", (user_id,))
        if not current["must_change_password"]:
            raise ApiError("Esta conta ja definiu sua senha inicial.")
        password = data.get("novaSenha")
        minimum = 12 if current["role"] == "ADMIN" else 8
        if not valid_password(password) or len(password) < minimum:
            raise ApiError(f"A nova senha precisa ter entre {minimum} e 256 caracteres.")
        if password != data.get("confirmarSenha"):
            raise ApiError("A confirmacao da senha nao confere.")
        if matches_cpf(password, current["cpf"]):
            raise ApiError("Escolha uma senha diferente do CPF.")
        salt, stamp = token(), now()
        self.db.execute("UPDATE users SET password_salt=%s,password_hash=%s,must_change_password=FALSE,updated_at=%s WHERE id=%s",
                        (salt, hash_password(password, salt), stamp, user_id))
        self.db.execute("UPDATE sessions SET revoked_at=%s WHERE user_id=%s AND revoked_at IS NULL", (stamp, user_id))
        return {"usuario": self.user(user_id), "token": self.create_session(user_id)}

    def rows(self, table, inactive=False):
        flag = "enabled" if table == "games_catalog" else "active"
        query = sql.SQL("SELECT * FROM {} {} ORDER BY sort_order ASC,titulo ASC").format(
            sql.Identifier(table), sql.SQL("") if inactive else sql.SQL("WHERE {}=1").format(sql.Identifier(flag)))
        return self.all(query)

    @staticmethod
    def public_mission(row):
        return {**{key: row[key] for key in ["id", "titulo", "descricao", "aprendizado", "impacto", "categoria"]},
                "xpRecompensa": row["xp_recompensa"], "validationType": row["validation_type"], "active": bool(row["active"])}

    def list_missions(self, user_id):
        done = {row["mission_id"] for row in self.all("SELECT mission_id FROM mission_submissions WHERE user_id=%s AND date_key=%s", (user_id, day()))}
        return {"missoes": [{**self.public_mission(row), "concluida": row["id"] in done,
                              "validacao": mission_validation(row, True)} for row in self.rows("missions")]}

    def submit_mission(self, user_id, mission_id, data):
        mission = self.one("SELECT * FROM missions WHERE id=%s AND active=1", (mission_id,))
        if not mission:
            raise ApiError("Missao nao encontrada.", 404)
        if self.one("SELECT id FROM mission_submissions WHERE user_id=%s AND mission_id=%s AND date_key=%s", (user_id, mission_id, day())):
            return self.no_reward(user_id)
        validated = validate_mission(mission, data)
        self.db.execute("INSERT INTO mission_submissions (id,user_id,mission_id,date_key,payload_json,created_at) VALUES (%s,%s,%s,%s,%s,%s)",
                        (identifier("msn"), user_id, mission_id, day(), json.dumps(validated, ensure_ascii=False), now()))
        return self.reward(user_id, mission["xp_recompensa"], "missao", mission["titulo"], {"mission": 1})

    def lessons(self, module_id, inactive=False):
        return [{**{key: row[key] for key in ["id", "titulo", "resumo", "habilidade", "atividade", "xp"]}, "active": bool(row["active"])}
                for row in self.all("SELECT * FROM lessons WHERE module_id=%s" + ("" if inactive else " AND active=1") + " ORDER BY sort_order,titulo", (module_id,))]

    def completed(self, user_id):
        result = {}
        for row in self.all("SELECT module_id,lesson_id FROM lesson_submissions WHERE user_id=%s", (user_id,)):
            result.setdefault(row["module_id"], set()).add(row["lesson_id"])
        return result

    def public_module(self, row, completed=None, include_lessons=False, inactive=False):
        done = completed or set()
        lessons = self.lessons(row["id"], inactive)
        result = {**{key: row[key] for key in ["id", "titulo", "descricao", "tema", "objetivo", "accent"]},
                  "acaoLocal": row["acao_local"], "perguntaGuia": row["pergunta_guia"], "active": bool(row["active"]),
                  "aulas": len(lessons), "concluidas": len(done), "percentual": math.floor(len(done) / len(lessons) * 100 + .5) if lessons else 0}
        if include_lessons:
            result["lessons"] = [{**lesson, "concluida": lesson["id"] in done} for lesson in lessons]
        return result

    def list_modules(self, user_id):
        done = self.completed(user_id)
        return {"modulos": [self.public_module(row, done.get(row["id"])) for row in self.rows("modules")]}

    def get_module(self, user_id, module_id):
        row = self.one("SELECT * FROM modules WHERE id=%s AND active=1", (module_id,))
        if not row:
            raise ApiError("Modulo nao encontrado.", 404)
        return {"modulo": self.public_module(row, self.completed(user_id).get(module_id), True)}

    def submit_lesson(self, user_id, module_id, lesson_id, data):
        module = self.get_module(user_id, module_id)["modulo"]
        lesson = next((lesson for lesson in module["lessons"] if lesson["id"] == lesson_id), None)
        if not lesson:
            raise ApiError("Aula nao encontrada.", 404)
        if lesson["concluida"]:
            return {**self.no_reward(user_id), "modulo": module}
        validated = validate_text(data.get("resposta"))
        self.db.execute("INSERT INTO lesson_submissions (id,user_id,module_id,lesson_id,payload_json,created_at) VALUES (%s,%s,%s,%s,%s,%s)",
                        (identifier("les"), user_id, module_id, lesson_id, json.dumps(validated, ensure_ascii=False), now()))
        reward = self.reward(user_id, lesson["xp"], "aula", f"{module['titulo']}: {lesson['titulo']}", {"lesson": 1})
        return {**reward, **self.get_module(user_id, module_id)}

    def achievements(self, user_id):
        awarded = {row["achievement_id"] for row in self.all("SELECT achievement_id FROM achievement_awards WHERE user_id=%s", (user_id,))}
        return {"conquistas": [{**item, "obtida": item["id"] in awarded} for item in SEED["achievements"]]}

    def progress(self, user_id):
        return {"stats": self.stats(user_id), **self.achievements(user_id)}

    def history(self, user_id):
        rows = self.all("SELECT id,tipo,descricao,xp_ganho,created_at FROM activities WHERE user_id=%s ORDER BY created_at DESC LIMIT 80", (user_id,))
        totals = {}
        for row in rows:
            key = day(datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")))
            totals[key] = totals.get(key, 0) + row["xp_ganho"]
        return {"grafico": [{"data": item["key"], "dia": item["label"], "xp": totals.get(item["key"], 0)} for item in week()],
                "atividades": [{"id": row["id"], "tipo": row["tipo"], "descricao": row["descricao"], "xpGanho": row["xp_ganho"], "createdAt": row["created_at"]} for row in rows]}

    def no_reward(self, user_id):
        user = self.user(user_id)
        return {"xpGanho": 0, "levelUp": False, "novoNivel": user["nivel"], "usuario": user, "novasConquistas": []}

    def grant(self, user_id, amount, kind, description, counters=None):
        if amount <= 0:
            return
        counters = counters or {}
        stats = self.one("SELECT * FROM stats WHERE user_id=%s", (user_id,))
        today = day()
        streak = stats["sequencia_dias"] if stats["last_active_date"] == today else stats["sequencia_dias"] + 1 if stats["last_active_date"] == previous_day(today) else 1
        self.db.execute("UPDATE stats SET xp=xp+%s,missoes_concluidas=missoes_concluidas+%s,aulas_concluidas=aulas_concluidas+%s,jogos_concluidos=jogos_concluidos+%s,sequencia_dias=%s,last_active_date=%s WHERE user_id=%s",
                        (amount, counters.get("mission", 0), counters.get("lesson", 0), counters.get("game", 0), streak, today, user_id))
        self.db.execute("INSERT INTO activities (id,user_id,tipo,descricao,xp_ganho,created_at) VALUES (%s,%s,%s,%s,%s,%s)",
                        (identifier("act"), user_id, kind, clean(description, 160), amount, now()))

    def unlock(self, user_id):
        unlocked = []
        while True:
            stats = self.stats(user_id)
            marine = next((row for row in self.list_modules(user_id)["modulos"] if row["id"] == "vida-marinha"), {})
            conditions = {"primeira-missao": stats["missoesConcluidas"] >= 1, "guardiao-do-mar": stats["missoesConcluidas"] >= 10,
                          "sequencia-tres": stats["sequenciaDias"] >= 3, "vida-marinha": marine.get("percentual") == 100,
                          "mil-xp": stats["xp"] >= 1000, "nivel-cinco": stats["nivel"] >= 5}
            awarded = {row["achievement_id"] for row in self.all("SELECT achievement_id FROM achievement_awards WHERE user_id=%s", (user_id,))}
            pending = [item for item in SEED["achievements"] if conditions.get(item["id"]) and item["id"] not in awarded]
            if not pending:
                return unlocked
            for item in pending:
                self.db.execute("INSERT INTO achievement_awards (id,user_id,achievement_id,xp_awarded,created_at) VALUES (%s,%s,%s,%s,%s)",
                                (identifier("ach"), user_id, item["id"], item["xp"], now()))
                self.grant(user_id, item["xp"], "conquista", f"Conquista: {item['titulo']}")
                unlocked.append({**item, "obtida": True})

    def reward(self, user_id, amount, kind, description, counters=None):
        before = self.stats(user_id)
        self.grant(user_id, amount, kind, description, counters)
        achievements = self.unlock(user_id)
        user = self.user(user_id)
        return {"xpGanho": user["xp"] - before["xp"], "levelUp": user["nivel"] > before["nivel"],
                "novoNivel": user["nivel"], "usuario": user, "novasConquistas": achievements}

    @staticmethod
    def public_game(row):
        return {**{key: row[key] for key in ["id", "titulo", "descricao"]}, "xpRecompensa": row["xp_recompensa"], "enabled": bool(row["enabled"])}

    def list_games(self):
        return {"jogos": [self.public_game(row) for row in self.rows("games_catalog")]}

    def start_game(self, user_id, game_type):
        game = self.one("SELECT * FROM games_catalog WHERE id=%s AND enabled=1", (game_type,))
        if not game:
            raise ApiError("Jogo nao encontrado ou desativado.", 404)
        state = games.memory_state(game["xp_recompensa"]) if game_type == "memory" else games.puzzle_state(game["xp_recompensa"])
        session_id, stamp = identifier("game"), now()
        self.db.execute("INSERT INTO game_sessions (id,user_id,game_type,state_json,completed_at,reward_granted,created_at,updated_at) VALUES (%s,%s,%s,%s,NULL,0,%s,%s)",
                        (session_id, user_id, game_type, json.dumps(state, ensure_ascii=False), stamp, stamp))
        return {"sessionId": session_id, "jogo": games.public_memory(state) if game_type == "memory" else games.public_puzzle(state)}

    def play_game(self, user_id, game_type, session_id, data):
        row = self.one("SELECT * FROM game_sessions WHERE id=%s AND user_id=%s AND game_type=%s FOR UPDATE", (session_id, user_id, game_type))
        if not row:
            raise ApiError("Sessao de jogo nao encontrada.", 404)
        state = json.loads(row["state_json"])
        event = games.flip(state, data.get("cardId")) if game_type == "memory" else games.move(state, data.get("tile"))
        reward = self.no_reward(user_id)
        if state["completed"] and not row["reward_granted"]:
            reward = self.reward(user_id, state["xpReward"], "jogo", "Jogo da memoria concluido" if game_type == "memory" else "Quebra-cabeca concluido", {"game": 1})
            row["reward_granted"], row["completed_at"] = 1, now()
        self.db.execute("UPDATE game_sessions SET state_json=%s,completed_at=%s,reward_granted=%s,updated_at=%s WHERE id=%s",
                        (json.dumps(state, ensure_ascii=False), row["completed_at"], row["reward_granted"], now(), session_id))
        return {**reward, "sessionId": session_id, "jogo": games.public_memory(state) if game_type == "memory" else games.public_puzzle(state), "evento": event}

    def admin_users(self, user_id):
        return user_management.list_users(self, user_id)

    def admin_user(self, user_id, target_id):
        return user_management.get_user(self, user_id, target_id)

    def admin_create_user(self, user_id, data):
        return user_management.create_user(self, user_id, data)

    def admin_deactivate_user(self, user_id, target_id):
        return user_management.deactivate_user(self, user_id, target_id)

    def admin_edit_user(self, user_id, target_id, data):
        return user_management.edit_user(self, user_id, target_id, data)

    def admin_reset_password(self, user_id, target_id):
        return user_management.reset_password(self, user_id, target_id)

    def admin_content(self, user_id):
        self.require_admin(user_id)
        return {"missoes": [self.public_mission(row) for row in self.rows("missions", True)],
                "modulos": [self.public_module(row, include_lessons=True, inactive=True) for row in self.rows("modules", True)],
                "jogos": [self.public_game(row) for row in self.rows("games_catalog", True)]}

    def save_content(self, user_id, kind, item_id, data, module_id=None):
        self.require_admin(user_id)
        table = {"mission": "missions", "module": "modules", "lesson": "lessons", "game": "games_catalog"}[kind]
        item_id = content_id(item_id or data.get("id") or data.get("titulo"), {"mission": "missao", "module": "modulo", "lesson": "aula", "game": "game"}[kind])
        if kind == "game" and item_id not in ["memory", "puzzle"]:
            raise ApiError("Por enquanto, os motores disponiveis sao memory e puzzle.")
        if kind == "lesson" and not self.one("SELECT id FROM modules WHERE id=%s", (module_id,)):
            raise ApiError("Modulo nao encontrado.", 404)
        current = self.one(sql.SQL("SELECT * FROM {} WHERE id=%s" + (" AND module_id=%s" if kind == "lesson" else "")).format(sql.Identifier(table)),
                           (item_id, module_id) if kind == "lesson" else (item_id,)) or {}
        def value(key, default=None, *aliases):
            return next((data[name] for name in (key, *aliases) if data.get(name) is not None), current.get(key, default))
        def text(key, maximum, default=None, *aliases):
            result = clean(value(key, default, *aliases), maximum)
            if not result:
                raise ApiError("Campo obrigatorio.")
            return result
        record = {"id": item_id, "titulo": text("titulo", 100), "created_at": current.get("created_at", now()), "updated_at": now()}
        if kind == "lesson":
            record.update({"module_id": module_id, "resumo": text("resumo", 500), "habilidade": text("habilidade", 160, "Aplicar conhecimento ambiental"),
                           "atividade": text("atividade", 300, "Responda a atividade com suas palavras."), "xp": content_number(value("xp", 50)), "active": int(bool(value("active", True)))})
        else:
            record["descricao"] = text("descricao", 300 if kind == "game" else 500)
            if kind in ["mission", "game"]:
                default_xp = (games.MEMORY_XP if item_id == "memory" else games.PUZZLE_XP) if kind == "game" else 40
                record["xp_recompensa"] = content_number(value("xp_recompensa", default_xp, "xpRecompensa"))
            if kind == "mission":
                validation_type = data.get("validationType") or data.get("validation_type")
                record.update({"aprendizado": text("aprendizado", 120, "Acao ambiental"), "impacto": text("impacto", 500, "Impacto ambiental positivo."),
                    "categoria": text("categoria", 80, "Geral"), "validation_type": validation_type if validation_type in ["text", "list"] else current.get("validation_type", "text")})
            if kind == "module":
                record.update({"tema": text("tema", 80, "Ambiental"), "objetivo": text("objetivo", 500, "Aprender e aplicar uma atitude ambiental."),
                    "acao_local": text("acao_local", 500, "Registrar uma acao local.", "acaoLocal"), "pergunta_guia": text("pergunta_guia", 500, "Como aplicar esse conhecimento?", "perguntaGuia"),
                    "accent": text("accent", 80, "from-sky-600 to-emerald-500")})
            flag = "enabled" if kind == "game" else "active"
            record[flag] = int(bool(value(flag, True)))
        query = sql.SQL("SELECT COALESCE(MAX(sort_order),0)+1 AS n FROM {}" + (" WHERE module_id=%s" if kind == "lesson" else "")).format(sql.Identifier(table))
        record["sort_order"] = current.get("sort_order") or self.one(query, (module_id,) if kind == "lesson" else ())["n"]
        self.upsert(table, record, ("module_id", "id") if kind == "lesson" else ("id",))
        if kind == "lesson":
            return {"modulo": self.public_module(self.one("SELECT * FROM modules WHERE id=%s", (module_id,)), include_lessons=True, inactive=True)}
        row = self.one(sql.SQL("SELECT * FROM {} WHERE id=%s").format(sql.Identifier(table)), (item_id,))
        if kind == "module":
            return {"modulo": self.public_module(row, include_lessons=True, inactive=True)}
        return {"missao": self.public_mission(row)} if kind == "mission" else {"jogo": self.public_game(row)}


def content_id(value, prefix):
    value = unicodedata.normalize("NFD", str(value or ""))
    value = "".join(char for char in value if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")[:48] or identifier(prefix)


def content_number(value):
    try:
        number = float(value)
    except (ValueError, TypeError):
        number = float("nan")
    if not math.isfinite(number) or not 5 <= number <= 500:
        raise ApiError("Informe um numero entre 5 e 500.")
    return math.floor(number + .5)
