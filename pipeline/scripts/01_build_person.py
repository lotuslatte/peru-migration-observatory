import sys, time
from omp.config import YEARS
from omp.build_person import build
for y in ([int(a) for a in sys.argv[1:]] or YEARS):
    t = time.time(); df = build(y)
    print(f"{y}: {len(df):,} personas; población ponderada {df.w_pop.sum()/1e6:.2f} M ({time.time()-t:.0f}s)", flush=True)
