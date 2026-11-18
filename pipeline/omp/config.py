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

# Release year: the single place to change for a new ENAHO year.
# A new year also needs its row in config/ipc_lima.csv and a bump of DATA_VERSION.
FIRST_YEAR = 2014
HEADLINE_YEAR = 2025
DATA_VERSION = "2026.1"   # YYYY.N, raised whenever published data change
YEARS = list(range(FIRST_YEAR, HEADLINE_YEAR + 1))
POOL_YEARS = YEARS[-5:]   # pooled window for flows, the O-D matrix and provinces
SPAN = f"{FIRST_YEAR}–{HEADLINE_YEAR}"
POOL_SPAN = f"{POOL_YEARS[0]}–{POOL_YEARS[-1]}"
# Tokens replaced in every config/*.yml so titles and labels follow the release year.
YEAR_TOKENS = {"__POOL_FIRST__": POOL_YEARS[0], "__FIRST__": FIRST_YEAR, "__PREV__": HEADLINE_YEAR - 1, "__YEAR__": HEADLINE_YEAR}
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
    text = (CONFIG_DIR / name).read_text(encoding="utf-8")
    for token, year in YEAR_TOKENS.items():
        text = text.replace(token, str(year))
    return yaml.safe_load(text)


def ipc_lima():
    """Lima CPI, annual average, indexed by year (any base)."""
    import pandas as pd
    ipc = pd.read_csv(CONFIG_DIR / "ipc_lima.csv", comment="#").set_index("year")["ipc_lima"]
    missing = [y for y in YEARS if y not in ipc.index]
    if missing:
        raise SystemExit(f"config/ipc_lima.csv has no CPI for {missing}")
    return ipc


def deflators():
    """Multiplier from each year's soles to soles of HEADLINE_YEAR."""
    ipc = ipc_lima()
    return ipc[HEADLINE_YEAR] / ipc


def variables():
    return load_yaml("variables.yml")
