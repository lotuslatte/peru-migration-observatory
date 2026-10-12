"""Archivo persona-año para migración: base módulo 200 (todos los miembros, facpob07) + m04 (migración) + m03 + m05 (empleo, fac500a) + sumaria."""
import numpy as np
import pandas as pd
from .config import OUT_DIR
from .harmonise import load_module, apply_recodes, KEYS


def build(year: int, write: bool = True) -> pd.DataFrame:
    m02 = load_module("m02", year); m03 = load_module("m03", year); m04 = load_module("m04", year); m05 = load_module("m05", year); m34 = load_module("m34", year)
    for d in (m02, m03, m04, m05, m34):
        for c in d.columns:
            if c not in KEYS and not c.startswith("ubigeo"):
                d[c] = pd.to_numeric(d[c], errors="coerce")
    m05 = m05.drop(columns=["sex", "age"], errors="ignore")
    df = (m02.merge(m04, on=KEYS, how="left").merge(m03, on=KEYS, how="left").merge(m05, on=KEYS, how="left").merge(m34, on=KEYS[:3], how="left"))
    df = df[df["member"].fillna(1) == 1].copy()
    df["year"] = year
    df["sex"] = df["sex_m02"]; df["age"] = df["age_m02"]
    # ubigeo comes from m05 for 14+, missing for children -> take from m02? m02 lacks ubigeo in our var list; use m04/m05 ubigeo
    for c in ("ubigeo", "ubigeo_m04"):
        if c in df.columns:
            v = df[c].astype(str).str.replace(r"\.0$", "", regex=True).str.zfill(6)
            df[c] = v.where(df[c].notna() & ~v.isin(["000nan", "00None"]), None)
    df["ubigeo"] = df["ubigeo_m04"].where(df["ubigeo_m04"].notna(), df.get("ubigeo"))
    df["dominio"] = df["dominio_m04"].where(df["dominio_m04"].notna(), df.get("dominio"))
    df["estrato"] = df["estrato_m04"].where(df["estrato_m04"].notna(), df.get("estrato"))
    df = df[df["ubigeo"].notna()].copy()
    df["dept"] = df["ubigeo"].str[:2]; df["prov"] = df["ubigeo"].str[:4]
    df["educ_raw"] = df["educ_raw"].fillna(df["educ_raw_m05"])
    df = apply_recodes(df)
    df["psu"] = df["conglome"]; df["stratum"] = df["dept"] + "-" + df["estrato"].astype("Int64").astype(str)
    df["w_pop"] = df["w_pop"].fillna(df["w400"])
    df = df[df["w_pop"].notna() & (df["w_pop"] > 0)].copy()
    if write:
        df.to_parquet(OUT_DIR / f"person_{year}.parquet", index=False)
    return df


def load_person(year: int) -> pd.DataFrame:
    return pd.read_parquet(OUT_DIR / f"person_{year}.parquet")
