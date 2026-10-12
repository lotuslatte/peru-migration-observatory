import numpy as np, pandas as pd
from omp.survey import Design
from omp.design_matrix import Spec


def frame(n=3000, seed=2):
    rng = np.random.default_rng(seed)
    d = pd.DataFrame({"stratum": rng.integers(0, 6, n).astype(str), "psu": rng.integers(0, 80, n).astype(str), "w500": rng.uniform(1, 5, n),
                      "g": rng.integers(0, 2, n), "age": rng.integers(14, 70, n)})
    d["y"] = (rng.uniform(size=n) < 0.3 + 0.2 * d.g).astype(float)
    return d


def test_lpm_dummy_equals_diff():
    d = frame(); D = Design(d)
    X = np.column_stack([np.ones(len(d)), d.g.to_numpy(float)])
    fit = D.regress(d.y.to_numpy(float), X, np.ones(len(d), bool), "lpm", ["const", "g"])
    e = D.diff(d.y.to_numpy(float), np.ones(len(d)), (d.g == 1).to_numpy(), (d.g == 0).to_numpy())
    assert abs(fit.beta[1] - e.est) < 1e-8 and abs(fit.se[1] - e.se) < 1e-8


def test_var_total_mat_diag_matches_var_total():
    d = frame(); D = Design(d)
    Z = np.column_stack([d.w500 * d.y, d.w500 * d.age])
    V = D.var_total_mat(Z)
    assert abs(V[0, 0] - D.var_total(Z[:, 0])) < 1e-8 and abs(V[1, 1] - D.var_total(Z[:, 1])) < 1e-8


def test_logit_point_estimates_match_glm():
    import statsmodels.api as sm
    d = frame(); D = Design(d)
    X, names, _, _ = Spec([{"var": "g", "kind": "cat"}, {"var": "age", "kind": "num"}]).build(d)
    fit = D.regress(d.y.to_numpy(float), X, np.ones(len(d), bool), "logit", names)
    glm = sm.GLM(d.y.to_numpy(float), X, family=sm.families.Binomial(), var_weights=d.w500.to_numpy()).fit()
    assert np.allclose(fit.beta, glm.params, atol=1e-8)
    assert fit.ame is not None and 0.1 < fit.ame[1] < 0.3


def test_bootstrap_close_to_linearised():
    d = frame(6000, 5); D = Design(d)
    y = d.y.to_numpy(float); m = np.ones(len(d), bool)
    lin = D.ratio(y, np.ones(len(d)), m)
    ests = []
    for w in D.bootstrap_weights(R=150, seed=1):
        ests.append((w * y).sum() / w.sum())
    boot_se = np.std(ests, ddof=1)
    assert abs(boot_se - lin.se) / lin.se < 0.2


def test_deviation_contrast_sums_zero():
    d = frame(); X, names, _, _ = Spec([{"var": "g", "kind": "cat", "contrast": "dev"}]).build(d)
    assert set(np.unique(X[:, 1])) == {-1.0, 1.0}
