import pandas as pd
from .config import load_yaml, OUT_DIR
from .aggregate.common import pick


def run(est) -> pd.DataFrame:
    rows = []
    for t in load_yaml("official_migration.yml")["targets"]:
        r = pick(est, t["indicator"], t["domain"], t["key"], t["year"])
        obs = None if r is None else round(float(r["est"]), 2)
        rows.append({"year": t["year"], "indicator": t["indicator"], "domain": t["domain"], "official": t["value"], "observatorio": obs, "tolerance": t["tolerance_pp"], "source": t["source"]})
    df = pd.DataFrame(rows); df["diff"] = (df.observatorio - df.official).round(2); df["ok"] = df["diff"].abs() <= df.tolerance
    df.to_csv(OUT_DIR / "validation.csv", index=False)
    (OUT_DIR.parent.parent / "site" / "public" / "data" / "validation.csv").write_text(df.to_csv(index=False))
    return df
