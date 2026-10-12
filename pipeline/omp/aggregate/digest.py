"""Qué cambió: diferencias significativas 2023→2024 y 2014→2024 por (indicador, dominio, clave), ordenadas por |z|."""
import math
from .common import *
from .common import _r

BETTER_HIGH = {"lfpr", "epr", "adecuado", "median_inc_real", "mean_inc_real", "hours_le48", "contract_any", "contract_indef", "pension", "seguro", "essalud", "formality", "native_here", "gap_inc_mig", "gap_inc"}
BETTER_LOW = {"ur", "ur_youth", "informality", "informal_in_sector", "subemp_hours", "subemp_income", "neet", "hours_ge60", "tfnr", "gap_lfpr", "gap_ur", "gap_inf_mig", "gap_ur_mig", "pobre"}


def build(est, exclude_domains=("dept_sex", "dept_age4", "dept_lengua3", "dept_area", "dept_mig2")):
    e = est[est.category.isna() & ~est.domain.isin(exclude_domains) & est.grade.eq("A")]
    items = {"y1": [], "y10": []}
    cur = e[e.year == HEADLINE_YEAR].set_index(["indicator", "domain", "key"])
    for lab, y0 in (("y1", HEADLINE_YEAR - 1), ("y10", 2014)):
        prev = e[e.year == y0].set_index(["indicator", "domain", "key"])
        both = cur.join(prev, lsuffix="_1", rsuffix="_0", how="inner")
        for (ind, dom, key), r in both.iterrows():
            d = float(r.est_1 - r.est_0); se = math.sqrt(float(r.se_1) ** 2 + float(r.se_0) ** 2)
            if se != se or se == 0: continue
            z = d / se
            if abs(z) < 1.96: continue
            unit = IND[ind].get("unit", "%")
            rel = d / float(r.est_0) if r.est_0 else None
            good = None
            if ind in BETTER_HIGH: good = d > 0
            elif ind in BETTER_LOW: good = d < 0
            items[lab].append({"indicator": ind, "label": IND[ind]["label_es"], "domain": dom, "domain_label": DOM[dom]["label_es"], "key": key, "row_label": label_for(dom, key), "unit": unit,
                               "v0": _r(r.est_0, nd_for(ind)), "v1": _r(r.est_1, nd_for(ind)), "d": _r(d, nd_for(ind) + 1), "rel": _r(rel * 100, 1) if rel is not None else None, "se": _r(se, 3), "z": _r(z, 2), "good": good, "n": int(r.n_1)})
        items[lab].sort(key=lambda x: -abs(x["z"]))
    obj = {"year": HEADLINE_YEAR, "n_tested": {"y1": int(len(cur)), "y10": int(len(cur))}, "y1": items["y1"][:60], "y10": items["y10"][:60],
           "note": "Sólo celdas con sello A en ambos años; diferencia significativa al 95 % (|z| > 1,96) con SE combinada de muestras independientes. No corregido por comparaciones múltiples: con cientos de pruebas, ~5 % de falsos positivos esperados."}
    return dump(obj, "digest.json")
