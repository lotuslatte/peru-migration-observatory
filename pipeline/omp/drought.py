"""Modelo sequía → emigración: mig5_cross (dejó el departamento de origen) sobre exposición climática del departamento de ORIGEN (media t−5..t−1), con controles."""
import numpy as np
import pandas as pd
from .config import OUT_DIR, SITE_DATA_DIR
from .survey import Design, as_float
from .design_matrix import Spec
from .pool import load_pooled
from .build_person import load_person
from .derive import derive
from .aggregate.common import dump, _r
from .models import cell_from


def build(years=(2019, 2020, 2021, 2022, 2023)):
    clim = pd.read_parquet(OUT_DIR / "dept_climate.parquet")
    d = load_pooled(list(years), derive)
    d = d[(d["pop5"] == 1)].copy()
    moved = d["mig5_cross"].eq(1)
    d["orig"] = np.where(moved, d["orig5_dept"], d["dept"])
    d = d[d["orig"].isin(clim.dept.unique())]
    # exposición media de los 5 años previos en el departamento de origen
    rows = []
    for y in years:
        c = clim[clim.year.between(y - 5, y - 1)].groupby("dept")[["dry_years", "temp_anom", "precip_anom", "hot_years"]].mean().reset_index()
        c["year"] = y; rows.append(c)
    ex = pd.concat(rows).rename(columns={"dept": "orig", "dry_years": "dry_years_o", "temp_anom": "temp_anom_o", "precip_anom": "precip_anom_o", "hot_years": "hot_years_o"})
    d = d.merge(ex, on=["orig", "year"], how="left").dropna(subset=["dry_years_o"])
    d["region_o"] = d["orig"].map(dict(zip(clim.dept, clim.dept))).map(lambda k: {"15": 4}.get(k, None))
    d["region_nat"] = d["region_nat"].astype("Int8")
    d["year_c"] = d["year"].astype(int)
    d = d.reset_index(drop=True)
    D = Design(d, w="w_pop")
    y = as_float(d["mig5_cross"]); mask = ~np.isnan(y)
    out = {"label_es": "Emigración interdepartamental (5 años) y exposición climática del departamento de origen", "outcome": "mig5_cross", "years": list(years), "unit": "pp", "specs": {}}
    for sid, exposure in [("dry", "dry_years_o"), ("temp", "temp_anom_o"), ("precip", "precip_anom_o")]:
        terms = [{"var": exposure, "kind": "num"}, {"var": "age5", "ref": 1}, {"var": "sex"}, {"var": "educ4", "ref": 1}, {"var": "area"}, {"var": "region_nat", "ref": 4}, {"var": "year_c", "ref": int(years[0])}]
        X, names, labels, groups = Spec(terms).build(d)
        fit = D.regress(y, X, mask, "lpm", names)
        # robustez: cluster por departamento de origen
        Dc = Design(d.assign(psu=d["orig"], stratum="all"), w="w_pop"); fitc = Dc.regress(y, X, mask, "lpm", names)
        # sin controles
        X0 = np.column_stack([np.ones(len(d)), as_float(d[exposure])]); f0 = D.regress(y, X0, mask, "lpm", ["const", exposure])
        j = names.index(exposure)
        out["specs"][sid] = {"exposure": exposure, "label": {"dry_years_o": "Años secos en origen (t−5..t−1, por año adicional)", "temp_anom_o": "Anomalía térmica en origen (por +1 °C)", "precip_anom_o": "Anomalía de lluvia en origen (por +100 mm)"}[exposure],
                             "raw": cell_from(f0.beta[1] * 100 * (100 if exposure == "precip_anom_o" else 1), f0.se[1] * 100 * (100 if exposure == "precip_anom_o" else 1), f0.n),
                             "adj": cell_from(fit.beta[j] * 100 * (100 if exposure == "precip_anom_o" else 1), fit.se[j] * 100 * (100 if exposure == "precip_anom_o" else 1), fit.n),
                             "adj_cluster_orig": cell_from(fitc.beta[j] * 100 * (100 if exposure == "precip_anom_o" else 1), fitc.se[j] * 100 * (100 if exposure == "precip_anom_o" else 1), fitc.n),
                             "n": fit.n, "r2": _r(fit.r2, 4), "n_psu": fit.n_psu, "n_orig_clusters": int(d["orig"].nunique()),
                             "terms": [{"id": nm, "label": lb, "group": gr, "est": _r(fit.beta[k] * 100, 3), "se": _r(fit.se[k] * 100, 3), "lo": _r(fit.lo[k] * 100, 3), "hi": _r(fit.hi[k] * 100, 3), "p": _r(fit.p[k], 4)} for k, (nm, lb, gr) in enumerate(zip(names, labels, groups)) if nm != "const"]}
        print(f"  drought/{sid}: raw {out['specs'][sid]['raw']['v']} adj {out['specs'][sid]['adj']['v']} (cluster-orig se {out['specs'][sid]['adj_cluster_orig']['se']}) n={fit.n}", flush=True)
    out["mean_out_rate"] = _r(float(np.average(y[mask], weights=D.w[mask])) * 100, 2)
    out["note"] = "Población de 5+ años observada en destino (ENAHO 2019–2023, agrupada; pesos /5). Exposición = media de los 5 años previos en el departamento de origen (para quienes no migraron, el departamento actual). Controles: edad, sexo, educación, área, región natural actual y año. Coeficientes ×100 = puntos porcentuales de probabilidad de haber emigrado. Dos errores estándar: por conglomerado (diseño) y por departamento de origen (25 clusters, conservador). Relación descriptiva."
    return dump(out, "drought_model.json")
