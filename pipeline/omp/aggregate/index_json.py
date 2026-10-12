"""Índice machine-readable de public/data y diccionario de variables."""
import hashlib, json, os
import pandas as pd
from .common import *
from ..config import load_yaml


def build():
    files = []
    for root, _, fns in os.walk(SITE_DATA_DIR):
        for fn in sorted(fns):
            p = os.path.join(root, fn)
            if fn in ("index.json",): continue
            rel = os.path.relpath(p, SITE_DATA_DIR)
            files.append({"path": rel, "bytes": os.path.getsize(p), "sha1": hashlib.sha1(open(p, "rb").read()).hexdigest()[:12]})
    rows = []
    for k, v in IND.items():
        rows.append({"id": k, "label_es": v.get("label_es"), "label_en": v.get("label_en"), "type": v["type"], "unit": v.get("unit"), "numerator": v.get("num") or v.get("var"), "denominator": v.get("den"), "note": v.get("note", "")})
    pd.DataFrame(rows).to_csv(SITE_DATA_DIR / "dictionary.csv", index=False)
    cellschema = {"v": "estimación (null si suprimida)", "se": "error estándar de diseño", "lo/hi": "IC 95 %", "rse": "error estándar relativo (%)", "n": "observaciones sin ponderar", "g": "sello: A sólido, B cautela, S suprimido"}
    obj = {"schema_version": "1.1", "generated": pd.Timestamp.today().date().isoformat(), "license": "CC-BY-4.0", "cell": cellschema, "files": files, "n_files": len(files),
           "glossary": load_yaml("glossary.yml"), "faq": load_yaml("faq.yml")}
    return dump(obj, "index.json")
