"""Motor de indicadores: indicators.yml × domains.yml × años → tabla tidy de estimaciones."""
import numpy as np
import pandas as pd
from .config import load_yaml, OUT_DIR, YEARS
from .survey import Design, Estimate, as_float, as_mask
from .harmonise import recode_labels

CAT = load_yaml("indicators.yml")
IND = CAT["indicators"]
DOM = CAT["domains"]


def domain_cells(d: pd.DataFrame, dom: str):
    """Yield (key, mask) for each cell of the domain."""
    vars_ = DOM[dom]["vars"]
    if not vars_:
        yield "all", np.ones(len(d), dtype=bool)
        return
    sub = d[vars_].dropna()
    for vals, idx in sub.groupby(vars_, observed=True).groups.items():
        vals = vals if isinstance(vals, tuple) else (vals,)
        key = "|".join(str(int(v)) if isinstance(v, (int, float, np.integer, np.floating)) else str(v) for v in vals)
        m = np.zeros(len(d), dtype=bool)
        m[d.index.get_indexer(idx)] = True
        yield key, m


def _row(year, ind, dom, key, e: Estimate, cat=None, scale=1.0):
    lo, hi = e.ci()
    return {"year": year, "indicator": ind, "category": cat, "domain": dom, "key": key,
            "est": e.est * scale, "se": e.se * scale, "lo": lo * scale, "hi": hi * scale,
            "rse": e.rse, "n": e.n, "N": e.N, "grade": e.grade}


def run_year(d: pd.DataFrame, year: int, domains=None, indicators=None) -> pd.DataFrame:
    d = d.reset_index(drop=True)
    designs = {}
    def design_for(spec):
        w = spec.get("weight", "w_pop")
        if w not in designs:
            designs[w] = Design(d, w=w)
        return designs[w]
    cols = {c: as_float(d[c]) for c in d.columns if c in {v for spec in IND.values() for v in (spec.get("num"), spec.get("den"), spec.get("var"), spec.get("filter")) if v}}
    ones = np.ones(len(d))
    rows = []
    doms = domains or list(DOM)
    inds = indicators or list(IND)
    for dom in doms:
        cells = list(domain_cells(d, dom))
        for ind in inds:
            spec = IND[ind]
            t = spec["type"]
            D = design_for(spec)
            scale = 100.0 if spec.get("unit") == "%" else 1.0
            if t in ("diff", "ratio_median"):
                base = IND[spec["base"]]
                D = design_for(base)
                g = as_float(d[spec["group"]])
                ma, mb = g == spec["a"], g == spec["b"]
                bscale = 100.0 if base.get("unit") == "%" else 1.0
                for key, m in cells:
                    if t == "diff":
                        den = cols[base["den"]] == 1
                        if base.get("filter"):
                            den &= cols[base["filter"]] == 1
                        e = D.diff(cols[base["num"]], ones, m & den & ma, m & den & mb)
                        rows.append(_row(year, ind, dom, key, e, scale=bscale))
                    else:
                        den = cols[base["den"]] == 1
                        ea = D.quantile(cols[base["var"]], m & den & ma, 0.5)
                        eb = D.quantile(cols[base["var"]], m & den & mb, 0.5)
                        r = ea.est / eb.est if eb.est else np.nan
                        se = r * np.sqrt((ea.se / ea.est) ** 2 + (eb.se / eb.est) ** 2) if ea.est and eb.est else np.nan
                        e = Estimate(r, se, min(ea.n, eb.n), ea.N + eb.N, kind="diff")
                        rows.append(_row(year, ind, dom, key, e))
                continue
            den = cols[spec["den"]] == 1
            if spec.get("filter"):
                den &= cols[spec["filter"]] == 1
            for key, m in cells:
                mm = m & den
                if t == "prop":
                    e = D.ratio(cols[spec["num"]], ones, mm)
                    rows.append(_row(year, ind, dom, key, e, scale=scale))
                elif t == "total":
                    e = D.total(cols[spec["num"]], mm)
                    rows.append(_row(year, ind, dom, key, e, scale=scale))
                elif t == "mean":
                    e = D.mean(cols[spec["var"]], mm)
                    rows.append(_row(year, ind, dom, key, e, scale=scale))
                elif t in ("median", "quantile"):
                    e = D.quantile(cols[spec["var"]], mm, spec.get("q", 0.5))
                    rows.append(_row(year, ind, dom, key, e, scale=scale))
                elif t == "dist":
                    v = cols[spec["var"]]
                    for cat in sorted({int(x) for x in np.unique(v[~np.isnan(v)])}):
                        e = D.ratio((v == cat).astype(float), ones, mm & ~np.isnan(v))
                        rows.append(_row(year, ind, dom, key, e, cat=cat, scale=scale))
    out = pd.DataFrame(rows)
    return out


def label_for(dom: str, key: str) -> str:
    spec = DOM[dom]
    if not spec["vars"]:
        return "Nacional"
    parts = key.split("|")
    labs = []
    for v, p in zip(spec["vars"], parts):
        labs.append(_label_var(v, p))
    return " × ".join(labs)


def _label_var(var: str, p: str) -> str:
    from .config import CONFIG_DIR
    if var == "dept" or var == "lima":
        cw = pd.read_csv(CONFIG_DIR / "dept_crosswalk.csv", dtype=str).set_index("ubigeo2")["name"]
        return cw.get(p, p)
    for dom, spec in DOM.items():
        if spec["vars"] == [var]:
            if "labels_es" in spec:
                return spec["labels_es"].get(int(p) if p.isdigit() else p, p)
            if "recode" in spec:
                return recode_labels(spec["recode"]).get(int(p), p)
    return p
