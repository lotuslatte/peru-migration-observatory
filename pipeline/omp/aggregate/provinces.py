"""Estimaciones provinciales sobre frame agrupado → atlas_provincias.json (mismo contrato que atlas_regions.json)."""
import numpy as np, pandas as pd
from .common import *
from .common import _r
from ..config import load_yaml, OUT_DIR, CONFIG_DIR
from ..pool import load_pooled
from ..engine import run_year, DOM
from ..survey import Design

CFG = load_yaml("province_indicators.yml")


def run(derive):
    years = CFG["pool_years"]
    d = load_pooled(years, derive)
    d["prov"] = d["ubigeo"].str[:4]
    DOM["prov"] = {"vars": ["prov"], "label_es": "Provincia"}
    inds = [i["id"] for i in CFG["indicators"]]
    est = run_year(d, years[-1], domains=["prov"], indicators=inds)
    # n_psu por provincia para la regla extra de sello A
    npsu = d.groupby("prov")["psu"].nunique()
    est["n_psu"] = est.key.map(npsu)
    est.loc[(est.grade == "A") & (est.n_psu < CFG["min_psu_for_A"]), "grade"] = "B"
    est.to_parquet(OUT_DIR / "estimates_prov.parquet", index=False)
    feas = est[est.category.isna()].groupby("indicator").grade.value_counts().unstack(fill_value=0)
    feas.to_csv(OUT_DIR / "province_feasibility.csv")
    print(feas.to_string())
    for i in CFG["indicators"]:
        if i.get("required") and (feas.loc[i["id"]].get("A", 0) + feas.loc[i["id"]].get("B", 0)) < 150:
            raise SystemExit(f"Provincias: {i['id']} tiene menos de 150 provincias publicables")
    return est


def build(est_prov, dims_ids, names: pd.DataFrame):
    """names: DataFrame ubigeo4, name, dept"""
    rows = []
    nm = names.set_index("ubigeo4")
    for pid in sorted(est_prov.key.unique()):
        vals = {}
        for ind in dims_ids:
            r = est_prov[(est_prov.key == pid) & (est_prov.indicator == ind) & est_prov.category.isna()]
            vals[ind] = cell(r.iloc[0], nd_for(ind)) if len(r) else {"v": None, "g": "S", "n": 0}
            if len(r): vals[ind]["n_psu"] = int(r.iloc[0]["n_psu"])
        rows.append({"id": pid, "name": nm.name.get(pid, pid), "parent": pid[:2], "dept_name": DEPT_NAME.get(pid[:2]), "values": vals})
    for ind in dims_ids:
        vs = [(r["id"], r["values"][ind]["v"]) for r in rows if r["values"][ind]["v"] is not None]
        arr = np.array([v for _, v in vs], dtype=float)
        hb = IND[ind].get("unit") != "pp" and ind not in ("informality", "ur", "neet", "subemp_hours", "gap_lfpr")
        order = (arr if hb else -arr).argsort().argsort()
        pct = {rid: int(round(100 * rk / max(len(arr) - 1, 1))) for (rid, _), rk in zip(vs, order)}
        for r in rows: r.setdefault("pct", {})[ind] = pct.get(r["id"])
    dims = [{"id": i, "label_es": IND[i]["label_es"], "label_en": IND[i].get("label_en", ""), "unit": IND[i].get("unit"), "higher_better": IND[i].get("unit") != "pp" and i not in ("informality", "ur", "neet", "subemp_hours", "gap_lfpr"), "primary": i in dims_ids[:6]} for i in dims_ids]
    return dump({"years": CFG["pool_years"], "level": "provincia", "n_regions": len(rows), "dims": dims, "regions": rows, "note": f"Frame agrupado {CFG['pool_years'][0]}–{CFG['pool_years'][-1]} (pesos divididos entre {len(CFG['pool_years'])}); sello A exige además ≥{CFG['min_psu_for_A']} conglomerados."}, "atlas_provincias.json")
