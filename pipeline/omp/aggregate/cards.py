"""Share cards (OG images 1200×630) con matplotlib: nacional + una por región."""
import json
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from ..config import SITE_DATA_DIR, ROOT_DIR

INK, MUTED, INF, FOR, BG, LINE = "#111214", "#666a71", "#3a43c4", "#111214", "#ffffff", "#e2e2df"
FONT_DIR = ROOT_DIR / "site" / "node_modules" / "@fontsource" / "ibm-plex-sans" / "files"


def _fonts():
    """Register the site typeface (IBM Plex Sans) from the site's own package; fall back to the default font."""
    from matplotlib import font_manager
    from fontTools.ttLib import TTFont
    import tempfile, pathlib
    tmp = pathlib.Path(tempfile.gettempdir()) / "omp_fonts"; tmp.mkdir(exist_ok=True)
    try:
        for w in (400, 600):
            ttf = tmp / f"plex-{w}.ttf"
            if not ttf.exists():
                f = TTFont(FONT_DIR / f"ibm-plex-sans-latin-{w}-normal.woff2"); f.flavor = None; f.save(ttf)
            font_manager.fontManager.addfont(str(ttf))
        plt.rcParams["font.family"] = "IBM Plex Sans"
    except Exception as e:  # the cards still render with the default font
        print("share cards: IBM Plex Sans not available,", e)


_fonts()


def _frame(site="Observatorio de Migración del Perú", credit="Favio Samillan Flores · a partir de INEI, ENAHO"):
    fig = plt.figure(figsize=(12, 6.3), dpi=100); fig.patch.set_facecolor(BG)
    ax = fig.add_axes([0, 0, 1, 1]); ax.axis("off"); ax.set_xlim(0, 1); ax.set_ylim(0, 1)
    fig.text(0.06, 0.90, site, fontsize=15, weight=600, color=INK, ha="left", va="center")
    ax.plot([0.06, 0.94], [0.845, 0.845], color=INK, lw=1.2)
    ax.plot([0.06, 0.94], [0.12, 0.12], color=LINE, lw=1)
    fig.text(0.06, 0.07, credit, fontsize=12, color=MUTED, ha="left", va="center")
    return fig, ax


def card(title, subtitle, kpis, out, credit="Favio Samillan Flores · a partir de INEI, ENAHO"):
    import textwrap
    fig, ax = _frame(credit=credit)
    fig.text(0.06, 0.78, "\n".join(textwrap.wrap(title, 44)), fontsize=30, weight=600, color=INK, ha="left", va="top")
    fig.text(0.06, 0.63, "\n".join(textwrap.wrap(subtitle, 96)), fontsize=14, color=MUTED, ha="left", va="top")
    n = len(kpis); w = 0.88 / n
    for i, (lab, val, kind) in enumerate(kpis):
        x = 0.06 + i * w
        fig.text(x, 0.40, val, fontsize=40, weight=600, color=INF if kind == "informal" else FOR, ha="left", va="center")
        fig.text(x, 0.29, "\n".join(textwrap.wrap(lab, 22)), fontsize=13, color=MUTED, ha="left", va="top")
    fig.savefig(out, facecolor=BG); plt.close(fig)


def indicator_card(name, value, note, years, values, out):
    """One indicator: its name, the national figure and the series since the first year."""
    import textwrap
    fig, _ = _frame()
    fig.text(0.06, 0.78, "\n".join(textwrap.wrap(name, 34)), fontsize=28, weight=600, color=INK, ha="left", va="top")
    fig.text(0.06, 0.40, value, fontsize=64, weight=600, color=INF, ha="left", va="center")
    fig.text(0.06, 0.24, note, fontsize=14, color=MUTED, ha="left", va="center")
    pts = [(y, v) for y, v in zip(years, values) if v is not None]
    if len(pts) > 2:
        ax = fig.add_axes([0.56, 0.24, 0.36, 0.42]); ax.patch.set_alpha(0)
        xs, ys = zip(*pts)
        ax.plot(xs, ys, color=INK, lw=2.2, solid_capstyle="round"); ax.plot(xs[-1], ys[-1], "o", color=INF, ms=11)
        for sp in ax.spines.values(): sp.set_visible(False)
        ax.set_yticks([]); ax.set_xticks([xs[0], xs[-1]]); ax.tick_params(length=0, labelsize=13, labelcolor=MUTED, pad=10)
        ax.margins(x=0.04, y=0.25)
    fig.savefig(out, facecolor=BG); plt.close(fig)


def fmt(c, unit="%", nd=1):
    if c is None or c.get("v") is None: return "s/d"
    v = c["v"]
    return f"S/{v:,.0f}" if unit == "S/" else f"{v:.{nd}f}{' pp' if unit == 'pp' else '%'}"


# Names and units as on the site (site/src/data/indicators.ts).
INDICATOR_CARDS = {
    "mig5_cross": ("Llegó de otro departamento", "%"), "mig5_any": ("Cambió de distrito", "%"),
    "mig5_intra": ("Se mudó dentro del departamento", "%"), "mig5_intl": ("Llegó del extranjero", "%"),
    "mig5_ven": ("Llegó de Venezuela", "%"), "life_cross": ("Nacidos en otro departamento", "%"),
    "life_abroad": ("Nacidos en el extranjero", "%"), "gap_inf_mig": ("Brecha de informalidad", "pp"),
    "gap_ur_mig": ("Brecha de desempleo", "pp"), "gap_inc_mig": ("Razón de ingresos", "ratio"),
}


def build_migration():
    d = SITE_DATA_DIR.parent / "share"; d.mkdir(exist_ok=True)
    h = json.load(open(SITE_DATA_DIR / "headline.json")); k = h["kpis"]
    card(f"La migración en el Perú en {h['year']}", f"ENAHO {h['year']}, ENPOVE 2018 y 2022, ENAHO-PV 2024. Cada cifra con su error de muestreo y un sello de precisión.",
         [("Nacidos en otro departamento", fmt(k["life_cross"]), "informal"), ("Llegaron de otro departamento", fmt(k["mig5_cross"], "%", 2), "informal"), ("Llegaron del extranjero", fmt(k["mig5_intl"], "%", 2), "informal"), ("Brecha de informalidad", fmt(k["gap_inf_mig"], "pp"), "formal")], d / "default.png")
    a = json.load(open(SITE_DATA_DIR / "atlas_regions.json"))
    for r in a["regions"]:
        v = r["values"]
        card(f"{r['name']}: migración {a['year']}", "Cifras de la ENAHO con su error de muestreo y un sello de precisión.",
             [("Saldo migratorio por mil habitantes, en cinco años", fmt(v["net_rate"], "pp").replace(" pp", ""), "informal"), ("Llegaron de otro departamento", fmt(v["mig5_cross"], "%", 2), "informal"), ("Nacidos en otro departamento", fmt(v["life_cross"]), "informal"), ("Razón de ingresos", "s/d" if v["gap_inc_mig"]["v"] is None else f"{v['gap_inc_mig']['v']:.2f}", "formal")], d / f"{r['id']}.png")
    ind_dir = d / "ind"; ind_dir.mkdir(exist_ok=True)
    t = json.load(open(SITE_DATA_DIR / "trends.json"))
    for ind, (name, unit) in INDICATOR_CARDS.items():
        cells = t["series"]["national"][ind]; v = cells[-1].get("v")
        if v is None:
            continue
        val = f"{v:.2f}" if unit == "ratio" else f"{v:.1f} pp" if unit == "pp" else f"{v:.1f}%"
        indicator_card(name, val, f"Perú, ENAHO {t['years'][-1]}", t["years"], [c.get("v") for c in cells], ind_dir / f"{ind}.png")
    return d
