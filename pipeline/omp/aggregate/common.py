import json, math
import numpy as np
import pandas as pd
from ..config import OUT_DIR, SITE_DATA_DIR, CONFIG_DIR, HEADLINE_YEAR, YEARS, load_yaml, RSE_A, RSE_B, MIN_N
from ..engine import IND, DOM, label_for
from ..harmonise import recode_labels

CROSSWALK = pd.read_csv(CONFIG_DIR / "dept_crosswalk.csv", dtype=str).fillna("")
DEPT_NAME = CROSSWALK.set_index("ubigeo2")["name"].to_dict()
ATLAS = load_yaml("atlas_dims.yml")


def load_estimates() -> pd.DataFrame:
    return pd.read_parquet(OUT_DIR / "estimates.parquet")


def _r(v, nd=1):
    if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
        return None
    return round(float(v), nd)


def cell(row, nd=1) -> dict:
    """Celda estándar; suprimida si grade S."""
    if row is None:
        return {"v": None, "g": "S", "n": 0}
    if row["grade"] == "S":
        return {"v": None, "g": "S", "n": int(row["n"])}
    c = {"v": _r(row["est"], nd), "g": row["grade"], "n": int(row["n"])}
    if row["se"] == row["se"]:
        c.update({"se": _r(row["se"], nd + 1), "rse": _r(row["rse"] * 100, 1), "lo": _r(row["lo"], nd), "hi": _r(row["hi"], nd)})
    return c


def pick(est: pd.DataFrame, indicator: str, domain: str, key: str = "all", year: int = HEADLINE_YEAR, category=None):
    m = (est.indicator == indicator) & (est.domain == domain) & (est.key == key) & (est.year == year)
    if category is not None:
        m &= est.category == category
    else:
        m &= est.category.isna()
    r = est[m]
    return None if r.empty else r.iloc[0]


def nd_for(indicator: str) -> int:
    u = IND[indicator].get("unit")
    return 0 if u in ("S/", "personas") else (2 if u in ("ratio",) else (2 if indicator.startswith("mig5_") or indicator in ("life_abroad", "born_ven") else 1))


def dump(obj, rel: str):
    p = SITE_DATA_DIR / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    return p


def dist_cells(est, indicator, domain, key, year=HEADLINE_YEAR):
    spec = IND[indicator]
    r = est[(est.indicator == indicator) & (est.domain == domain) & (est.key == key) & (est.year == year)].sort_values("category")
    labs = spec.get("labels_es", {})
    return [{"k": int(x.category), "label": labs.get(int(x.category), str(int(x.category))), **cell(x)} for _, x in r.iterrows()]


def series(est, indicator, domain, key, category=None):
    out = []
    for y in YEARS:
        out.append(cell(pick(est, indicator, domain, key, y, category), nd_for(indicator)))
    return out
