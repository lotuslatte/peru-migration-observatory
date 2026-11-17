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
    # status: ok | known_gap (documented, with a reason) | fail. A known gap never counts as a pass.
    known = {(t["indicator"], t["year"]): t["known_gap"] for t in load_yaml("official_migration.yml")["targets"] if t.get("known_gap")}
    df["status"] = [("ok" if ok else ("known_gap" if (i, y) in known else "fail")) for i, y, ok in zip(df.indicator, df.year, df.ok)]
    df["known_gap"] = [known.get((i, y), "") if st == "known_gap" else "" for i, y, st in zip(df.indicator, df.year, df.status)]
    df.to_csv(OUT_DIR / "validation.csv", index=False)
    (OUT_DIR.parent.parent / "site" / "public" / "data" / "validation.csv").write_text(df.to_csv(index=False))
    return df


def gate(df) -> int:
    """Exit code for the pipeline: non-zero on any failure or missing estimate."""
    bad = df[(df.status == "fail") | df.observatorio.isna()]
    for _, r in bad.iterrows():
        print(f"validation FAILED: {r.indicator} {r.year}: official {r.official}, observatory {r.observatorio}")
    return 1 if len(bad) else 0
