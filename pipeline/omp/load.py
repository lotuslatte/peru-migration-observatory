"""Lectura de microdatos ENAHO (.dta/.sav) con selección de columnas y llaves normalizadas."""
from pathlib import Path
import pandas as pd
import pyreadstat
from .config import variables

_KEYS = variables()["keys"]
_WIDTHS = variables()["key_widths"]


def read_enaho(path: Path, usecols: list[str] | None = None, optional: set[str] | None = None) -> pd.DataFrame:
    """Lee `path` devolviendo columnas en minúsculas; `usecols` en minúsculas (case-insensitive).
    Columnas en `optional` que no existan se omiten silenciosamente; otras faltantes → error."""
    path = Path(path)
    reader = pyreadstat.read_sav if path.suffix.lower() == ".sav" else pyreadstat.read_dta
    _, meta = reader(str(path), metadataonly=True)
    actual = {c.lower(): c for c in meta.column_names}
    cols = None
    if usecols:
        want = [c.lower() for c in usecols]
        missing = [c for c in want if c not in actual]
        hard = [c for c in missing if not (optional and c in optional)]
        if hard:
            raise KeyError(f"{path.name}: missing columns {hard}")
        cols = [actual[c] for c in want if c in actual]
    df, _ = reader(str(path), usecols=cols, apply_value_formats=False)
    df.columns = df.columns.str.lower().str.strip()
    for k in _KEYS:
        if k in df.columns:
            s = df[k]
            if pd.api.types.is_numeric_dtype(s):
                s = s.astype("Int64").astype(str)
            df[k] = s.astype(str).str.strip().str.replace(r"\.0$", "", regex=True).str.zfill(_WIDTHS[k])
    if "ubigeo" in df.columns:
        u = df["ubigeo"]
        if pd.api.types.is_numeric_dtype(u):
            u = u.astype("Int64").astype(str)
        df["ubigeo"] = u.astype(str).str.strip().str.replace(r"\.0$", "", regex=True).str.zfill(6)
    return df
