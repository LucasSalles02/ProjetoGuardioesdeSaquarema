"""Stable identifiers for the locally bundled educational icon catalog."""
from .errors import ApiError

ICONS = {"leaf", "recycle", "waves", "fish", "turtle", "droplets", "sprout", "tree-pine", "flower", "sun", "earth", "shell", "book-open", "brain", "lightbulb", "compass", "map-pin", "binoculars", "target", "shield-check", "heart", "star", "graduation-cap", "clipboard-check"}


def validate_icon(value):
    if value is None or value == "":
        return None
    if not isinstance(value, str) or value not in ICONS:
        raise ApiError("Escolha um icone disponivel no banco de icones.")
    return value
