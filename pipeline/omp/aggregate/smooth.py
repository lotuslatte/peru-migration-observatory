"""Media móvil centrada de 3 años sobre celdas; SE combinada (muestras anuales independientes)."""
import math


def smooth_cells(cells: list[dict]) -> list[dict]:
    out = []
    n = len(cells)
    for i in range(n):
        idx = [j for j in (i - 1, i, i + 1) if 0 <= j < n and cells[j].get("v") is not None]
        if len(idx) < 2 or cells[i].get("v") is None:
            out.append({"v": None, "g": "S", "n": 0}); continue
        v = sum(cells[j]["v"] for j in idx) / len(idx)
        se = math.sqrt(sum((cells[j].get("se") or 0) ** 2 for j in idx)) / len(idx)
        out.append({"v": round(v, 2), "se": round(se, 3), "lo": round(v - 1.96 * se, 2), "hi": round(v + 1.96 * se, 2), "g": "A" if all(cells[j]["g"] == "A" for j in idx) else "B", "n": sum(cells[j]["n"] for j in idx)})
    return out


def add_smooth(series_obj: dict) -> dict:
    """Recorre {dom: {ind: [cells] | {key: [cells]}}} y añade series_obj['smooth'] con la misma estructura."""
    def walk(x):
        if isinstance(x, list) and x and isinstance(x[0], dict) and "g" in x[0]:
            return smooth_cells(x)
        if isinstance(x, dict):
            return {k: walk(v) for k, v in x.items()}
        return x
    return walk(series_obj)
