"""Frames agrupados de varios años: pesos /k, PSU y estrato prefijados por año (muestras independientes)."""
import pandas as pd
from .build_person import load_person


def load_pooled(years, derive=None) -> pd.DataFrame:
    parts = []
    for y in years:
        d = load_person(y)
        if derive is not None:
            d = derive(d)
        for w in ("w500", "w_pop"):
            if w in d.columns:
                d[w] = d[w] / len(years)
        d["psu"] = f"{y}|" + d["psu"].astype(str)
        d["stratum"] = f"{y}|" + d["stratum"].astype(str)
        parts.append(d)
    return pd.concat(parts, ignore_index=True)
