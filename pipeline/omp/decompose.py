"""Oaxaca–Blinder (two-fold, β de referencia = muestra agrupada con dummy) y shift-share; varianza por bootstrap Rao–Wu."""
import numpy as np
import pandas as pd
from .survey import Design, as_mask
from .design_matrix import Spec


def _wls(X, y, w):
    sw = np.sqrt(w); b, *_ = np.linalg.lstsq(X * sw[:, None], y * sw, rcond=None); return b


def oaxaca_once(X, y, w, ga, gb, groups):
    """Devuelve gap, explained, unexplained y por bloque (dict grupo→(expl, unexpl))."""
    ma, mb = ga, gb
    Xa, ya, wa = X[ma], y[ma], w[ma]; Xb, yb, wb = X[mb], y[mb], w[mb]
    ba, bb = _wls(Xa, ya, wa), _wls(Xb, yb, wb)
    Xp = np.column_stack([X[ma | mb], ma[ma | mb].astype(float)]); bp = _wls(Xp, y[ma | mb], w[ma | mb])[:-1]
    xa, xb = np.average(Xa, axis=0, weights=wa), np.average(Xb, axis=0, weights=wb)
    gap = np.average(ya, weights=wa) - np.average(yb, weights=wb)
    expl_k = (xa - xb) * bp
    unex_k = xa * (ba - bp) + xb * (bp - bb)
    out = {"gap": gap, "explained": expl_k.sum(), "unexplained": unex_k.sum(), "by": {}}
    for g in dict.fromkeys(groups):
        idx = [j for j, gg in enumerate(groups) if gg == g]
        out["by"][g] = (expl_k[idx].sum(), unex_k[idx].sum())
    return out


def oaxaca(D: Design, d: pd.DataFrame, outcome: str, group_var: str, a, b, spec: Spec, mask, R: int = 200, seed: int = 0):
    X, names, labels, groups = spec.build(d)
    y = pd.to_numeric(d[outcome], errors="coerce").to_numpy(float)
    m = as_mask(mask) & ~np.isnan(y) & ~np.isnan(X).any(axis=1) & (D.w > 0)
    g = pd.to_numeric(d[group_var], errors="coerce").to_numpy()
    ga, gb = m & (g == a), m & (g == b)
    base = oaxaca_once(X, y, D.w, ga, gb, groups)
    reps = []
    for w in D.bootstrap_weights(R, seed):
        try:
            r = oaxaca_once(X, y, w, ga, gb, groups); reps.append([r["gap"], r["explained"], r["unexplained"]] + [v for k in base["by"] for v in r["by"][k]])
        except Exception:
            continue
    reps = np.array(reps); se = reps.std(axis=0, ddof=1)
    def cell(v, s, n):
        rse = abs(s / v) if v else np.inf
        return {"v": float(v), "se": float(s), "lo": float(v - 1.96 * s), "hi": float(v + 1.96 * s), "n": int(n), "g": "S" if n < 30 else ("A" if rse < .15 else ("B" if rse < .30 else "S"))}
    n = int(min(ga.sum(), gb.sum()))
    out = {"outcome": outcome, "a": {"n": int(ga.sum()), "mean": float(np.average(y[ga], weights=D.w[ga]))}, "b": {"n": int(gb.sum()), "mean": float(np.average(y[gb], weights=D.w[gb]))},
           "gap": cell(base["gap"], se[0], n), "explained": cell(base["explained"], se[1], n), "unexplained": cell(base["unexplained"], se[2], n), "by_var": [], "R": int(len(reps)), "reference": "pooled"}
    for i, (k, (e, u)) in enumerate(base["by"].items()):
        if k == "const": continue
        out["by_var"].append({"id": k, "explained": cell(e, se[3 + 2 * i], n), "unexplained": cell(u, se[4 + 2 * i], n)})
    return out


def shift_share(D0: Design, d0: pd.DataFrame, D1: Design, d1: pd.DataFrame, outcome: str, group_var: str, mask0, mask1, R: int = 200, seed: int = 0):
    """Δ tasa = Σ (s1−s0)·r̄ [composición] + Σ s̄·(r1−r0) [tasas]; s̄, r̄ = punto medio."""
    def parts(d, w, mask):
        y = pd.to_numeric(d[outcome], errors="coerce").to_numpy(float); g = pd.to_numeric(d[group_var], errors="coerce").to_numpy()
        m = as_mask(mask) & ~np.isnan(y) & ~np.isnan(g)
        cats = np.unique(g[m]); W = w[m].sum()
        s = {int(c): w[m & (g == c)].sum() / W for c in cats}; r = {int(c): np.average(y[m & (g == c)], weights=w[m & (g == c)]) for c in cats}
        return s, r
    def combine(s0, r0, s1, r1):
        cats = sorted(set(s0) | set(s1)); comp = rate = 0.0; by = []
        for c in cats:
            a0, a1 = s0.get(c, 0), s1.get(c, 0); b0, b1 = r0.get(c, np.nan), r1.get(c, np.nan)
            rb = np.nanmean([b0, b1]); sb = (a0 + a1) / 2
            cc = (a1 - a0) * rb; ww = sb * ((b1 if b1 == b1 else rb) - (b0 if b0 == b0 else rb))
            comp += cc; rate += ww; by.append({"k": c, "share_t0": a0, "share_t1": a1, "rate_t0": b0, "rate_t1": b1, "comp": cc, "within": ww})
        return comp, rate, by
    s0, r0 = parts(d0, D0.w, mask0); s1, r1 = parts(d1, D1.w, mask1)
    comp, rate, by = combine(s0, r0, s1, r1)
    total = sum(s1[c] * r1[c] for c in s1) - sum(s0[c] * r0[c] for c in s0)
    reps = []
    for w0, w1 in zip(D0.bootstrap_weights(R, seed), D1.bootstrap_weights(R, seed + 1)):
        a, b_ = parts(d0, w0, mask0); c, e = parts(d1, w1, mask1); cc, rr, _ = combine(a, b_, c, e); reps.append([cc, rr])
    se = np.array(reps).std(axis=0, ddof=1)
    return {"outcome": outcome, "group_var": group_var, "total": {"v": float(total)}, "composition": {"v": float(comp), "se": float(se[0])}, "rate": {"v": float(rate), "se": float(se[1])}, "by_group": by, "R": R}
