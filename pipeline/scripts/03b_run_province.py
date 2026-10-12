import pandas as pd, geopandas as gpd
from omp.aggregate import provinces
from omp.derive import derive
from omp.config import SHAPEFILE, CONFIG_DIR
from omp.geo import build_provinces
est = provinces.run(derive)
names = build_provinces()  # también devuelve DataFrame ubigeo4/name
ids = [i["id"] for i in provinces.CFG["indicators"]]
print(provinces.build(est, ids, names))
