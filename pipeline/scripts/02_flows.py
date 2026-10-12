from omp.flows import run
from omp.climate import dept_climate
od, dep = run()
print(dep[dep.year == 2024].sort_values("net_rate")[["dept", "in_rate", "out_rate", "net_rate", "net_rate_se"]].round(2).to_string())
c = dept_climate(); print("climate", c.shape)
