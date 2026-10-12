import pandas as pd, numpy as np
from .common import *
from .common import _r
from ..config import OUT_DIR


def build():
    c = pd.read_parquet(OUT_DIR / "dept_climate.parquet"); f = pd.read_parquet(OUT_DIR / "dept_flows.parquet")
    m = f.merge(c, on=["year", "dept"], how="inner").dropna(subset=["out_rate", "in_rate", "net_rate"])
    m["name"] = m.dept.map(DEPT_NAME)
    m["region_nat"] = m.dept.map(CROSSWALK.set_index("ubigeo2").region_nat)
    # terciles of exposure across dept-years
    for v in ["dry_years", "temp_anom", "climate_risk_index"]:
        m[f"{v}_t"] = pd.qcut(m[v].rank(method="first"), 3, labels=[1, 2, 3]).astype(int)
    terc = {}
    for v in ["dry_years", "temp_anom", "climate_risk_index"]:
        g = m.groupby(f"{v}_t").apply(lambda x: pd.Series({"out_rate": np.average(x.out_rate, weights=x.pop5), "in_rate": np.average(x.in_rate, weights=x.pop5), "net_rate": np.average(x.net_rate, weights=x.pop5), "n_dept_years": len(x)}), include_groups=False)
        terc[v] = [{"tercile": int(i), **{k: _r(val, 2) for k, val in r.items()}} for i, r in g.iterrows()]
    corr = {v: _r(np.corrcoef(m[v], m.out_rate)[0, 1], 3) for v in ["dry_years", "hot_years", "temp_anom", "precip_anom", "climate_risk_index"]}
    pts = [{"dept": r.dept, "name": r.name, "region_nat": r.region_nat, "year": int(r.year), "out_rate": _r(r.out_rate, 2), "in_rate": _r(r.in_rate, 2), "net_rate": _r(r.net_rate, 1), "dry_years": _r(r.dry_years, 2), "hot_years": _r(r.hot_years, 2), "temp_anom": _r(r.temp_anom, 3), "precip_anom": _r(r.precip_anom, 2), "climate_risk_index": _r(r.climate_risk_index, 3)} for r in m.itertuples()]
    obj = {"years": sorted(m.year.unique().tolist()), "terciles": terc, "corr_out_rate": corr, "points": pts,
           "note": "Exposición climática = promedio ponderado por población de las variables distritales (ERA5/CHIRPS, referencia 1991–2020) del panel peru_climate_integrated; emigración = tasa de salida interdepartamental (ENAHO, 5 años)."}
    m.to_csv(SITE_DATA_DIR / "compendium" / "T16.csv", index=False)
    return dump(obj, "climate.json")
