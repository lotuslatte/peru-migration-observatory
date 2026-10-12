"""Matriz origen–destino (5 años) y tasas de inmigración/emigración/saldo por departamento y año, con SE de diseño."""
import numpy as np
import pandas as pd
from .config import OUT_DIR, YEARS, CONFIG_DIR
from .survey import Design, Estimate, as_float
from .build_person import load_person
from .derive import derive

DEPTS = [f"{i:02d}" for i in range(1, 26)]


def year_flows(d: pd.DataFrame, year: int) -> tuple[pd.DataFrame, pd.DataFrame]:
    d = d.reset_index(drop=True)
    D = Design(d, w="w_pop")
    b = lambda c: d[c].eq(1).fillna(False).to_numpy(dtype=bool)
    pop5, cross, intl = b("pop5"), b("mig5_cross"), b("mig5_intl")
    dest = d["dept"].astype(str).to_numpy(); orig = d["orig5_dept"].astype(object).where(d["orig5_dept"].notna(), "").astype(str).to_numpy()
    ones = np.ones(len(d))
    # O-D totals
    od = []
    for o in DEPTS:
        mo = cross & (orig == o)
        for t in DEPTS:
            m = mo & (dest == t)
            if m.sum() == 0: continue
            e = D.total(ones, m)
            od.append({"year": year, "orig": o, "dest": t, "n": e.n, "flow": e.est, "se": e.se})
    od = pd.DataFrame(od)
    # per dept: pop5 now, inmigrants, emigrants, intl
    rows = []
    for k in DEPTS:
        here = dest == k
        P = D.total(ones, pop5 & here)                       # población 5+ actual
        I = D.total(ones, cross & here)                      # llegaron de otros dptos
        X = D.total(ones, cross & (orig == k))               # salieron hacia otros dptos (observados en destino)
        F = D.total(ones, intl & here)
        nz = lambda e: 0.0 if e.est != e.est else e.est
        pop_prev = nz(P) - nz(I) - nz(F) + nz(X)             # población aproximada hace 5 años
        I.est, X.est, F.est = nz(I), nz(X), nz(F)
        for e in (I, X, F):
            if e.se != e.se: e.se = 0.0
        in_rate = I.est / P.est * 100 if P.est else np.nan
        out_rate = X.est / pop_prev * 100 if pop_prev else np.nan
        net = (I.est - X.est)
        # SE of net via linearised difference of totals
        z = np.zeros(len(d)); z[cross & here] += D.w[cross & here]; z[cross & (orig == k)] -= D.w[cross & (orig == k)]
        se_net = np.sqrt(D.var_total(z))
        rows.append({"year": year, "dept": k, "pop5": P.est, "pop5_se": P.se, "inm": I.est, "inm_se": I.se, "inm_n": I.n, "emi": X.est, "emi_se": X.se, "emi_n": X.n,
                     "intl": F.est, "intl_n": F.n, "in_rate": in_rate, "out_rate": out_rate, "net": net, "net_se": se_net,
                     "net_rate": net / P.est * 1000 if P.est else np.nan, "net_rate_se": se_net / P.est * 1000 if P.est else np.nan})
    return od, pd.DataFrame(rows)


def run(years=YEARS):
    ods, deps = [], []
    for y in years:
        od, dep = year_flows(derive(load_person(y)), y)
        ods.append(od); deps.append(dep)
        print(y, "flows", len(od), "depts", len(dep), flush=True)
    od = pd.concat(ods, ignore_index=True); dep = pd.concat(deps, ignore_index=True)
    od.to_parquet(OUT_DIR / "od_flows.parquet", index=False); dep.to_parquet(OUT_DIR / "dept_flows.parquet", index=False)
    return od, dep
