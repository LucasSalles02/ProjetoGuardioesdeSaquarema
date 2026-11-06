"""Administrator-curated homepage highlights. No demo content or images are seeded."""
import base64
import binascii
from urllib.parse import quote, urlsplit

from . import access
from .errors import ApiError
from .security import identifier

TYPES = {"game": "games.read", "mission": "missions.read", "module": "learning.read", "lesson": "learning.read"}


def targets(service):
    result = []
    for kind, table, flag in [("game", "games_catalog", "enabled"), ("mission", "missions", "active"), ("module", "modules", "active")]:
        # Table and column names are internal constants, never request input.
        for row in service.all(f"SELECT id,titulo,{flag} AS active FROM {table} ORDER BY sort_order,id"):
            result.append({"kind": kind, "id": row["id"], "module_id": "", "title": row["titulo"], "active": bool(row["active"])})
    for row in service.all("SELECT l.id,l.module_id,l.titulo,m.titulo AS module_title,(l.active=1 AND m.active=1) AS active FROM lessons l JOIN modules m ON m.id=l.module_id ORDER BY m.sort_order,l.sort_order,l.id"):
        result.append({"kind": "lesson", "id": row["id"], "module_id": row["module_id"], "title": row["module_title"] + " · " + row["titulo"], "active": row["active"]})
    return result


def target_key(row):
    return (row["target_kind"], row["target_id"], row["module_id"])


def destination(row):
    item = quote(row["target_id"], safe="")
    if row["target_kind"] == "module":
        return "/aprender/" + item
    if row["target_kind"] == "lesson":
        return "/aprender/" + quote(row["module_id"], safe="") + "#aula-" + item
    return ("/jogos#jogo-" if row["target_kind"] == "game" else "/missoes#missao-") + item


def listing(service, actor, administrative=False):
    if administrative:
        service.require_admin(actor)
        access.require(service, actor, "highlights.read")
    grants = set(access.effective(service, actor)["permissions"])
    catalog = targets(service)
    by_key = {(t["kind"], t["id"], t["module_id"]): t for t in catalog}
    rows = service.all("SELECT * FROM home_highlights ORDER BY sort_order,created_at,id")
    output = []
    for row in rows:
        target = by_key.get(target_key(row))
        available = bool(target and target["active"])
        if not administrative and (not row["active"] or not available or TYPES[row["target_kind"]] not in grants):
            continue
        output.append({**{k: v for k, v in row.items() if k not in ["created_at", "updated_at"]}, "href": destination(row), "target_title": target["title"] if target else "Conteúdo removido", "available": available})
    return {"destaques": output, "interval_seconds": service.one("SELECT interval_seconds FROM home_highlight_settings WHERE id=1")["interval_seconds"], **({"conteudos": catalog} if administrative else {})}


def save_settings(service, actor, data):
    service.require_admin(actor)
    access.require(service, actor, "highlights.update")
    interval = data.get("interval_seconds")
    if type(interval) is not int or not 2 <= interval <= 300:
        raise ApiError("Informe um intervalo inteiro entre 2 e 300 segundos.")
    service.db.execute("UPDATE home_highlight_settings SET interval_seconds=%s WHERE id=1", (interval,))
    return {"interval_seconds": interval}


def text(data, field, maximum, required=False):
    value = data.get(field, "")
    if not isinstance(value, str) or len(value.strip()) > maximum or (required and not value.strip()):
        raise ApiError(f"Campo {field} inválido (máximo de {maximum} caracteres).")
    return value.strip()


def validate_image(value):
    if not value:
        return
    if value.startswith("data:"):
        header, separator, encoded = value.partition(",")
        if not separator or header not in ["data:image/png;base64", "data:image/jpeg;base64", "data:image/webp;base64"]:
            raise ApiError("Use uma imagem PNG, JPEG ou WebP.")
        try:
            raw = base64.b64decode(encoded, validate=True)
        except (ValueError, binascii.Error):
            raise ApiError("Imagem inválida.") from None
        valid = (header == "data:image/png;base64" and raw.startswith(b"\x89PNG\r\n\x1a\n")) or (header == "data:image/jpeg;base64" and raw.startswith(b"\xff\xd8\xff")) or (header == "data:image/webp;base64" and raw.startswith(b"RIFF") and raw[8:12] == b"WEBP")
        if not valid or len(raw) > 700_000:
            raise ApiError("Imagem inválida ou maior que 700 KB.")
    else:
        try:
            parsed = urlsplit(value)
            valid = len(value) <= 2048 and parsed.scheme == "https" and bool(parsed.hostname) and not parsed.username and not parsed.password and not any(c.isspace() for c in value)
        except ValueError:
            valid = False
        if not valid:
            raise ApiError("Informe uma URL HTTPS válida ou envie uma imagem.")


def save(service, actor, data, highlight_id=None):
    service.require_admin(actor)
    access.require(service, actor, "highlights.update" if highlight_id else "highlights.create")
    if highlight_id and not service.one("SELECT id FROM home_highlights WHERE id=%s FOR UPDATE", (highlight_id,)):
        raise ApiError("Destaque não encontrado.", 404)
    title = text(data, "title", 100, True)
    description = text(data, "description", 300)
    kind, item, parent = text(data, "target_kind", 20, True), text(data, "target_id", 100, True), text(data, "module_id", 100)
    target = next((t for t in targets(service) if (t["kind"], t["id"], t["module_id"]) == (kind, item, parent)), None)
    if not target:
        raise ApiError("Selecione um conteúdo já cadastrado na plataforma.")
    active, order, color = data.get("active", False), data.get("sort_order", 0), data.get("color", "blue")
    if not isinstance(active, bool) or type(order) is not int or not 0 <= order <= 9999 or color not in ["blue", "green", "yellow", "red"]:
        raise ApiError("Publicação, ordem ou cor inválida.")
    if active and not target["active"]:
        raise ApiError("Ative o conteúdo vinculado antes de publicar o destaque.")
    image, alt = text(data, "image", 940_000), text(data, "image_alt", 160)
    validate_image(image)
    if image and not alt:
        raise ApiError("Descreva a imagem para garantir a acessibilidade.")
    highlight_id = highlight_id or identifier("highlight")
    service.db.execute("INSERT INTO home_highlights (id,title,description,target_kind,target_id,module_id,image,image_alt,color,active,sort_order) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,target_kind=EXCLUDED.target_kind,target_id=EXCLUDED.target_id,module_id=EXCLUDED.module_id,image=EXCLUDED.image,image_alt=EXCLUDED.image_alt,color=EXCLUDED.color,active=EXCLUDED.active,sort_order=EXCLUDED.sort_order,updated_at=CURRENT_TIMESTAMP", (highlight_id, title, description, kind, item, parent, image, alt, color, active, order))
    return {"id": highlight_id}


def delete(service, actor, highlight_id):
    service.require_admin(actor)
    access.require(service, actor, "highlights.delete")
    if not service.db.execute("DELETE FROM home_highlights WHERE id=%s RETURNING id", (highlight_id,)).fetchone():
        raise ApiError("Destaque não encontrado.", 404)
    return {"ok": True}
