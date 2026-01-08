import numpy as np

from numba import njit, prange

from datetime import datetime, date, timedelta

from flask import current_app


@njit
def flat_data_to_3dtexture(data, depth, latitude, longitude):
    index = 0
    data_flat = np.empty(depth * latitude * longitude, dtype=np.float32)
    for x in prange(longitude):
        for y in prange(depth - 1, -1, -1):
            for z in prange(latitude):
                data_flat[index] = data[y][z][x]
                index += 1
    return data_flat


@njit
def normalize(data, vmin, vmax):
    if data > vmax:
        return 1.0
    if data < vmin:
        return 0.0
    return (data - vmin) / (vmax - vmin)


@njit
def normalize_to_255(value, min_val, max_val):
    if value >= max_val:
        return 255
    if value <= min_val:
        return 0
    normalized = (value - min_val) / (max_val - min_val)
    return int(normalized * 255)


colors = np.array(
    [
        [1.0, 0.0, 0.0],  # Red
        [1.0, 0.5, 0.0],  # Orange
        [1.0, 1.0, 0.0],  # Yellow
        [0.5, 1.0, 0.0],  # Light Green
        [0.0, 1.0, 0.0],  # Green
        [0.0, 1.0, 0.5],  # Cyan-Green
        [0.0, 1.0, 1.0],  # Cyan
        [0.0, 0.0, 1.0],  # Blue
        [0.5, 0.0, 1.0],  # Violet
        [1.0, 0.0, 1.0],  # Magenta
    ]
)
num_colors = len(colors) - 1


@njit
def colormapping(v):
    if v > 1:
        v = 1.0
    v = 1 - v
    index = int(v * num_colors)
    t = (v * num_colors) - index
    c1 = colors[index]
    c2 = colors[min(index + 1, num_colors)]
    rgb = c1 + (c2 - c1) * t
    return rgb[0], rgb[1], rgb[2]


@njit
def colortable():
    v = np.linspace(0, 1, 256)
    c = np.empty(256 * 4, dtype=np.uint8)
    index = 0
    for i in v:
        r, g, b = colormapping(i)
        c[index] = int(r * 255)
        c[index + 1] = int(g * 255)
        c[index + 2] = int(b * 255)
        c[index + 3] = 255
        index += 4
    return c


def colorCanvas(min, max, var):
    stop = np.linspace(0, 1, 10)
    values = np.linspace(min, max, 10)
    color_strings = [[] for i in range(10)]
    i = 0
    for s, v in zip(stop, values):
        f = f"{v:.1f}"
        if var == "wvel":
            f = f"{v:.4f}"
        r, g, b = colormapping(1 - s)
        color_strings[i] = [
            float(s),
            f,
            f"rgb({int(r * 255)},{int(g * 255)},{int(b * 255)})",
        ]
        i += 1
    return color_strings


def datafile(foldern, fname):
    # return f"{current_app.root_path}/data/20250911_hm-KAUST-OCEAN-RSMP-ARG-b20250910_FC01-fv02.00.nc"
    # folder = (date.today() - timedelta(days=1)).strftime("%Y%m%d")
    # folder = foldern.strftime("%Y%m%d")
    prev = (datetime.strptime(fname, "%Y%m%d") - timedelta(days=1)).strftime("%Y%m%d")
    print(f"/iap/data_repo/forecasts/regions/rsea/ocean/mitgcm_multiples/{foldern}12/{fname}_hm-KAUST-OCEAN-RSMP-ARG-b{prev}_FC01-fv02.00.nc")
    return f"/iap/data_repo/forecasts/regions/rsea/ocean/mitgcm_multiples/{foldern}12/{fname}_hm-KAUST-OCEAN-RSMP-ARG-b{prev}_FC01-fv02.00.nc"


def datafilenpy(fname, v, t):
    return f"{current_app.root_path}/data/{fname}_{v}_{t}.npy"
    # return f"/Users/cuiw0b/Documents/Data/3dredsea/{fname}_hm-KAUST-OCEAN-RSMP-ARG-b_FC01-fv02.00.nc"


@njit
def data_slice_to_rgba_texture(data, min, max, r=False):
    col, row = data.shape
    rgba = np.empty((col * row * 4), dtype=np.uint8)
    i = 0
    r_range = prange(row)
    c_range = prange(col)
    if r:
        c_range = prange(col - 1, -1, -1)
    for c in c_range:
        for r in r_range:
            v = data[c, r]
            if v == 0:
                rgba[i : i + 4] = 0, 0, 0, 0
            else:
                nv = normalize(v, min, max)
                r, g, b = colormapping(nv)
                rgba[i] = int(r * 255)
                rgba[i + 1] = int(g * 255)
                rgba[i + 2] = int(b * 255)
                rgba[i + 3] = 255
            i += 4
    return rgba
