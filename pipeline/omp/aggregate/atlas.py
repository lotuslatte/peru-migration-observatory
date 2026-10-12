import numpy as np, pandas as pd
from .common import *
from .common import _r
from ..config import OUT_DIR

DIMS = ATLAS["primary"] + ATLAS["secondary"]


POOL = [2020, 2021, 2022, 2023, 2024]


def flow_cells(year=HEADLINE_YEAR, pool=POOL):
    """Tasas de flujo por departamento promediadas en 5 años (2020–2024) para reducir el ruido muestral; SE combinada."""
    f0 = pd.read_parquet(OUT_DIR / "dept_flows.parquet"); f0 = f0[f0.year.isin(pool)]
    k = len(pool)
    f = f0.groupby("dept").agg(pop5=("pop5", "mean"), inm=("inm", "mean"), emi=("emi", "mean"), intl=("intl", "mean"), inm_n=("inm_n", "sum"), emi_n=("emi_n", "sum"),
                               emi_se=("emi_se", lambda s: np.sqrt((s ** 2).sum()) / k), net_rate=("net_rate", "mean"), net_rate_se=("net_rate_se", lambda s: np.sqrt((s ** 2).sum()) / k),
                               in_rate=("in_rate", "mean"), out_rate=("out_rate", "mean"))
    out = {}
    for k, r in f.iterrows():
        net = {"v": _r(r.net_rate, 1), "se": _r(r.net_rate_se, 2), "n": int(r.inm_n + r.emi_n)}
        nn = r.inm_n + r.emi_n
        net["g"] = "S" if nn < MIN_N else ("A" if nn >= 200 else "B")   # diferencia: grado por tamaño de muestra
        net["lo"], net["hi"] = _r(r.net_rate - 1.96 * r.net_rate_se, 1), _r(r.net_rate + 1.96 * r.net_rate_se, 1)
        if net["g"] == "S": net["v"] = None
        o_rse = (r.emi_se / r.emi) if r.emi else np.inf
        og = "S" if r.emi_n < MIN_N else ("A" if o_rse < RSE_A else ("B" if o_rse < RSE_B else "S"))
        out_ = {"v": None if og == "S" else _r(r.out_rate, 2), "g": og, "n": int(r.emi_n), "se": _r(r.out_rate * o_rse, 3) if og != "S" else None}
        if og != "S": out_["lo"], out_["hi"] = _r(r.out_rate * (1 - 1.96 * o_rse), 2), _r(r.out_rate * (1 + 1.96 * o_rse), 2)
        out[k] = {"net_rate": net, "out_rate": out_, "inm": _r(r.inm, 0), "emi": _r(r.emi, 0), "pop5": _r(r.pop5, 0), "intl": _r(r.intl, 0)}
    return out


def region_rows(est, year=HEADLINE_YEAR):
    fc = flow_cells(year)
    rows = []
    for _, cw in CROSSWALK.iterrows():
        rid = cw.ubigeo2; dom = "lima" if rid in ("15M", "15R") else "dept"
        vals = {}
        for d in DIMS:
            if d["id"] in ("net_rate", "out_rate"):
                vals[d["id"]] = fc.get(rid, {}).get(d["id"], {"v": None, "g": "S", "n": 0})
            else:
                vals[d["id"]] = cell(pick(est, d["id"], dom, rid, year), nd_for(d["id"]))
        rows.append({"id": rid, "name": cw["name"], "region_nat": cw.region_nat, "parent": cw.parent or None, "values": vals, "flows": fc.get(rid)})
    base = [r for r in rows if not r["parent"]]
    for d in DIMS:
        vs = [(r["id"], r["values"][d["id"]]["v"]) for r in base if r["values"][d["id"]]["v"] is not None]
        vals = np.array([v for _, v in vs], dtype=float)
        if not d["higher_better"]: vals = -vals
        order = vals.argsort().argsort()
        pct = {rid: int(round(100 * rank / max(len(vals) - 1, 1))) for (rid, _), rank in zip(vs, order)}
        rank = {rid: int(len(vals) - r) for (rid, _), r in zip(vs, order)}
        for r in rows:
            r.setdefault("pct", {})[d["id"]] = pct.get(r["id"]); r.setdefault("rank", {})[d["id"]] = rank.get(r["id"])
    return rows


def build(est):
    obj = {"year": HEADLINE_YEAR, "n_regions": 25, "dims": [{**d, "primary": d in ATLAS["primary"]} for d in DIMS], "regions": region_rows(est)}
    return dump(obj, "atlas_regions.json")
