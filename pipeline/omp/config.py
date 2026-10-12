from pathlib import Path
import yaml

PKG_DIR = Path(__file__).resolve().parent
PIPE_DIR = PKG_DIR.parent
ROOT_DIR = PIPE_DIR.parent
CONFIG_DIR = PIPE_DIR / "config"
OUT_DIR = PIPE_DIR / "out"
SITE_DATA_DIR = ROOT_DIR / "site" / "public" / "data"
LABOUR_OUT = Path("/home/xerox/Documents/01_projects/peru_labour_observatory/pipeline/out")
CLIMATE_PANEL = Path("/home/xerox/Documents/01_projects/peru_climate_integrated/papers/paper_a_costero/outputs/csv/migration_cross_section_2014_2023.parquet")
ENPOVE_DIR = Path("/home/xerox/Documents/03_data/inei/enpove/data")
VZ_DIR = Path("/home/xerox/gdrive-shared/VZ_regularization/2_Instruments_Data")
ENAHO_DIR = Path("/home/xerox/Documents/03_data/inei/enaho/data")
SHAPEFILE = Path("/home/xerox/Documents/03_data/gis/peru_admin_boundaries/departamentos/departamentos_peru_con_nombres.shp")

YEARS = list(range(2014, 2025))
HEADLINE_YEAR = 2024
PET_AGE = 14
YOUTH = (15, 29)
RSE_A = 0.15   # publish
RSE_B = 0.30   # review; >= B or n<MIN_N -> suppressed
MIN_N = 30

MODULE_DIRS = {"m01": "modulo_01", "m02": "modulo_02", "m03": "modulo_03", "m04": "modulo_04",
               "m05": "modulo_05", "m34": "modulo_34"}
MODULE_CODES = {"m01": "100", "m02": "200", "m03": "300", "m04": "400", "m05": "500"}

for d in (OUT_DIR, SITE_DATA_DIR):
    d.mkdir(parents=True, exist_ok=True)


def load_yaml(name: str):
    with open(CONFIG_DIR / name, encoding="utf-8") as f:
        return yaml.safe_load(f)


def variables():
    return load_yaml("variables.yml")
