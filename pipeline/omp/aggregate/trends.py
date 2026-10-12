from .common import *
from .smooth import add_smooth
from ..config import OUT_DIR
import pandas as pd

IND_T = ["mig5_any", "mig5_cross", "mig5_intra", "mig5_intl", "mig5_ven", "life_cross", "life_abroad", "gap_inf_mig", "gap_ur_mig", "gap_inc_mig"]


def build(est):
    s = {"national": {k: series(est, k, "national", "all") for k in IND_T}}
    for dom, keys in [("sex", ["1", "2"]), ("area", ["1", "2"]), ("region_nat", ["1", "2", "3", "4"]), ("age5", ["0", "1", "2", "3", "4"]), ("educ4", ["1", "2", "3", "4"]), ("lengua3", ["1", "2"])]:
        s[dom] = {k: {key: series(est, k, dom, key) for key in keys} for k in ["mig5_any", "mig5_cross", "mig5_intl", "life_cross"]}
    s["mig3"] = {k: {key: series(est, k, "mig3", key) for key in ["0", "1", "2"]} for k in ["lfpr", "ur", "informality", "median_inc_real", "pobre"]}
    s["dept"] = {rid: {k: series(est, k, "lima" if rid in ("15M", "15R") else "dept", rid) for k in ["mig5_cross", "mig5_intl", "life_cross"]} for rid in CROSSWALK.ubigeo2}
    obj = {"years": YEARS, "series": s, "smooth": add_smooth(s), "labels": {dom: {str(k): v for k, v in (DOM[dom].get("labels_es") or recode_labels(DOM[dom]["recode"])).items()} for dom in ["sex", "area", "region_nat", "age5", "educ4", "lengua3", "mig3"]},
           "notes": {"2018": "Desde 2018 la ENAHO pregunta el lugar de residencia de la madre al nacer (migración de toda la vida).", "2020": "Pandemia: levantamiento parcialmente telefónico."}}
    return dump(obj, "trends.json")
