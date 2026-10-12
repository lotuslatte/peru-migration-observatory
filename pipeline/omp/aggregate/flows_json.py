import pandas as pd, numpy as np
from .common import *
from .common import _r
from ..config import OUT_DIR

POOL = [2020, 2021, 2022, 2023, 2024]


def build():
    od = pd.read_parquet(OUT_DIR / "od_flows.parquet"); dep = pd.read_parquet(OUT_DIR / "dept_flows.parquet")
    p = od[od.year.isin(POOL)].groupby(["orig", "dest"]).agg(flow=("flow", "sum"), n=("n", "sum"), se=("se", lambda s: np.sqrt((s ** 2).sum()))).reset_index()
    p["flow"] /= len(POOL); p["se"] /= len(POOL)
    p["grade"] = np.where(p.n < MIN_N, "S", np.where(p.se / p.flow < RSE_A, "A", np.where(p.se / p.flow < RSE_B, "B", "S")))
    matrix = [{"o": r.orig, "d": r.dest, "flow": round(float(r.flow)), "n": int(r.n), "g": r.grade} for r in p.itertuples()]
    top = sorted([m for m in matrix if m["g"] != "S"], key=lambda m: -m["flow"])[:40]
    by_dept = {}
    for k in sorted(dep.dept.unique()):
        sub = dep[dep.dept == k].sort_values("year")
        nr = [{"v": _r(v, 1), "se": _r(se, 2), "lo": _r(v - 1.96 * se, 1), "hi": _r(v + 1.96 * se, 1), "n": int(nn), "g": "S" if nn < MIN_N else ("A" if nn >= 200 else "B")} for v, se, nn in zip(sub.net_rate, sub.net_rate_se, sub.inm_n + sub.emi_n)]
        from .smooth import smooth_cells
        by_dept[k] = {"years": sub.year.tolist(), "in_rate": [_r(v, 2) for v in sub.in_rate], "out_rate": [_r(v, 2) for v in sub.out_rate], "net_rate": [_r(v, 1) for v in sub.net_rate], "net_rate_cells": nr, "net_rate_smooth": smooth_cells(nr),
                      "inm": [_r(v, 0) for v in sub.inm], "emi": [_r(v, 0) for v in sub.emi], "intl": [_r(v, 0) for v in sub.intl]}
        ori = p[(p.dest == k) & (p.grade != "S")].sort_values("flow", ascending=False).head(6)
        des = p[(p.orig == k) & (p.grade != "S")].sort_values("flow", ascending=False).head(6)
        by_dept[k]["top_origins"] = [{"id": r.orig, "name": DEPT_NAME[r.orig], "flow": round(float(r.flow)), "g": r.grade} for r in ori.itertuples()]
        by_dept[k]["top_destinations"] = [{"id": r.dest, "name": DEPT_NAME[r.dest], "flow": round(float(r.flow)), "g": r.grade} for r in des.itertuples()]
    # bloque chord: matriz completa 25×25 con supresión a pseudo-nodo "otros" y centroides
    import geopandas as gpd
    from ..config import SHAPEFILE
    ids = [k for k in sorted(DEPT_NAME) if len(k) == 2]
    g = gpd.read_file(SHAPEFILE); cw = CROSSWALK[CROSSWALK.name_shapefile.ne("")].set_index("name_shapefile")["ubigeo2"]
    g["id"] = g["departamen"].map(cw); cent = {r.id: [round(float(r.geometry.representative_point().x), 4), round(float(r.geometry.representative_point().y), 4)] for r in g.itertuples() if r.id}
    cent["15"] = [-76.9, -11.4]; cent["07"] = [-77.4, -12.0]  # separar Lima y Callao
    idx = {k: i for i, k in enumerate(ids)}
    M = [[0.0] * 25 for _ in ids]; Gm = [["S"] * 25 for _ in ids]; Nn = [[0] * 25 for _ in ids]; other_out = [0.0] * 25; other_in = [0.0] * 25
    for r in p.itertuples():
        i, j = idx[r.orig], idx[r.dest]
        if r.grade == "S": other_out[i] += float(r.flow); other_in[j] += float(r.flow)
        else: M[i][j] = round(float(r.flow)); Gm[i][j] = r.grade; Nn[i][j] = int(r.n)
    chord = {"ids": ids, "names": {k: DEPT_NAME[k] for k in ids}, "matrix": M, "g": Gm, "n": Nn, "other_out": [round(v) for v in other_out], "other_in": [round(v) for v in other_in], "centroids": cent}
    nat = dep.groupby("year").agg(inm=("inm", "sum"), intl=("intl", "sum"), pop5=("pop5", "sum")).reset_index()
    obj = {"pool_years": POOL, "note": "Flujos anuales promedio 2020–2024 (personas que hace 5 años vivían en otro departamento), suma ponderada / 5. Celdas con n<30 suprimidas.",
           "matrix": matrix, "top_flows": top, "by_dept": by_dept, "dept_names": DEPT_NAME, "chord": chord,
           "national": {"years": nat.year.tolist(), "inm": [_r(v, 0) for v in nat.inm], "intl": [_r(v, 0) for v in nat.intl], "pop5": [_r(v, 0) for v in nat.pop5]}}
    return dump(obj, "flows.json")
