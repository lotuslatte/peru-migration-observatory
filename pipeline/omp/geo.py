from pathlib import Path
"""Shapefile de departamentos → TopoJSON simplificado con id = ubigeo2."""
import json
import geopandas as gpd
import topojson as tp
from .config import SHAPEFILE, CONFIG_DIR, SITE_DATA_DIR
import pandas as pd


def build(tolerance=0.02):
    g = gpd.read_file(SHAPEFILE)[["departamen", "region_nat", "geometry"]]
    cw = pd.read_csv(CONFIG_DIR / "dept_crosswalk.csv", dtype=str)
    cw = cw[cw.name_shapefile.notna() & (cw.name_shapefile != "")]
    g = g.merge(cw[["ubigeo2", "name", "name_shapefile"]], left_on="departamen", right_on="name_shapefile", how="left")
    assert g.ubigeo2.notna().all(), g[g.ubigeo2.isna()].departamen.tolist()
    g = g[["ubigeo2", "name", "region_nat", "geometry"]].rename(columns={"ubigeo2": "id"})
    topo = tp.Topology(g, prequantize=1e5, topology=True, toposimplify=tolerance)
    out = SITE_DATA_DIR / "departamentos.topo.json"
    out.write_text(topo.to_json())
    return out


PROV_SHP = Path("/home/xerox/Documents/03_data/gis/peru_admin_boundaries/provincias/PROVINCIAS_inei_geogpsperu_suyopomalia.shp")


def build_provinces(tolerance=0.01):
    """Shapefile provincial → provincias.topo.json (id = ubigeo 4 dígitos) y DataFrame de nombres."""
    g = gpd.read_file(PROV_SHP)
    cols = {c.lower(): c for c in g.columns}
    idc = next(cols[c] for c in cols if c in ("idprov", "ubigeo", "ccpp", "cod_prov", "id_prov", "idprovincia"))
    nmc = next(cols[c] for c in cols if c in ("provincia", "nombprov", "nom_prov", "nombre"))
    g["id"] = g[idc].astype(str).str.replace(r"\.0$", "", regex=True).str.zfill(4).str[:4]
    g["name"] = g[nmc].astype(str).str.title()
    g = g[["id", "name", "geometry"]].dissolve(by="id", aggfunc="first").reset_index()
    if g.crs and g.crs.to_epsg() != 4326:
        g = g.to_crs(4326)
    topo = tp.Topology(g, prequantize=1e5, topology=True, toposimplify=tolerance)
    (SITE_DATA_DIR / "provincias.topo.json").write_text(topo.to_json())
    names = pd.DataFrame({"ubigeo4": g["id"], "name": g["name"], "dept": g["id"].str[:2]})
    names.to_csv(CONFIG_DIR / "prov_names.csv", index=False)
    return names
