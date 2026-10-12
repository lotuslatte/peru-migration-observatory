import json
import pandas as pd
from .common import *
from ..config import load_yaml, OUT_DIR

TABLES = load_yaml("compendium_tables.yml")
COLS = ["table_id", "year", "domain", "row_key", "row_label", "indicator", "category", "col_label", "estimate", "se", "rse", "ci_lo", "ci_hi", "n", "grade", "unit"]


def _label(indicator, category):
    spec = IND[indicator]
    if category is not None and category == category:
        return f"{spec['label_es']}: {spec.get('labels_es', {}).get(int(category), int(category))}"
    return spec["label_es"]


def table_frame(est, t):
    years = YEARS if t["years"] == "all" else t["years"]
    sub = est[est.indicator.isin(t["indicators"]) & est.domain.isin(t["domains"]) & est.year.isin(years)].copy()
    sub["row_label"] = [label_for(d, k) for d, k in zip(sub.domain, sub.key)]
    sub["col_label"] = [_label(i, c) for i, c in zip(sub.indicator, sub.category)]
    sub["unit"] = sub.indicator.map(lambda i: IND[i].get("unit"))
    sup = sub.grade == "S"
    for c in ["est", "se", "rse", "lo", "hi"]: sub.loc[sup, c] = None
    out = sub.rename(columns={"key": "row_key", "est": "estimate", "lo": "ci_lo", "hi": "ci_hi"}); out["table_id"] = t["id"]; out["rse"] = out["rse"] * 100
    return out[COLS].round(3).sort_values(["year", "domain", "row_key", "indicator", "category"])


def specials(est):
    f = {}
    dep = pd.read_parquet(OUT_DIR / "dept_flows.parquet"); dep["departamento"] = dep.dept.map(DEPT_NAME)
    f["dept_flows"] = dep[dep.year == HEADLINE_YEAR][["departamento", "pop5", "inm", "inm_se", "inm_n", "emi", "emi_se", "emi_n", "intl", "in_rate", "out_rate", "net", "net_se", "net_rate", "net_rate_se"]].round(2)
    f["dept_flows_all"] = dep[["year", "departamento", "inm", "emi", "intl", "in_rate", "out_rate", "net_rate", "net_rate_se"]].round(2)
    fl = json.load(open(SITE_DATA_DIR / "flows.json"))
    m = pd.DataFrame(fl["matrix"]); m["origen"] = m.o.map(DEPT_NAME); m["destino"] = m.d.map(DEPT_NAME)
    f["od_matrix"] = m[["origen", "destino", "flow", "n", "g"]].rename(columns={"flow": "personas_por_anio", "g": "grado"})
    vz = json.load(open(SITE_DATA_DIR / "venezuela.json"))
    rows = []
    for y, w in vz["waves"].items():
        for grp, cells in [("Total", w["all"])] + [(f"Sexo: {'Hombres' if s == '1' else 'Mujeres'}", c) for s, c in w["by_sex"].items()] + [(f"Llegada: {k}", c) for k, c in w["by_cohort"].items()] + [(f"Situación: {k}", c) for k, c in w["by_status"].items()] + [(f"Ciudad/dpto: {k}", c) for k, c in w["by_geo"].items()]:
            for k, c in cells.items():
                if k in ("pop", "n"): continue
                rows.append({"wave": y, "grupo": grp, "indicador": vz["indicators"][k]["label_es"], "estimate": c["v"], "se": c.get("se"), "ci_lo": c.get("lo"), "ci_hi": c.get("hi"), "n": c["n"], "grade": c["g"]})
    f["enpove"] = pd.DataFrame(rows)
    ss = est[(est.indicator == "mig5_cross") & est.domain.isin(["national", "dept", "lima"])]
    ss = ss.assign(row_label=[label_for(d, k) for d, k in zip(ss.domain, ss.key)])
    f["sample_sizes"] = ss.pivot_table(index="row_label", columns="year", values="n").reset_index()
    return f


def build(est):
    index = []; sp = specials(est)
    for t in TABLES["tables"]:
        fn = f"compendium/{t['id']}.csv"; p = SITE_DATA_DIR / fn
        if "special" in t:
            if t["special"] == "climate":
                df = pd.read_csv(p) if p.exists() else pd.DataFrame()
            else:
                df = sp.get(t["special"], pd.DataFrame()); df.to_csv(p, index=False)
        else:
            df = table_frame(est, t); df.to_csv(p, index=False)
        index.append({"id": t["id"], "section": t["section"], "section_title": TABLES["sections"][t["section"]], "title": t["title"], "file": fn, "rows": int(len(df))})
    dump({"sections": TABLES["sections"], "tables": index}, "compendium_index.json")
    return index
