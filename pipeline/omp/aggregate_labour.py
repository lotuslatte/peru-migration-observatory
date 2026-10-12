"""Resultados laborales (14+, fac500a) reutilizando las definiciones del Observatorio Laboral."""
import numpy as np
import pandas as pd
from .config import CONFIG_DIR

_IPC = pd.read_csv(CONFIG_DIR / "ipc_lima_2014_2024.csv", comment="#").set_index("year")["deflator_to_2024"]
INC = ["inc_main_annual", "inc_main_inkind", "inc_self_annual", "inc_self_autoconsumo", "inc_sec_annual", "inc_sec_inkind", "inc_sec_self", "inc_sec_autoconsumo", "inc_extra_annual"]


def derive_labour(d: pd.DataFrame) -> pd.DataFrame:
    y = int(d["year"].iloc[0])
    pet = d["age"].ge(14) & d["w500"].notna() & d["w500"].gt(0)
    occ = d["ocu500"].eq(1) & pet
    d["pet"] = pet.astype("Int8")
    d["pea"] = d["ocu500"].isin([1, 2]).astype("Int8").where(pet)
    d["ocupado"] = occ.astype("Int8").where(pet)
    d["desocupado"] = d["ocu500"].eq(2).astype("Int8").where(pet)
    if d["ocupinf_inei"].notna().any():
        d["informal"] = d["ocupinf_inei"].map({1: 1, 2: 0}).astype("Int8").where(occ)
    else:
        ins = d["ins_essalud"].eq(1) | d["ins_eps"].eq(1) | d["ins_priv"].eq(1) | d["ins_ffaa"].eq(1)
        sec_inf = d["sunat_reg"].eq(3)
        unprot = (~ins & d["pension_none"].eq(5)) | d["contract"].isin([5, 7])
        cat = d["cat_ocup"]
        inf = np.where(cat.isin([1, 2]), sec_inf, np.where(cat.isin([3, 4, 6, 7]), sec_inf | unprot, True))
        d["informal"] = pd.Series(inf, index=d.index).astype("Int8").where(occ)
    inc = d[INC].apply(pd.to_numeric, errors="coerce").fillna(0).sum(axis=1) / 12
    d["inc_month_real"] = (inc * float(_IPC.loc[y])).where(occ)
    d["has_income"] = (inc > 0).astype("Int8").where(occ)
    d["inc_real_pos"] = d["inc_month_real"].where(inc > 0)
    d["wage_worker"] = d["cat_ocup"].isin([3, 4, 6]).astype("Int8").where(occ)
    d["contract_any"] = d["contract"].ne(7).astype("Int8").where(occ & d["wage_worker"].eq(1))
    d["pension"] = d["pension_none"].ne(5).astype("Int8").where(occ)
    ins_any = d[["ins_essalud", "ins_priv", "ins_eps", "ins_ffaa", "ins_sis", "ins_univ", "ins_other1", "ins_other"]].eq(1).any(axis=1)
    d["seguro"] = ins_any.astype("Int8").where(pet)
    d["self_emp"] = d["cat_ocup"].eq(2).astype("Int8").where(occ)
    d["neet"] = ((~occ) & d["attends"].ne(1)).astype("Int8").where(d["age"].between(15, 29))
    d["pobre"] = d["pobreza"].isin([1, 2]).astype("Int8")
    return d
