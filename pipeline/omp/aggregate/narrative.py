"""Profile summaries written from the estimates. Numbers follow the site format (kit/charts/lib/format.ts):
decimal point, comma for thousands, no space before the percent sign."""
from .common import *
from .common import _r


def pct(v): return f"{v:.1f}%"
def soles(v): return f"S/{v:,.0f}"
def per_mil(v): return f"{v:+.1f} por mil"


def excludes_zero(c) -> bool:
    """True when the 95% interval of a difference leaves zero out."""
    return c.get("lo") is not None and c.get("hi") is not None and (c["lo"] > 0 or c["hi"] < 0)


def profile_summary(est, p) -> list[str]:
    s = []; name = p["name"]; f = p.get("flows"); m = p["mobility"]; d = p["dims"]
    if f and d["net_rate"]["v"] is not None:
        net = d["net_rate"]["v"]
        s.append(f"{name} {'recibe más población de la que pierde' if net > 0 else 'pierde más población de la que recibe'}: saldo migratorio de {per_mil(net)} habitantes en cinco años ({'significativo' if excludes_zero(d['net_rate']) else 'el intervalo incluye el cero'}): llegaron unas {f['inm']:,.0f} personas de otros departamentos y salieron unas {f['emi']:,.0f}.")
    if p.get("od") and p["od"]["top_origins"]:
        o = p["od"]["top_origins"][:3]; dd = p["od"]["top_destinations"][:3]
        s.append("Los principales orígenes de quienes llegan son " + ", ".join(f"{x['name']} (~{x['flow']:,} al año)" for x in o) + (("; quienes se van eligen sobre todo " + ", ".join(x["name"] for x in dd) + ".") if dd else "."))
    if m["life_cross"]["v"] is not None and m["native_here"]["v"] is not None:
        s.append(f"{pct(m['life_cross']['v'])} de sus residentes nació en otro departamento y {pct(m['native_here']['v'])} nació aquí mismo" + (f"; {pct(m['life_abroad']['v'])} nació en el extranjero." if m['life_abroad']['v'] is not None else "."))
    lm = p.get("labour_mig", {})
    if lm and lm["informality"]["2"]["v"] is not None and lm["informality"]["1"]["v"] is not None:
        g = d["gap_inf_mig"]
        t = f"Los migrantes recientes tienen {pct(lm['informality']['2']['v'])} de empleo informal frente a {pct(lm['informality']['1']['v'])} de los residentes de siempre"
        if g["v"] is not None:
            t += f" (brecha {'significativa' if excludes_zero(g) else 'no concluyente'})"
        a, b = lm["median_inc_real"]["2"]["v"], lm["median_inc_real"]["1"]["v"]
        t += f", y un ingreso mediano de {soles(a)} contra {soles(b)}." if a is not None and b is not None else "."
        s.append(t)
    oo = p.get("origin_outcomes", {})
    if oo and oo.get("informality", {}).get("v") is not None and oo["median_inc_real"]["v"] is not None:
        s.append(f"Quienes salieron de {name} hacia otros departamentos trabajan con {pct(oo['informality']['v'])} de informalidad y un ingreso mediano de {soles(oo['median_inc_real']['v'])} en su destino.")
    t = p["trend"]["mig5_cross"]
    if t and t[0]["v"] is not None and t[-1]["v"] is not None:
        s.append(f"La tasa de inmigración reciente pasó de {pct(t[0]['v'])} en {YEARS[0]} a {pct(t[-1]['v'])} en {HEADLINE_YEAR}.")
    return [x for x in s if x]
