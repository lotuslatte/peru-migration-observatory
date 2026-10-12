"""Errores estándar de diseño (linealización de Taylor) para razones, medias, cuantiles (Woodruff) y diferencias.
Diseño: PSU = conglomerado, estratos = departamento × estrato (pseudo-estratos), pesos = fac500a.
Estratos con un solo PSU: centrado en la media global de PSUs (equivalente a Stata singleunit(centered))."""
from dataclasses import dataclass
import numpy as np
import pandas as pd
from .config import RSE_A, RSE_B, MIN_N

Z95 = 1.959964


def as_mask(m) -> np.ndarray:
    if isinstance(m, pd.Series):
        m = m.fillna(False)
    return np.asarray(m, dtype=bool)


def as_float(s) -> np.ndarray:
    return pd.to_numeric(s, errors="coerce").to_numpy(dtype=float, na_value=np.nan)


@dataclass
class Estimate:
    est: float
    se: float
    n: int
    N: float
    lo: float | None = None
    hi: float | None = None
    kind: str = "level"   # "level": grado por RSE; "diff": grado por tamaño de muestra y SE finita

    @property
    def rse(self):
        return float(self.se / abs(self.est)) if self.est not in (0, None) and self.se == self.se else np.nan

    @property
    def grade(self):
        if self.n < MIN_N or self.est != self.est:
            return "S"
        if self.kind == "diff":
            return "S" if self.se != self.se else ("A" if self.n >= 200 else "B")
        r = self.rse
        if r != r:
            return "S"
        return "A" if r < RSE_A else ("B" if r < RSE_B else "S")

    def ci(self):
        if self.lo is None:
            return self.est - Z95 * self.se, self.est + Z95 * self.se
        return self.lo, self.hi


@dataclass
class Fit:
    beta: np.ndarray; se: np.ndarray; lo: np.ndarray; hi: np.ndarray; p: np.ndarray
    n: int; N: float; n_psu: int; n_strata: int; df: int; r2: float
    ame: np.ndarray | None; names: list; V: np.ndarray; family: str

    def term(self, name: str) -> dict:
        j = self.names.index(name)
        return {"id": name, "est": float(self.beta[j]), "se": float(self.se[j]), "lo": float(self.lo[j]), "hi": float(self.hi[j]), "p": float(self.p[j]),
                "ame": None if self.ame is None else float(self.ame[j])}


class Design:
    def __init__(self, df: pd.DataFrame, w="w500", psu="psu", stratum="stratum"):
        self.w = np.nan_to_num(pd.to_numeric(df[w], errors="coerce").to_numpy(dtype=float), nan=0.0)
        s = pd.factorize(df[stratum])[0]
        p = pd.factorize(df[stratum].astype(str) + "|" + df[psu].astype(str))[0]
        self.psu = p
        self.n_psu = p.max() + 1
        # stratum of each psu
        first = pd.DataFrame({"p": p, "s": s}).drop_duplicates("p").set_index("p")["s"]
        self.psu_stratum = first.reindex(range(self.n_psu)).to_numpy()
        self.n_h = np.bincount(self.psu_stratum)          # PSUs per stratum
        self.n_strata = len(self.n_h)
        self.single = self.n_h[self.psu_stratum] == 1
        self.n_single = int(self.single.sum())

    # --- core variance of a total from linearised scores z_i (already multiplied by weights) ---
    def var_total(self, z: np.ndarray) -> float:
        Z = np.bincount(self.psu, weights=z, minlength=self.n_psu)
        sum_h = np.bincount(self.psu_stratum, weights=Z, minlength=self.n_strata)
        mean_h = sum_h / self.n_h
        dev = Z - mean_h[self.psu_stratum]
        f = np.where(self.n_h > 1, self.n_h / np.maximum(self.n_h - 1, 1), 0.0)
        v = np.bincount(self.psu_stratum, weights=dev ** 2, minlength=self.n_strata) * f
        var = v.sum()
        if self.n_single:
            gm = Z.mean()
            var += ((Z[self.single] - gm) ** 2).sum()
        return float(var)

    def ratio(self, y: np.ndarray, x: np.ndarray, mask: np.ndarray) -> Estimate:
        """R = sum(w*y)/sum(w*x) over mask. y,x float arrays (NaN allowed → excluded)."""
        mask = as_mask(mask)
        m = mask & ~np.isnan(y) & ~np.isnan(x) & (x != 0)
        n = int(m.sum())
        if n == 0:
            return Estimate(np.nan, np.nan, 0, 0.0)
        w = self.w
        X = float((w[m] * x[m]).sum())
        Y = float((w[m] * y[m]).sum())
        R = Y / X
        z = np.zeros_like(w)
        z[m] = w[m] * (y[m] - R * x[m]) / X
        return Estimate(R, np.sqrt(self.var_total(z)), n, X)

    def total(self, y: np.ndarray, mask: np.ndarray) -> Estimate:
        """Total ponderado sum(w*y) sobre mask, con SE de diseño."""
        mask = as_mask(mask)
        m = mask & ~np.isnan(y)
        n = int(m.sum())
        if n == 0:
            return Estimate(np.nan, np.nan, 0, 0.0)
        z = np.zeros_like(self.w); z[m] = self.w[m] * y[m]
        return Estimate(float(z.sum()), np.sqrt(self.var_total(z)), n, float(self.w[m].sum()))

    def mean(self, y: np.ndarray, mask: np.ndarray) -> Estimate:
        return self.ratio(y, np.ones_like(y), mask)

    def quantile(self, y: np.ndarray, mask: np.ndarray, q: float = 0.5) -> Estimate:
        """Cuantil ponderado con IC de Woodruff (linealización de P(y<=Q))."""
        mask = as_mask(mask)
        m = mask & ~np.isnan(y)
        n = int(m.sum())
        if n == 0:
            return Estimate(np.nan, np.nan, 0, 0.0)
        yy, ww = y[m], self.w[m]
        o = np.argsort(yy)
        ys, ws = yy[o], ww[o]
        cw = np.cumsum(ws) / ws.sum()
        Q = float(ys[np.searchsorted(cw, q)])
        ind = (yy <= Q).astype(float)
        ind_full = np.full_like(y, np.nan)
        ind_full[m] = ind
        p_est = self.ratio(ind_full, np.ones_like(y), mask)
        se_p = p_est.se
        lo_p, hi_p = max(q - Z95 * se_p, 0.0), min(q + Z95 * se_p, 1.0)
        lo = float(ys[min(np.searchsorted(cw, lo_p), len(ys) - 1)])
        hi = float(ys[min(np.searchsorted(cw, hi_p), len(ys) - 1)])
        se = (hi - lo) / (2 * Z95)
        return Estimate(Q, se, n, float(ws.sum()), lo, hi)

    # ---------------- regresión con SE de diseño ----------------
    def var_total_mat(self, Z: np.ndarray) -> np.ndarray:
        """Z: n×k scores (ya × peso). Covarianza k×k estratificada entre PSU (misma fórmula que var_total)."""
        k = Z.shape[1]
        P = np.zeros((self.n_psu, k))
        for j in range(k):
            P[:, j] = np.bincount(self.psu, weights=Z[:, j], minlength=self.n_psu)
        V = np.zeros((k, k))
        for h in range(self.n_strata):
            idx = np.where(self.psu_stratum == h)[0]
            nh = len(idx)
            if nh > 1:
                D = P[idx] - P[idx].mean(axis=0)
                V += nh / (nh - 1) * D.T @ D
        if self.n_single:
            D = P[self.single] - P.mean(axis=0)
            V += D.T @ D
        return V

    def regress(self, y: np.ndarray, X: np.ndarray, mask: np.ndarray, family: str = "lpm", names=None) -> "Fit":
        """LPM (WLS) o logit con pesos y sandwich de diseño. X incluye la constante."""
        mask = as_mask(mask)
        m = mask & ~np.isnan(y) & ~np.isnan(X).any(axis=1) & (self.w > 0)
        Xm, ym, wm = X[m], y[m], self.w[m]
        n = int(m.sum())
        if family == "lpm":
            sw = np.sqrt(wm)
            beta, *_ = np.linalg.lstsq(Xm * sw[:, None], ym * sw, rcond=None)
            mu = Xm @ beta
            A = Xm.T @ (Xm * wm[:, None])
            resid = ym - mu
            r2 = 1 - (wm * resid ** 2).sum() / (wm * (ym - np.average(ym, weights=wm)) ** 2).sum()
        elif family == "logit":
            import statsmodels.api as sm
            glm = sm.GLM(ym, Xm, family=sm.families.Binomial(), var_weights=wm).fit()
            beta = glm.params
            mu = glm.fittedvalues
            A = Xm.T @ (Xm * (wm * mu * (1 - mu))[:, None])
            r2 = float(1 - glm.deviance / glm.null_deviance)
        else:
            raise ValueError(family)
        Zs = np.zeros((len(self.w), X.shape[1]))
        Zs[m] = (wm * (ym - mu))[:, None] * Xm
        Ainv = np.linalg.pinv(A)
        V = Ainv @ self.var_total_mat(Zs) @ Ainv
        se = np.sqrt(np.clip(np.diag(V), 0, None))
        df = max(self.n_psu - self.n_strata, 1)
        from scipy import stats as st
        t = st.t.ppf(0.975, df)
        p = 2 * (1 - st.t.cdf(np.abs(beta / np.where(se > 0, se, np.nan)), df))
        ame = None
        if family == "logit":
            # AME por diferencia de predicción para cada columna (delta numérico); para dummies: p(x=1)-p(x=0)
            ame = np.zeros(len(beta))
            for j in range(len(beta)):
                col = Xm[:, j]
                if set(np.unique(col)) <= {0.0, 1.0} and j > 0:
                    X1 = Xm.copy(); X1[:, j] = 1; X0 = Xm.copy(); X0[:, j] = 0
                    ame[j] = np.average(1 / (1 + np.exp(-(X1 @ beta))) - 1 / (1 + np.exp(-(X0 @ beta))), weights=wm)
                else:
                    ame[j] = np.average(mu * (1 - mu) * beta[j], weights=wm)
        return Fit(beta=beta, se=se, lo=beta - t * se, hi=beta + t * se, p=p, n=n, N=float(wm.sum()), n_psu=int(self.n_psu), n_strata=int(self.n_strata), df=int(df), r2=float(r2), ame=ame, names=list(names) if names is not None else [f"x{j}" for j in range(X.shape[1])], V=V, family=family)

    def bootstrap_weights(self, R: int = 200, seed: int = 0):
        """Réplicas Rao–Wu: por estrato, n_h−1 PSU con reemplazo; w* = w · m_psu · n_h/(n_h−1)."""
        rng = np.random.default_rng(seed)
        strata_psus = [np.where(self.psu_stratum == h)[0] for h in range(self.n_strata)]
        for _ in range(R):
            mult = np.zeros(self.n_psu)
            for h, idx in enumerate(strata_psus):
                nh = len(idx)
                if nh == 1:
                    mult[idx] = 1.0; continue
                draw = rng.choice(idx, size=nh - 1, replace=True)
                cnt = np.bincount(draw, minlength=self.n_psu)[idx]
                mult[idx] = cnt * nh / (nh - 1)
            yield self.w * mult[self.psu]

    def diff(self, y: np.ndarray, x: np.ndarray, mask_a: np.ndarray, mask_b: np.ndarray) -> Estimate:
        """R_a - R_b con covarianza de diseño."""
        mask_a, mask_b = as_mask(mask_a), as_mask(mask_b)
        ea, eb = self.ratio(y, x, mask_a), self.ratio(y, x, mask_b)
        if ea.n == 0 or eb.n == 0:
            return Estimate(np.nan, np.nan, 0, 0.0)
        w = self.w
        z = np.zeros_like(w)
        for e, mk, sign in ((ea, mask_a, 1), (eb, mask_b, -1)):
            m = mk & ~np.isnan(y) & ~np.isnan(x) & (x != 0)
            z[m] += sign * w[m] * (y[m] - e.est * x[m]) / e.N
        return Estimate(ea.est - eb.est, np.sqrt(self.var_total(z)), min(ea.n, eb.n), ea.N + eb.N, kind="diff")
