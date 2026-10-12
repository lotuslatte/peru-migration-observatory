import math
from .common import *
from .common import _r

def fmt(v, unit):
    if v is None: return "—"
    if unit == "S/": return f"S/ {v:,.0f}".replace(",", " ")
    if unit == "‰": return f"{v:+.1f} por mil"
    return f"{v:.1f} %"


def profile_summary(est, p) -> list[str]:
    s = []; name = p["name"]; f = p.get("flows"); m = p["mobility"]; d = p["dims"]
    if f and d["net_rate"]["v"] is not None:
        net = d["net_rate"]["v"]
        s.append(f"{name} {'recibe más población de la que pierde' if net > 0 else 'pierde más población de la que recibe'}: saldo migratorio de {fmt(net, '‰')} habitantes en cinco años ({'significativo' if d['net_rate']['g'] == 'A' else 'estimación imprecisa'}): llegaron unas {f['inm']:,.0f} personas de otros departamentos y salieron unas {f['emi']:,.0f}.".replace(",", " "))
    if p.get("od") and p["od"]["top_origins"]:
        o = p["od"]["top_origins"][:3]; dd = p["od"]["top_destinations"][:3]
        s.append("Los principales orígenes de quienes llegan son " + ", ".join(f"{x['name']} (~{x['flow']:,} al año)".replace(",", " ") for x in o) + (("; quienes se van eligen sobre todo " + ", ".join(x["name"] for x in dd) + ".") if dd else "."))
    if m["life_cross"]["v"] is not None:
        s.append(f"{m['life_cross']['v']:.1f} % de sus residentes nació en otro departamento y {m['native_here']['v']:.1f} % nació aquí mismo" + (f"; {m['life_abroad']['v']:.1f} % nació en el extranjero." if m['life_abroad']['v'] is not None else "."))
    lm = p.get("labour_mig", {})
    if lm and lm["informality"]["2"]["v"] is not None and lm["informality"]["1"]["v"] is not None:
        g = d["gap_inf_mig"]
        s.append(f"Los migrantes recientes tienen {lm['informality']['2']['v']:.1f} % de empleo informal frente a {lm['informality']['1']['v']:.1f} % de los residentes de siempre" + (f" (brecha {'significativa' if g['g'] == 'A' else 'no concluyente'})" if g["v"] is not None else "") + f", y un ingreso mediano de S/ {lm['median_inc_real']['2']['v']:,.0f} contra S/ {lm['median_inc_real']['1']['v']:,.0f}.".replace(",", " ") if lm['median_inc_real']['2']['v'] is not None and lm['median_inc_real']['1']['v'] is not None else ".")
    oo = p.get("origin_outcomes", {})
    if oo and oo.get("informality", {}).get("v") is not None:
        s.append(f"Quienes salieron de {name} hacia otros departamentos trabajan con {oo['informality']['v']:.1f} % de informalidad y un ingreso mediano de S/ {oo['median_inc_real']['v']:,.0f} en su destino.".replace(",", " ") if oo['median_inc_real']['v'] is not None else "")
    t = p["trend"]["mig5_cross"]
    if t and t[0]["v"] is not None and t[-1]["v"] is not None:
        s.append(f"La tasa de inmigración reciente pasó de {t[0]['v']:.1f} % en 2014 a {t[-1]['v']:.1f} % en 2024.")
    return [x for x in s if x]
