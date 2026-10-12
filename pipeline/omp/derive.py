"""Banderas migratorias y laborales a nivel persona.
Migración reciente: residencia hace 5 años (p401f/p401g), población de 5+ años. Migración de toda la vida: residencia de la madre al nacer (p401g1/g2, 2018+).
Códigos de origen: 01–25 departamentos; 00xxxx extranjero (00 + continente + país; 004037 = Venezuela); 999999 no especificado."""
import numpy as np
import pandas as pd
from .config import CONFIG_DIR, YOUTH
from .aggregate_labour import derive_labour

COUNTRIES = pd.read_csv(CONFIG_DIR / "countries.csv", dtype=str).set_index("code")["name"].to_dict()


def code6(s: pd.Series) -> pd.Series:
    v = pd.to_numeric(s, errors="coerce")
    out = v.astype("Int64").astype(str).str.zfill(6)
    return out.where(v.notna(), None)


def derive(df: pd.DataFrame) -> pd.DataFrame:
    d = df.copy()
    d["pop_all"] = 1
    d["youth"] = d["age"].between(*YOUTH).astype("Int8")
    d["age5"] = pd.cut(d["age"], [-1, 14, 29, 44, 64, 200], labels=[0, 1, 2, 3, 4]).astype("Int8")
    d["age4"] = pd.cut(d["age"], [13, 24, 44, 64, 200], labels=[1, 2, 3, 4]).astype("Int8")
    # --- recent (5-year) migration ---
    o5 = code6(d["res5_ubigeo"])
    d["orig5"] = o5
    d["orig5_dept"] = o5.str[:2]
    d["pop5"] = d["res5_same"].isin([1, 2]).astype("Int8")  # población de 5+ con respuesta válida
    moved = d["res5_same"].eq(2)
    intl = moved & d["orig5_dept"].eq("00")
    unknown = moved & (d["orig5_dept"].isin(["99", None]) | d["orig5_dept"].isna())
    internal_cross = moved & d["orig5_dept"].ne(d["dept"]) & ~intl & ~unknown & d["orig5_dept"].notna()
    intra = moved & d["orig5_dept"].eq(d["dept"])
    base = d["pop5"].eq(1)
    d["mig5_cross"] = internal_cross.astype("Int8").where(base)      # inmigrante interdepartamental reciente
    d["mig5_intl"] = intl.astype("Int8").where(base)                  # llegó del extranjero
    d["mig5_intra"] = intra.astype("Int8").where(base)                # se mudó dentro del departamento
    d["mig5_any"] = (internal_cross | intl | intra).astype("Int8").where(base)
    d["mig5_ven"] = (intl & d["orig5"].eq("004037")).astype("Int8").where(base)
    d["orig5_country"] = d["orig5"].map(COUNTRIES).where(intl)
    d["mig3"] = np.select([internal_cross | intl, intra], [2, 1], 0)  # 0 no migró, 1 dentro del dpto, 2 llegó de otro dpto/país
    d["mig3"] = pd.Series(d["mig3"], index=d.index).astype("Int8").where(base)
    d["mig2"] = (internal_cross | intl).map({True: 2, False: 1}).astype("Int8").where(base)
    d["orig_group"] = d["orig5_dept"].where(internal_cross, None)
    # --- lifetime migration (2018+) ---
    if d["birth_same"].notna().any():
        b = code6(d["birth_ubigeo"])
        d["birth_dept"] = b.str[:2]
        bb = d["birth_same"].isin([1, 2])
        bm = d["birth_same"].eq(2)
        d["pop_life"] = bb.astype("Int8")
        d["life_cross"] = (bm & d["birth_dept"].ne(d["dept"]) & ~d["birth_dept"].isin(["00", "99"]) & d["birth_dept"].notna()).astype("Int8").where(bb)
        d["life_abroad"] = (bm & d["birth_dept"].eq("00")).astype("Int8").where(bb)
        d["born_ven"] = (bm & b.eq("004037")).astype("Int8").where(bb)
        d["native_here"] = (d["birth_same"].eq(1) | (bm & d["birth_dept"].eq(d["dept"]))).astype("Int8").where(bb)
    else:
        for c in ["pop_life", "life_cross", "life_abroad", "born_ven", "native_here"]:
            d[c] = pd.Series(pd.NA, index=d.index, dtype="Int8")
        d["birth_dept"] = None
    d["lima"] = np.select([d["prov"].eq("1501") | d["dept"].eq("07"), d["dept"].eq("15")], ["15M", "15R"], None)
    d = derive_labour(d)
    return d
