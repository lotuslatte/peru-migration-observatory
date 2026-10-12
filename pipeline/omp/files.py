"""Localiza archivos ENAHO por módulo y año (nombres con mayúsculas inconsistentes, .dta o .sav)."""
import re
from pathlib import Path
from .config import ENAHO_DIR, MODULE_DIRS, MODULE_CODES

EXCLUDE = ("300a", "12g", "_500", "panel")


def enaho_file(module: str, year: int) -> Path:
    d = ENAHO_DIR / MODULE_DIRS[module]
    if module == "m34":
        pat = re.compile(rf"^sumaria-{year}\.(dta|sav)$", re.I)
    else:
        code = MODULE_CODES[module]
        pat = re.compile(rf"^enaho01a?-{year}-{code}\.(dta|sav)$", re.I)
    cands = [p for p in d.iterdir() if pat.match(p.name) and not any(x in p.name.lower() for x in EXCLUDE)]
    if not cands:
        raise FileNotFoundError(f"{module} {year} not found in {d}")
    # prefer .dta when both exist
    cands.sort(key=lambda p: (p.suffix.lower() != ".dta", p.name))
    return cands[0]
