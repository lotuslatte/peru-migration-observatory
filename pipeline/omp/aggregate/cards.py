"""Share cards (OG images 1200×630) con matplotlib: nacional + una por región."""
import json
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from ..config import SITE_DATA_DIR, ROOT_DIR

INK, MUTED, INF, FOR, BG = "#1a1c2e", "#6f7288", "#a8244f", "#167a6e", "#f7f7f4"


def card(title, subtitle, kpis, out, credit="Observatorio · Favio Samillan Flores · INEI ENAHO"):
    import textwrap
    fig = plt.figure(figsize=(12, 6.3), dpi=100); fig.patch.set_facecolor(BG)
    fig.text(0.05, 0.86, "\n".join(textwrap.wrap(title, 42)), fontsize=30, weight="bold", color=INK, ha="left", va="top", family="serif")
    fig.text(0.05, 0.70, "\n".join(textwrap.wrap(subtitle, 90)), fontsize=14, color=MUTED, ha="left", va="top")
    ax = fig.add_axes([0, 0, 1, 1]); ax.axis("off"); ax.set_xlim(0, 1); ax.set_ylim(0, 1)
    n = len(kpis); w = 0.9 / n
    for i, (lab, val, kind) in enumerate(kpis):
        x = 0.05 + i * w
        fig.text(x, 0.42, val, fontsize=40, weight="bold", color=INF if kind == "informal" else FOR, ha="left", va="center", family="serif")
        fig.text(x, 0.28, "\n".join(textwrap.wrap(lab, 22)), fontsize=12, color=INK, ha="left", va="top")
    ax.plot([0.05, 0.95], [0.12, 0.12], color="#dedfd8", lw=1)
    fig.text(0.05, 0.06, credit, fontsize=11, color=MUTED, ha="left", va="center")
    fig.savefig(out, facecolor=BG); plt.close(fig)


def fmt(c, unit="%", nd=1):
    if c is None or c.get("v") is None: return "—"
    v = c["v"]
    return (f"S/ {v:,.0f}" if unit == "S/" else f"{v:.{nd}f}{' pp' if unit == 'pp' else ' %'}").replace(",", " ")


def build_labour():
    d = SITE_DATA_DIR.parent / "share"; d.mkdir(exist_ok=True)
    h = json.load(open(SITE_DATA_DIR / "headline.json")); k = h["kpis"]
    card("Observatorio Laboral del Perú", f"ENAHO {h['year']} · {h['n_persons']:,} entrevistas · errores de diseño y sellos de confiabilidad".replace(",", " "),
         [("Empleo informal", fmt(k["informality"]), "informal"), ("Desempleo", fmt(k["ur"]), "formal"), ("Empleo adecuado", fmt(k["adecuado"]), "formal"), ("Ingreso mediano", fmt(k["median_inc_real"], "S/"), "formal")], d / "default.png")
    a = json.load(open(SITE_DATA_DIR / "atlas_regions.json"))
    for r in a["regions"]:
        v = r["values"]
        card(f"{r['name']}: mercado laboral {a['year']}", "Observatorio Laboral del Perú · INEI ENAHO · sellos de confiabilidad",
             [("Informalidad", fmt({"v": None if v['formality']['v'] is None else 100 - v['formality']['v']}), "informal"), ("Desempleo", fmt(v["ur"]), "formal"), ("Empleo adecuado", fmt(v["adecuado"]), "formal"), ("Ingreso mediano", fmt(v["median_inc_real"], "S/"), "formal")], d / f"{r['id']}.png")
    return d


def build_migration():
    d = SITE_DATA_DIR.parent / "share"; d.mkdir(exist_ok=True)
    h = json.load(open(SITE_DATA_DIR / "headline.json")); k = h["kpis"]
    card("Observatorio de Migración del Perú", f"ENAHO {h['year']} · ENPOVE 2018/2022 · ENAHO-PV 2024",
         [("Nacidos en otro dpto.", fmt(k["life_cross"]), "informal"), ("Llegaron de otro dpto. (5 años)", fmt(k["mig5_cross"], "%", 2), "informal"), ("Del extranjero (5 años)", fmt(k["mig5_intl"], "%", 2), "informal"), ("Brecha informalidad migrante", fmt(k["gap_inf_mig"], "pp"), "formal")], d / "default.png")
    a = json.load(open(SITE_DATA_DIR / "atlas_regions.json"))
    for r in a["regions"]:
        v = r["values"]
        card(f"{r['name']}: migración {a['year']}", "Observatorio de Migración del Perú · INEI ENAHO",
             [("Saldo neto (‰, 5 años)", fmt(v["net_rate"], "pp").replace(" pp", " ‰"), "informal"), ("Inmigración reciente", fmt(v["mig5_cross"], "%", 2), "informal"), ("Nacidos en otro dpto.", fmt(v["life_cross"]), "informal"), ("Ingreso migrante/local", "—" if v["gap_inc_mig"]["v"] is None else f"{v['gap_inc_mig']['v']:.2f}", "formal")], d / f"{r['id']}.png")
    return d
