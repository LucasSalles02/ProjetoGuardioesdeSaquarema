"""Progression defined in RN21-RN26 of the updated technical report."""
import json
from pathlib import Path

LEVEL_NAMES = {item["nivelNecessario"]: item["titulo"] for item in json.loads((Path(__file__).parent / "data" / "seed.json").read_text(encoding="utf-8"))["achievements"]}
THRESHOLDS = (0, 100, 200, 300, 400, 550, 700, 850, 1000, 1200)


def level_name(level):
    return LEVEL_NAMES.get(level, f"Nível {level}")


def progression(xp):
    xp = max(0, xp)
    level = sum(xp >= threshold for threshold in THRESHOLDS)
    maximum = level == len(THRESHOLDS)
    start = THRESHOLDS[level - 1]
    target = THRESHOLDS[level] if not maximum else THRESHOLDS[-1]
    return {"nivel": level, "xpInicioNivel": start, "xpProximoNivel": target,
            "nivelMaximo": maximum, "xpFaltante": max(0, target - xp),
            "percentualNivel": 100 if maximum else min(100, (xp - start) * 100 // (target - start))}
