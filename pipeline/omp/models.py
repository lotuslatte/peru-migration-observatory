"""Corre config/models.yml: modelos con controles, Oaxaca y shift-share → models.json, decompositions.json."""
import numpy as np
import pandas as pd
from .config import load_yaml, HEADLINE_YEAR, SITE_DATA_DIR
from .survey import Design, as_mask, as_float
from .design_matrix import Spec, LABELS
from .decompose import oaxaca, shift_share
from .aggregate.common import dump, _r

CFG = load_yaml("models.yml")


def prep(d: pd.DataFrame) -> pd.DataFrame:
    d = d.copy()
    if "inc_real_pos" in d: d["log_inc"] = np.log(pd.to_numeric(d["inc_real_pos"], errors="coerce"))
    if "hours" in d: d["log_hours"] = np.log(pd.to_numeric(d["hours"], errors="coerce").clip(lower=1))
    return d


def cell_from(v, se, n, kind="diff"):
    if v != v: return {"v": None, "g": "S", "n": int(n)}
    return {"v": _r(v, 2), "se": _r(se, 3), "lo": _r(v - 1.96 * se, 2), "hi": _r(v + 1.96 * se, 2), "n": int(n), "g": "S" if n < 30 or se != se else ("A" if n >= 200 else "B")}


def run_model(d: pd.DataFrame, mid: str, spec: dict, year_label=None, extra_terms=None) -> dict:
    D = Design(d, w=spec.get("weight", "w500"))
    key = spec["key"]
    terms = [{"var": key["var"], "kind": "cat", "ref": key["ref"]}] + list(spec["controls"]) + (extra_terms or [])
    sp = Spec(terms)
    X, names, labels, groups = sp.build(d)
    y = as_float(d[spec["outcome"]])
    den = as_float(d[spec["den"]]) == 1
    scale = 100.0
    fit = D.regress(y, X, den, "lpm", names)
    kname = f"{key['var']}_{key['val']}"
    kj = names.index(kname)
    # raw gap
    g = as_float(d[key["var"]])
    raw = D.diff(y, np.ones(len(d)), den & (g == key["val"]), den & (g == key["ref"]))
    out = {"label_es": spec["label_es"], "outcome": spec["outcome"], "family": "lpm", "weight": spec.get("weight", "w500"), "years": year_label, "n": fit.n, "N": _r(fit.N, 0), "n_psu": fit.n_psu, "n_strata": fit.n_strata, "df": fit.df, "r2": _r(fit.r2, 3),
           "key": kname, "key_label": key.get("label", kname), "unit": "pp" if spec["outcome"] != "log_inc" else "%",
           "raw_gap": cell_from(raw.est * scale, raw.se * scale, raw.n), "adj_gap": cell_from(fit.beta[kj] * scale, fit.se[kj] * scale, fit.n),
           "terms": [{"id": nm, "label": lb, "group": gr, "est": _r(fit.beta[j] * scale, 2), "se": _r(fit.se[j] * scale, 3), "lo": _r(fit.lo[j] * scale, 2), "hi": _r(fit.hi[j] * scale, 2), "p": _r(fit.p[j], 4)} for j, (nm, lb, gr) in enumerate(zip(names, labels, groups)) if nm != "const"],
           "controls": [t["var"] for t in spec["controls"]], "by_subsample": {}}
    if spec.get("logit") and spec["outcome"] != "log_inc":
        lf = D.regress(y, X, den, "logit", names); out["logit_ame"] = cell_from(lf.ame[kj] * scale, np.nan, lf.n); out["logit_ame"]["g"] = out["adj_gap"]["g"]
    for sv in spec.get("subsamples", []):
        s = as_float(d[sv]); out["by_subsample"][sv] = {}
        sub_terms = [t for t in terms if t["var"] != sv]
        Xs, ns, _, _ = Spec(sub_terms).build(d)
        for c in sorted(int(v) for v in np.unique(s[~np.isnan(s)])):
            m = den & (s == c)
            if m.sum() < 200: continue
            try:
                f2 = D.regress(y, Xs, m, "lpm", ns); j2 = ns.index(kname)
                r2 = D.diff(y, np.ones(len(d)), m & (g == key["val"]), m & (g == key["ref"]))
                out["by_subsample"][sv][str(c)] = {"label": LABELS.get(sv, {}).get(c, str(c)), "adj_gap": cell_from(f2.beta[j2] * scale, f2.se[j2] * scale, f2.n), "raw_gap": cell_from(r2.est * scale, r2.se * scale, r2.n)}
            except Exception as e:
                print("  subsample fail", mid, sv, c, e)
    return out


def run_all(load_year, derive, years_pooled=None):
    d24 = prep(derive(load_year(HEADLINE_YEAR)))
    models = {}
    for mid, spec in CFG.get("models", {}).items():
        models[mid] = run_model(d24, mid, spec, [HEADLINE_YEAR])
        print(f"  {mid}: raw {models[mid]['raw_gap']['v']} → adj {models[mid]['adj_gap']['v']} (n={models[mid]['n']})", flush=True)
    dump({"generated": pd.Timestamp.today().date().isoformat(), "design": {"psu": "conglome", "strata": "departamento × estrato", "se": "sandwich linealizado por PSU; IC t con df = n_psu − n_estratos", "note": "Coeficientes LPM ×100: puntos porcentuales (resultados 0/1) o ≈ % (log ingreso)."}, "models": models}, "models.json")
    dec = {"oaxaca": {}, "shift_share": {}}
    D24 = Design(d24)
    for oid, spec in CFG.get("oaxaca", {}).items():
        r = oaxaca(D24, d24, spec["outcome"], spec["group"], spec["a"], spec["b"], Spec(spec["vars"]), as_float(d24[spec["den"]]) == 1, R=150)
        r["label_es"] = spec["label_es"]; r["a"]["label"] = spec["a_label"]; r["b"]["label"] = spec["b_label"]
        for bv in r["by_var"]: bv["label"] = {"age": "Edad", "educ4": "Educación", "area": "Área", "region_nat": "Región", "sector9": "Rama", "status6": "Categoría ocupacional", "log_hours": "Horas", "lengua3": "Lengua", "sex": "Sexo"}.get(bv["id"], bv["id"])
        dec["oaxaca"][oid] = r; print(f"  oaxaca {oid}: gap {r['gap']['v']:.3f} = expl {r['explained']['v']:.3f} + unexpl {r['unexplained']['v']:.3f}", flush=True)
    for sid, spec in CFG.get("shift_share", {}).items():
        y0, y1 = spec["years"]; d0 = prep(derive(load_year(y0))); d1 = d24 if y1 == HEADLINE_YEAR else prep(derive(load_year(y1)))
        D0, D1 = Design(d0), Design(d1)
        res = {"label_es": spec["label_es"], "years": spec["years"], "by_group_var": {}}
        for gv in spec["groups"]:
            r = shift_share(D0, d0, D1, d1, spec["outcome"], gv, as_float(d0[spec["den"]]) == 1, as_float(d1[spec["den"]]) == 1, R=100)
            for b in r["by_group"]: b["label"] = LABELS.get(gv, {}).get(b["k"], str(b["k"]))
            res["by_group_var"][gv] = r; print(f"  shift-share {sid}/{gv}: Δ {r['total']['v']*100:.2f} = comp {r['composition']['v']*100:.2f} + rates {r['rate']['v']*100:.2f}", flush=True)
        dec["shift_share"][sid] = res
    dump(dec, "decompositions.json")
    return models, dec
