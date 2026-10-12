import json
from .common import *
from .common import _r
from .atlas import region_rows, DIMS
from ..config import SITE_DATA_DIR
from .narrative import profile_summary

LAB = ["lfpr", "ur", "informality", "median_inc_real"]


def build(est):
    rows = region_rows(est)
    flows = json.load(open(SITE_DATA_DIR / "flows.json"))
    paths = []
    for r in rows:
        rid = r["id"]; dom = "lima" if r["parent"] else "dept"
        n = pick(est, "mig5_any", dom, rid)
        prof = {"id": rid, "name": r["name"], "region_nat": r["region_nat"], "parent": r["parent"], "year": HEADLINE_YEAR,
                "n": int(n["n"]) if n is not None else 0, "pop5_weighted": round(float(n["N"])) if n is not None else None,
                "dims": r["values"], "pct": r.get("pct", {}), "rank": r.get("rank", {}), "flows": r.get("flows"),
                "mobility": {k: cell(pick(est, k, dom, rid), nd_for(k)) for k in ["mig5_any", "mig5_cross", "mig5_intra", "mig5_intl", "mig5_ven", "life_cross", "life_abroad", "native_here", "youth_share"]},
                "labour_mig": {k: {m: cell(pick(est, k, "dept_mig2", f"{rid}|{m}"), nd_for(k)) for m in ("1", "2")} for k in LAB} if dom == "dept" else {},
                "origin_outcomes": {k: cell(pick(est, k, "orig_dept", rid), nd_for(k)) for k in ["lfpr", "informality", "median_inc_real"]} if dom == "dept" else {},
                "od": flows["by_dept"].get(rid), "trend": {k: series(est, k, dom, rid) for k in ["mig5_cross", "mig5_intl", "life_cross", "gap_inf_mig"]}}
        prof["summary"] = profile_summary(est, prof)
        paths.append(dump(prof, f"profiles/{rid}.json"))
    return paths
