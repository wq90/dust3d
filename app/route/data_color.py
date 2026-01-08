from flask import Blueprint

bp = Blueprint("data_color", __name__, url_prefix="/data_color")

from netCDF4 import Dataset

import numpy as np

from flask import current_app, request

import matplotlib.pyplot as plt
from matplotlib.colors import Normalize
from matplotlib.cm import ScalarMappable

import numba
from numba import njit


@bp.route("/xyzt", methods=["POST"])
def xyzt():
    params = request.get_json()
    dimension_len = {}
    f = Dataset(datafile(params.get("fn")))
    print(f.dimensions)
    # for i in [x,y,z]:
    #     dimension_len[i] = f.dimensions[i].size
    for key, dim in zip(
        ["xn", "yn", "zn", "tn"],
        [params.get("x"), params.get("y"), params.get("z"), params.get("t")],
    ):
        dimension_len[key] = f.dimensions[dim].size
    f.close()
    return dimension_len


def get_color_scale(color_scheme, min, max):
    norm = Normalize(vmin=min, vmax=max)
    cmap = plt.get_cmap(color_scheme)
    mappable = ScalarMappable(norm=norm, cmap=cmap)
    return mappable


@bp.route("/colors", methods=["POST"])
def colors():
    params = request.get_json()
    color_scheme = params.get("c")
    min = params.get("min")
    max = params.get("max")
    stop = np.linspace(0, 1, 11)
    values = np.linspace(min, max, 11)
    camp = plt.get_cmap(color_scheme)
    color_scale = camp(1-stop)
    rgb_colors = (color_scale[:, :3] * 255).astype(int)
    color_strings = [
        [float(s), float(v), f"rgb({r},{g},{b})"]
        for s, v, (r, g, b) in zip(stop, values, rgb_colors)
    ]
    return color_strings


def to_rgba(value, mappable):
    if value == 0:
        return [0, 0, 0, 0]
    return mappable.to_rgba(value)


def datafile(fname):
    return f"/Users/cuiw0b/Documents/Data/3dredsea/{fname}_hm-KAUST-OCEAN-RSMP-ARG-b_FC01-fv02.00.nc"


# @bp.route("/xy", methods=["POST"])
# def xy_data():
#     params = request.get_json()
#     f = Dataset(datafile(params.get("fn")))
#     var = f.variables[params.get("v")][
#         params.get("t"), 0 : params.get("yn"), params.get("z"), 0 : params.get("xn")
#     ]  # y, z, x : depth, latitude, longitude
#     f.close()
#     var = var.filled(fill_value=0)
#     colors = np.empty(shape=[var.size * 4])
#     color_scale = get_color_scale(params.get("c"), params.get("min"), params.get("max"))
#     i = 0
#     for n in range((params.get("yn") - 1), -1, -1):
#         for m in range(0, params.get("xn"), 1):
#             colors[i : i + 4] = to_rgba(var[n, m], color_scale)
#             i += 4
#     return (colors * 255).astype(int).tolist()


# @bp.route("/zy", methods=["POST"])
# def zy_data():
#     params = request.get_json()
#     f = Dataset(datafile(params.get("fn")))
#     var = f.variables[params.get("v")][
#         params.get("t"), 0 : params.get("yn"), 0 : params.get("zn"), params.get("x")
#     ]  # y, z, x : depth, latitude, longitude
#     f.close()
#     var = var.filled(fill_value=0)
#     colors = np.empty(shape=[var.size * 4])
#     color_scale = get_color_scale(params.get("c"), params.get("min"), params.get("max"))
#     i = 0
#     for n in range((params.get("yn") - 1), -1, -1):
#         for m in range(0, params.get("zn"), 1):
#             colors[i : i + 4] = to_rgba(var[n, m], color_scale)
#             i += 4
#     return (colors * 255).astype(int).tolist()


# @bp.route("/xz", methods=["POST"])
# def xz_data():
#     params = request.get_json()
#     f = Dataset(datafile(params.get("fn")))
#     var = f.variables[params.get("v")][
#         params.get("t"), params.get("y"), 0 : params.get("zn"), 0 : params.get("xn")
#     ]  # y, z, x : depth, latitude, longitude
#     f.close()
#     color_scale = get_color_scale(
#         params.get("c"), params.get("min"), params.get("max")
#     )
#     var = var.filled(fill_value=0)
#     print(var.size)
#     # colors = cmap(var)
#     # print(colors.shape)
#     colors = np.empty(shape=[var.size * 4])
#     i = 0
#     for n in range(0, params.get("zn"), 1):
#         for m in range(0, params.get("xn"), 1):
#             colors[i : i + 4] = to_rgba(var[n, m], color_scale)
#             i += 4
#     return (colors * 255).astype(int).tolist()

