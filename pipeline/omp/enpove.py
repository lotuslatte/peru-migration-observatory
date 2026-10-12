"""Población venezolana: ENPOVE 2018 (8 ciudades), ENPOVE 2022 (8 ciudades), ENAHOPV 2024 (nacional). Armonización mínima y estimaciones con SE de diseño."""
import re
import numpy as np
import pandas as pd
import pyreadstat
from .config import ENPOVE_DIR, VZ_DIR, OUT_DIR, CONFIG_DIR
from .survey import Design, as_float
from .aggregate.common import cell, _r, dump, DEPT_NAME, CROSSWALK

EDU_YEARS = {1: 0, 2: 0, 3: 3, 4: 6, 5: 9, 6: 11, 7: 13, 8: 14, 9: 13.5, 10: 16, 11: 18}


def _sav(path, cols=None):
    _, meta = pyreadstat.read_sav(str(path), metadataonly=True)
    actual = {c.upper(): c for c in meta.column_names}
    use = [actual[c] for c in cols if c in actual] if cols else None
    missing = [c for c in (cols or []) if c not in actual]
    if missing: print("  ENPOVE missing", path.name, missing)
    df, _ = pyreadstat.read_sav(str(path), usecols=use)
    df.columns = df.columns.str.upper(); return df


def _find(dirname, pattern):
    d = ENPOVE_DIR / dirname
    return next(p for p in d.iterdir() if re.search(pattern, p.name, re.I))


def wave_2018() -> pd.DataFrame:
    m2 = _sav(_find("modulo_1417", "200"), ["CODIGO_PERSONA", "CODIGO_HOGAR", "FACTOR_DE_EXPANSION", "CONGLOMERADO", "ESTRATO_SOCIOECONOMICO", "CIUDADES_DE_ESTUDIO", "CCDD", "P204", "P205_A", "P207"])
    m3 = _sav(_find("modulo_1418", "300"), ["CODIGO_PERSONA", "P303_A", "P313", "GRUPO315COMPLETO", "P315_4", "P315_5", "P315_6", "P315_7", "P315_8", "P315_9"])
    m4 = _sav(_find("modulo_1421", "400"), ["CODIGO_PERSONA", "P401_1", "P401_2", "P401_3", "P401_4", "P401_5"])
    m5 = _sav(_find("modulo_1422", "500"), ["CODIGO_PERSONA", "P501"])
    m6 = _sav(_find("modulo_1423", "600"), ["CODIGO_PERSONA", "P601", "OCU600A", "P608", "P609", "P611", "INGTOT"])
    m7 = _sav(_find("modulo_1426", "700"), ["CODIGO_PERSONA", "P701", "P702_1", "P702_3", "P702_5", "P702_7"])
    rem = _sav(_find("modulo_1425", "630"), ["CODIGO_PERSONA", "P630_1", "P630_2", "P630_5"])
    rem = rem[rem.P630_1 == 1][["CODIGO_PERSONA", "P630_2", "P630_5"]]
    d = m2.merge(m3, on="CODIGO_PERSONA", how="left").merge(m4, on="CODIGO_PERSONA", how="left").merge(m5, on="CODIGO_PERSONA", how="left").merge(m6, on="CODIGO_PERSONA", how="left").merge(m7, on="CODIGO_PERSONA", how="left").merge(rem, on="CODIGO_PERSONA", how="left")
    d = d[d.P207 == 1]  # migró de Venezuela
    city = {1: "Lima", 2: "Lima", 3: "Lima", 4: "Lima", 5: "Callao", 6: "Arequipa", 7: "Cusco", 8: "Trujillo", 9: "Tumbes"}
    out = pd.DataFrame({
        "wave": 2018, "w": d.FACTOR_DE_EXPANSION, "psu": d.CONGLOMERADO.astype(str), "stratum": d.ESTRATO_SOCIOECONOMICO.astype(str),
        "city": d.CIUDADES_DE_ESTUDIO.map(city), "dept": d.CCDD.astype(str).str.zfill(2), "sex": d.P204, "age": d.P205_A, "arrival": d.P303_A,
        "regular": (d.GRUPO315COMPLETO.ne(10) & d.GRUPO315COMPLETO.notna()).astype(float).where(d.GRUPO315COMPLETO.notna()),
        "status": np.select([d.GRUPO315COMPLETO.eq(10), d.P315_8.eq(1), d.P315_5.eq(1) | d.P315_4.eq(1), d.P315_6.eq(1) | d.P315_7.eq(1)], ["Sin permiso", "Carné de extranjería", "PTP", "Refugio"], "Otro"),
        "educ_years": d.P501.map(EDU_YEARS), "superior": d.P501.ge(7).astype(float).where(d.P501.notna()),
        "employed": d.P601.eq(1).astype(float).where(d.P601.notna()) if "P601" in d else np.nan,
        "informal": ((d.P608.isin([3, 4, 6]) & d.P609.eq(2)) | d.P608.isin([1, 2, 5])).astype(float).where(d.P608.isin([1, 2, 3, 4, 5, 6])),
        "income": pd.to_numeric(d.INGTOT, errors="coerce").where(lambda s: s.between(1, 99999)),
        "hours": pd.to_numeric(d.P611, errors="coerce").where(lambda s: s.between(1, 98)),
        "insured": (d.P401_5.ne(1)).astype(float).where(d.P401_5.notna()),
        "remit": d.P630_2.eq(1).astype(float).where(d.P630_2.notna()),
        "discrim": d.P701.eq(1).astype(float).where(d.P701.notna()),
        "discrim_work": (d.P701.eq(1) & d.P702_1.eq(1)).astype(float).where(d.P701.notna()),
        "discrim_street": (d.P701.eq(1) & d.P702_5.eq(1)).astype(float).where(d.P701.notna()),
        "stay": d.P313.eq(1).astype(float).where(d.P313.isin([1, 2])),
    })
    return out


def wave_2022() -> pd.DataFrame:
    p = VZ_DIR / "02_ENPOVE_2022" / "2_dta" / "ENPOVE2022_V_200-300-400-500-600-700-800.csv"
    d = pd.read_csv(p, encoding="utf-8-sig", low_memory=False); d.columns = d.columns.str.upper().str.strip()
    e = pd.read_csv(VZ_DIR / "02_ENPOVE_2022" / "2_dta" / "ENPOVE2022_V_600 Empleo.csv", encoding="utf-8-sig", low_memory=False); e.columns = e.columns.str.upper().str.strip()
    key = ["CONGLOMERADO", "VIVIENDA", "NHOGAR", "P200_N"]
    if "INGTOT" not in d.columns:
        d = d.merge(e[key + ["INGTOT"]], on=key, how="left")
    for c in d.columns:
        if c.startswith(("P", "INGTOT", "FACTOR", "CCDD", "ESTRATO")) and c not in ("CIUDAD",):
            d[c] = pd.to_numeric(d[c], errors="coerce")
    d = d[d.P208.eq(1)] if "P208" in d.columns else d
    out = pd.DataFrame({
        "wave": 2022, "w": d.FACTORFINAL, "psu": d.CONGLOMERADO.astype(str), "stratum": d.ESTRATO.astype(str),
        "city": d.CIUDAD.str.title().replace({"Lima Metropolitana": "Lima"}), "dept": d.CCDD.astype(str).str.zfill(2), "sex": d.P204, "age": d.P205_A, "arrival": d.P303_ANIO,
        "regular": d.P307.ne(15).astype(float).where(d.P307.notna()),
        "status": np.select([d.P307.eq(15), d.P307.isin([2, 3, 4, 5, 6, 7, 8]), d.P307.isin([1]), d.P307.isin([9, 10]), d.P307.eq(13)], ["Sin permiso", "Carné de extranjería", "CPP", "PTP", "DNI"], "Otro"),
        "educ_years": d.P501.map(EDU_YEARS), "superior": d.P501.ge(7).astype(float).where(d.P501.notna()),
        "employed": d.P601.eq(1).astype(float).where(d.P601.notna()),
        "informal": ((d.P612.isin([3, 4, 6]) & d.P613.eq(2)) | d.P612.isin([1, 2, 5])).astype(float).where(d.P612.isin([1, 2, 3, 4, 5, 6])),
        "income": pd.to_numeric(d.INGTOT, errors="coerce").where(lambda s: s.between(1, 99999)),
        "hours": np.where(d.P616.eq(1), d.P615_T, d.P616A), 
        "insured": d.P401_5.ne(1).astype(float).where(d.P401_5.notna()),
        "remit": d.P639_1.eq(1).astype(float).where(d.P639_1.notna()),
        "discrim": d.P701.eq(1).astype(float).where(d.P701.notna()),
        "discrim_work": (d.P701.eq(1) & d.P703_1.eq(1)).astype(float).where(d.P701.notna()),
        "discrim_street": (d.P701.eq(1) & d.P703_5.eq(1)).astype(float).where(d.P701.notna()),
        "stay": d.P311.eq(1).astype(float).where(d.P311.isin([1, 2])),
    })
    out["hours"] = pd.to_numeric(out["hours"], errors="coerce").where(lambda s: s.between(1, 98))
    return out


def wave_2024() -> pd.DataFrame:
    base = VZ_DIR / "03_ENAHOPV_2024" / "2_dta"
    def rd(name):
        d = pd.read_csv(base / name, encoding="latin1", low_memory=False, dtype=str); d.columns = d.columns.str.upper().str.strip()
        d["ID"] = d.CONGLOME.str.zfill(6) + d.VIVIENDA.str.zfill(3) + d.HOGAR.str.zfill(2) + (d.CODPERSO.str.zfill(2) if "CODPERSO" in d.columns else "")
        return d
    m2 = rd("Enahopv01-2024-200.csv"); m5 = rd("Enahopv01a-2024-500.csv"); m10 = rd("Enahopv01a-2024-1000.csv"); m3 = rd("Enahopv01A-2024-300.csv")
    num = lambda s: pd.to_numeric(s, errors="coerce")
    d = m2[["ID", "FACTOR", "CONGLOME", "ESTRATO", "UBIGEO", "P207", "P208A"]].merge(m10[["ID", "P1000_ANHO", "P1002", "P1006", "P1009", "P1010_3", "P1011_1", "P1011_5"]], on="ID", how="left") \
        .merge(m5[["ID", "OCU500", "OCUPINF", "P507", "P513T", "P520", "P520A", "I524A1", "I530A", "I538A1", "I541A"]] if "I524A1" in m5.columns else m5[["ID", "OCU500", "OCUPINF", "P507", "P513T", "P520", "P520A"]], on="ID", how="left") \
        .merge(m3[["ID", "P300B"]] if "P300B" in m3.columns else m3[["ID"]], on="ID", how="left")
    d = d[d.P1000_ANHO.notna()]
    p300b = num(d.get("P300B", pd.Series(np.nan, index=d.index)))
    inc = sum(num(d[c]).fillna(0) for c in ["I524A1", "I530A", "I538A1", "I541A"] if c in d.columns) / 12 if "I524A1" in d.columns else pd.Series(np.nan, index=d.index)
    hours = np.where(num(d.P520).between(1, 98), num(d.P520), num(d.P513T))  # ENAHOPV: P520 = horas normales (numérico)
    out = pd.DataFrame({
        "wave": 2024, "w": num(d.FACTOR), "psu": d.CONGLOME, "stratum": d.UBIGEO.str[:2] + "-" + d.ESTRATO.astype(str),
        "city": None, "dept": d.UBIGEO.str[:2], "sex": num(d.P207), "age": num(d.P208A), "arrival": num(d.P1000_ANHO),
        "regular": num(d.P1002).ne(9).astype(float).where(num(d.P1002).notna()),
        "status": np.select([num(d.P1002).eq(9), num(d.P1002).eq(2), num(d.P1002).eq(1)], ["Sin permiso", "Carné de extranjería", "Otro permiso"], "Otro"),
        "educ_years": p300b.map(EDU_YEARS), "superior": p300b.ge(7).astype(float).where(p300b.notna() & p300b.le(11)),
        "employed": num(d.OCU500).eq(1).astype(float).where(num(d.OCU500).isin([1, 2, 3, 4])),
        "informal": num(d.OCUPINF).eq(1).astype(float).where(num(d.OCUPINF).isin([1, 2])),
        "income": np.nan,  # ENAHOPV 2024: ingreso anualizado no comparable con ENPOVE (ver metodología)
        "hours": pd.Series(hours, index=d.index).where(lambda s: pd.Series(s).between(1, 98).values),
        "insured": np.nan, "remit": np.nan,
        "discrim": num(d.P1009).eq(1).astype(float).where(num(d.P1009).isin([1, 2])),
        "discrim_work": (num(d.P1009).eq(1) & num(d.P1011_1).eq(1)).astype(float).where(num(d.P1009).isin([1, 2])),
        "discrim_street": (num(d.P1009).eq(1) & num(d.P1011_5).eq(5)).astype(float).where(num(d.P1009).isin([1, 2])),
        "stay": num(d.P1006).eq(1).astype(float).where(num(d.P1006).isin([1, 2])),
    })
    return out


IND = {"employed": ("Ocupados (14+)", "%"), "informal": ("Empleo informal", "%"), "regular": ("Con permiso migratorio", "%"), "superior": ("Educación superior (técnica o universitaria)", "%"),
       "insured": ("Con seguro de salud", "%"), "remit": ("Envía remesas", "%"), "discrim": ("Sufrió discriminación", "%"), "discrim_work": ("Discriminación en el trabajo", "%"), "discrim_street": ("Discriminación en la calle / espacios públicos", "%"), "stay": ("Piensa quedarse en el Perú", "%"),
       "income": ("Ingreso laboral mediano (S/ corrientes)", "S/"), "hours": ("Horas semanales promedio", "h"), "age": ("Edad promedio", "años")}


def estimates(d: pd.DataFrame) -> dict:
    D = Design(d.reset_index(drop=True), w="w")
    d = d.reset_index(drop=True)
    ones = np.ones(len(d))
    def cells(mask):
        out = {}
        for k, (lab, unit) in IND.items():
            v = as_float(d[k])
            m = mask & ~np.isnan(v)
            if k in ("employed", "informal"):
                m &= (d.age >= 14).to_numpy()
            if unit == "%":
                e = D.ratio(v, ones, m); nd, sc = 1, 100
            elif k == "income":
                e = D.quantile(v, m, 0.5); nd, sc = 0, 1
            else:
                e = D.mean(v, m); nd, sc = 1, 1
            r = {"est": e.est * sc, "se": e.se * sc, "lo": e.ci()[0] * sc, "hi": e.ci()[1] * sc, "rse": e.rse, "n": e.n, "grade": e.grade}
            out[k] = cell(r, nd)
        return out
    allm = np.ones(len(d), bool)
    res = {"n": int(len(d)), "pop": _r(float(d.w.sum()), 0), "all": cells(allm),
           "by_sex": {str(s): cells((d.sex == s).to_numpy()) for s in (1, 2)},
           "by_cohort": {}, "by_status": {}, "by_geo": {}}
    coh = pd.cut(d.arrival, [0, 2017, 2019, 2100], labels=["Hasta 2017", "2018–2019", "2020 en adelante"])
    for c in coh.cat.categories:
        res["by_cohort"][c] = cells((coh == c).to_numpy())
    for s in d.status.dropna().unique():
        m = (d.status == s).to_numpy()
        if m.sum() >= 30: res["by_status"][s] = cells(m)
    geo = d.city if d.city.notna().any() else d.dept.map(DEPT_NAME)
    for g in geo.dropna().unique():
        m = (geo == g).to_numpy()
        if m.sum() >= 100: res["by_geo"][g] = {**cells(m), "pop": _r(float(d.w[m].sum()), 0), "n": int(m.sum())}
    res["arrival_dist"] = {str(int(y)): _r(float(w), 0) for y, w in d.groupby(d.arrival.clip(2010, 2024)).w.sum().items()}
    return res


def build():
    waves = {2018: wave_2018(), 2022: wave_2022(), 2024: wave_2024()}
    out = {"indicators": {k: {"label_es": v[0], "unit": v[1]} for k, v in IND.items()},
           "sources": {"2018": "ENPOVE 2018 (INEI): Lima Metropolitana, Callao, Arequipa, Cusco, Trujillo, Tumbes", "2022": "ENPOVE 2022 (INEI): Lima, Trujillo, Tumbes, Chimbote, Chiclayo, Piura, Ica, Arequipa", "2024": "ENAHO población venezolana 2024 (INEI): cobertura nacional"},
           "waves": {str(y): estimates(w) for y, w in waves.items()}}
    out["cohort_series"] = {c: {k: {str(y): out["waves"][str(y)]["by_cohort"].get(c, {}).get(k) for y in waves} for k in IND} for c in ["Hasta 2017", "2018–2019", "2020 en adelante"]}
    cities = pd.read_csv(CONFIG_DIR / "cities.csv", dtype=str) if (CONFIG_DIR / "cities.csv").exists() else None
    if cities is not None:
        out["cities"] = cities.to_dict(orient="records")
    pd.concat(waves.values()).to_parquet(OUT_DIR / "venezuela_person.parquet", index=False)
    return dump(out, "venezuela.json")
