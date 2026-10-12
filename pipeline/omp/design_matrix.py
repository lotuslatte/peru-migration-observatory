"""Matriz de diseño desde una especificación: numéricas, cuadráticas, categóricas (referencia o desviación), efectos fijos."""
import numpy as np
import pandas as pd

LABELS = {
    "sex": {2: "Mujer"}, "mig2": {2: "Migrante reciente"}, "area": {2: "Rural"},
    "educ4": {1: "Hasta primaria", 2: "Secundaria", 3: "Superior no univ.", 4: "Universitaria"},
    "region_nat": {1: "Costa", 2: "Sierra", 3: "Selva", 4: "Lima Metropolitana"},
    "lengua3": {1: "Lengua indígena", 2: "Castellano", 3: "Otra"},
    "etnia6": {1: "Quechua", 2: "Aimara", 3: "Amazónico/otro indígena", 4: "Afroperuano", 5: "Blanco/mestizo", 6: "Otro/NS"},
    "sector9": {1: "Agro y pesca", 2: "Minería", 3: "Manufactura", 4: "Electricidad y agua", 5: "Construcción", 6: "Comercio", 7: "Transporte y comunic.", 8: "Alojamiento y otros serv.", 9: "Serv. profesionales y públicos"},
    "status6": {1: "Empleador", 2: "Independiente", 3: "Empleado", 4: "Obrero", 5: "TFNR", 6: "Trab. hogar/otro"},
    "age4": {1: "14–24", 2: "25–44", 3: "45–64", 4: "65+"}, "age5": {0: "5–14", 1: "15–29", 2: "30–44", 3: "45–64", 4: "65+"},
    "year": {}, "dept": {},
}
NUMERIC = {"age": "Edad", "age2": "Edad²", "hours": "Horas semanales", "log_hours": "log(horas)", "dry_years_o": "Años secos (origen)", "temp_anom_o": "Anomalía térmica (origen)", "precip_anom_o": "Anomalía de lluvia (origen)"}


class Spec:
    """terms: lista de {var, kind: 'num'|'cat'|'key', ref?: valor, contrast?: 'ref'|'dev'}"""
    def __init__(self, terms, contrast="ref"):
        self.terms = terms; self.contrast = contrast

    def build(self, d: pd.DataFrame):
        cols, names, labels, groups = [np.ones(len(d))], ["const"], ["Constante"], ["const"]
        for t in self.terms:
            v = t["var"]
            if t.get("kind", "cat") == "num":
                x = pd.to_numeric(d[v], errors="coerce").to_numpy(float)
                cols.append(x); names.append(v); labels.append(NUMERIC.get(v, v)); groups.append(v)
                if t.get("square"):
                    cols.append(x ** 2 / 100); names.append(v + "2"); labels.append(NUMERIC.get(v + "2", v + "²") + " /100"); groups.append(v)
                continue
            s = pd.to_numeric(d[v], errors="coerce")
            cats = sorted(int(c) for c in s.dropna().unique())
            ref = t.get("ref", cats[0])
            contrast = t.get("contrast", self.contrast)
            others = [c for c in cats if c != ref]
            for c in others:
                x = (s == c).astype(float).to_numpy()
                if contrast == "dev":
                    x = x - (s == ref).astype(float).to_numpy()  # desviación respecto a la referencia (suma cero)
                x[s.isna().to_numpy()] = np.nan
                cols.append(x); names.append(f"{v}_{c}"); labels.append(f"{LABELS.get(v, {}).get(c, str(c))} (vs {LABELS.get(v, {}).get(ref, str(ref))})"); groups.append(v)
        X = np.column_stack(cols)
        return X, names, labels, groups
