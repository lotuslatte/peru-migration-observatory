import sys, time, pandas as pd
from omp.config import YEARS, OUT_DIR
from omp.build_person import load_person
from omp.derive import derive
from omp.engine import run_year
parts = []
for y in ([int(a) for a in sys.argv[1:]] or YEARS):
    t = time.time(); est = run_year(derive(load_person(y)), y); parts.append(est)
    print(f"{y}: {len(est):,} estimaciones ({time.time()-t:.0f}s) {est.grade.value_counts().to_dict()}", flush=True)
pd.concat(parts, ignore_index=True).to_parquet(OUT_DIR / "estimates.parquet", index=False)
