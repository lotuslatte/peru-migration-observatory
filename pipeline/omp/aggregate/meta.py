from datetime import date
import pandas as pd
from .common import *
from ..config import load_yaml, RSE_A, RSE_B, MIN_N



def build(est):
    ipc = pd.read_csv(CONFIG_DIR / "ipc_lima_2014_2024.csv", comment="#")
    ag = {}
    obj = {"generated": date.today().isoformat(), "years": YEARS, "headline_year": HEADLINE_YEAR,
           "grades": {"A": f"RSE < {int(RSE_A*100)} %", "B": f"RSE {int(RSE_A*100)}–{int(RSE_B*100)} %", "S": f"RSE ≥ {int(RSE_B*100)} % o n < {MIN_N}"},
           "indicators": {k: {kk: v.get(kk) for kk in ("label_es", "label_en", "unit", "type")} for k, v in IND.items()},
           "domains": {k: {"label_es": v["label_es"], "labels": {str(kk): vv for kk, vv in (v.get("labels_es") or (recode_labels(v["recode"]) if "recode" in v else {})).items()}} for k, v in DOM.items()},
           "ipc": ipc.to_dict(orient="records"),
           "migration_defs": {"recent": "Residía en otro distrito hace 5 años (p401f=2); interdepartamental si el departamento de p401g difiere del actual; internacional si p401g empieza en 00 (00+continente+país; 004037 = Venezuela); 999999 = no especificado (excluido).", "lifetime": "Residencia de la madre al nacer (p401g1/p401g2), disponible desde 2018.", "population": "Personas de 5 y más años con respuesta válida (p401f ∈ {1,2}); peso facpob07.", "emigration": "Emigrantes de X = personas observadas en otros departamentos cuyo origen hace 5 años es X; tasa = emigrantes / población aproximada de X hace 5 años (población actual − inmigrantes − internacionales + emigrantes).", "net": "Saldo = inmigrantes − emigrantes, por mil habitantes de 5+."},
           "design": {"weight": "fac500a", "psu": "conglome", "strata": "departamento × estrato (pseudo-estratos)", "variance": "Linealización de Taylor; estratos con un PSU centrados en la media global", "median": "IC de Woodruff"},
           "sample": {int(y): int(est[(est.year == y) & (est.indicator == "mig5_any") & (est.domain == "national")].iloc[0]["n"]) for y in YEARS}}
    return dump(obj, "meta.json")
