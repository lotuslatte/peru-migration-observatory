"""Aplica variables.yml: lee un módulo/año y devuelve columnas canónicas."""
import pandas as pd
from .config import variables
from .files import enaho_file
from .load import read_enaho

VARS = variables()
KEYS = VARS["keys"]


def module_spec(module: str) -> dict:
    return VARS["modules"][module]


def resolve(module: str, year: int) -> tuple[dict, set]:
    """canonical -> source name for this year; set of optional sources."""
    spec = module_spec(module)
    mapping, optional = {}, set()
    for canon, v in spec["vars"].items():
        src = v.get("by_year", {}).get(year, v["src"])
        mapping[canon] = src.lower()
        if v.get("optional"):
            optional.add(src.lower())
    return mapping, optional


def load_module(module: str, year: int, keys: list[str] | None = None) -> pd.DataFrame:
    keys = keys or (KEYS[:3] if module == "m34" else KEYS)
    mapping, optional = resolve(module, year)
    usecols = keys + list(dict.fromkeys(mapping.values()))
    df = read_enaho(enaho_file(module, year), usecols=usecols, optional=optional)
    rename = {src: canon for canon, src in mapping.items() if src in df.columns}
    df = df.rename(columns=rename)
    for canon, src in mapping.items():
        if canon not in df.columns:
            df[canon] = pd.NA  # optional and absent
    return df[keys + list(mapping.keys())]


def apply_recodes(df: pd.DataFrame) -> pd.DataFrame:
    for name, rc in VARS["recodes"].items():
        src = rc["from"]
        if src in df.columns:
            df[name] = pd.to_numeric(df[src], errors="coerce").map(rc["map"]).astype("Int8")
    return df


def recode_labels(name: str) -> dict:
    return {int(k): v for k, v in VARS["recodes"][name]["labels_es"].items()}
