from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

ZONE = ZoneInfo("America/Sao_Paulo")
DAY_NAMES = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]


def now():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def day(value=None):
    return (value or datetime.now(timezone.utc)).astimezone(ZONE).date().isoformat()


def previous_day(value):
    return (datetime.fromisoformat(value).date() - timedelta(days=1)).isoformat()


def week():
    current = datetime.now(ZONE).date()
    return [{"key": (date := current - timedelta(days=6-i)).isoformat(), "label": DAY_NAMES[date.weekday()]}
            for i in range(7)]
