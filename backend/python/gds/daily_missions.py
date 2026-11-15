"""Daily availability uses Brasilia dates and is recovered before every mission request."""
from datetime import date

from .errors import ApiError
from .time import day


def availability(data, current):
    result = {}
    for key in ("available_from", "available_until"):
        value = data.get(key, current.get(key))
        try:
            if value in (None, ""):
                value = None
            elif isinstance(value, str):
                value = date.fromisoformat(value)
            if value is not None and type(value) is not date:
                raise ValueError
            result[key] = value
        except (ValueError, TypeError):
            raise ApiError("Informe datas de disponibilidade validas no formato AAAA-MM-DD.") from None
    if result["available_from"] and result["available_until"] and result["available_until"] < result["available_from"]:
        raise ApiError("A data final deve ser igual ou posterior a data inicial.")
    repeatable = data.get("repeatable", current.get("repeatable", True))
    if type(repeatable) is not bool:
        raise ApiError("Informe se a missao pode ser repetida.")
    return {**result, "repeatable": repeatable}


def ensure_catalog(service, refresh=False):
    today = day()
    service.db.execute("SELECT pg_advisory_xact_lock(18022030)")
    created = service.one("INSERT INTO mission_catalog_days(date_key) VALUES (%s) ON CONFLICT DO NOTHING RETURNING date_key", (today,))
    if created or refresh:
        service.db.execute("INSERT INTO daily_missions(date_key,mission_id) SELECT %s,id FROM missions WHERE active=1 AND (available_from IS NULL OR available_from<=%s::date) AND (available_until IS NULL OR available_until>=%s::date) ON CONFLICT DO NOTHING", (today,today,today))
    return today


def available(service, today):
    return service.all("SELECT m.* FROM daily_missions d JOIN missions m ON m.id=d.mission_id WHERE d.date_key=%s AND m.active=1 AND (m.available_from IS NULL OR m.available_from<=%s::date) AND (m.available_until IS NULL OR m.available_until>=%s::date) ORDER BY m.sort_order,m.titulo", (today,today,today))
