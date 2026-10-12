"""Exposición climática por departamento-año (panel distrital de peru_climate_integrated) para el capítulo clima ↔ migración."""
import pandas as pd
from .config import CLIMATE_PANEL, OUT_DIR


def dept_climate() -> pd.DataFrame:
    cols = ["year", "dept", "weight", "temp_anom", "precip_anom", "dry_years", "hot_years", "climate_risk_index", "temp_trend_decade", "precip_cv"]
    p = pd.read_parquet(CLIMATE_PANEL, columns=cols)
    p = p.dropna(subset=["dept"])
    g = p.groupby(["year", "dept"])
    out = g.apply(lambda x: pd.Series({c: (x[c] * x["weight"]).sum() / x["weight"].sum() for c in cols[3:]}), include_groups=False).reset_index()
    out["year"] = out["year"].astype(int)
    out.to_parquet(OUT_DIR / "dept_climate.parquet", index=False)
    return out
