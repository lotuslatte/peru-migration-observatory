from datetime import date
import pandas as pd
from .common import *
from .common import _r
from ..config import OUT_DIR


def delta(a, b):
    import math
    if a is None or b is None or a["grade"] == "S" or b["grade"] == "S": return None
    d = float(a["est"] - b["est"]); se = math.sqrt(float(a["se"]) ** 2 + float(b["se"]) ** 2)
    return {"d": round(d, 2), "se": round(se, 3), "sig": bool(abs(d) > 1.96 * se)}


def build(est):
    y = HEADLINE_YEAR
    K = ["mig5_any", "mig5_cross", "mig5_intra", "mig5_intl", "mig5_ven", "life_cross", "life_abroad", "born_ven", "native_here", "gap_inf_mig", "gap_ur_mig", "gap_inc_mig"]
    kpis = {k: cell(pick(est, k, "national"), nd_for(k)) for k in K}
    deltas = {k: {"d1": delta(pick(est, k, "national"), pick(est, k, "national", "all", y - 1)), "d10": delta(pick(est, k, "national"), pick(est, k, "national", "all", 2014))} for k in K}
    n = int(pick(est, "mig5_any", "national")["n"]); pop = float(pick(est, "n_pop5", "national")["est"])
    tot = {k: cell(pick(est, k, "national"), 0) for k in ["n_mig5_cross", "n_mig5_intl", "n_pop5"]}
    by = {}
    for dom, keys in [("sex", ["1", "2"]), ("age5", ["0", "1", "2", "3", "4"]), ("area", ["1", "2"]), ("region_nat", ["1", "2", "3", "4"]), ("educ4", ["1", "2", "3", "4"]), ("lengua3", ["1", "2"])]:
        by[dom] = {k: {key: cell(pick(est, k, dom, key), nd_for(k)) for key in keys} for k in ["mig5_any", "mig5_cross", "mig5_intl", "life_cross"]}
    lab = {k: {key: cell(pick(est, k, "mig3", key), nd_for(k)) for key in ["0", "1", "2"]} for k in ["lfpr", "ur", "informality", "median_inc_real", "contract_any", "pension", "seguro", "self_emp", "neet", "pobre"]}
    lab_by = {}
    for dom, keys in [("sex_mig2", [f"{s}|{m}" for s in "12" for m in "12"]), ("age4_mig2", [f"{a}|{m}" for a in "1234" for m in "12"]), ("educ4_mig2", [f"{e}|{m}" for e in "1234" for m in "12"]), ("area_mig2", [f"{a}|{m}" for a in "12" for m in "12"]), ("region_mig2", [f"{r}|{m}" for r in "1234" for m in "12"])]:
        lab_by[dom] = {k: {key: cell(pick(est, k, dom, key), nd_for(k)) for key in keys} for k in ["lfpr", "ur", "informality", "median_inc_real"]}
    dist = {k: dist_cells(est, k, "mig3", key) for k in ["age_dist", "educ_dist"] for key in ["0", "2"] if False}
    dist = {f"{k}|{key}": dist_cells(est, k, "mig3", key) for k in ["age_dist", "educ_dist"] for key in ["0", "1", "2"]}
    trend = {k: series(est, k, "national", "all") for k in ["mig5_any", "mig5_cross", "mig5_intra", "mig5_intl", "mig5_ven", "life_cross", "gap_inf_mig", "gap_ur_mig", "gap_inc_mig"]}
    obj = {"year": y, "generated": date.today().isoformat(), "source": f"INEI – ENAHO {y}, módulos 200/400/500 (facpob07, fac500a). Elaboración: Observatorio de Migración del Perú.",
           "n_persons": n, "pop5_weighted": round(pop), "years": YEARS, "kpis": kpis, "deltas": deltas, "totals": tot, "by": by, "labour": lab, "labour_by": lab_by, "dist": dist, "trend": trend}
    return dump(obj, "headline.json")
