from flask import Blueprint

bp = Blueprint("data", __name__, url_prefix="/data")

from netCDF4 import Dataset, num2date

from flask import request, Response, current_app

from .service import utils

import numpy as np

import io

import json


# @bp.route("/xy", methods=["POST"])
# def xy_slice_rgba_texture():
#     p = request.get_json()
#     f = Dataset(utils.datafile(p.get("foldern"), p.get("fn")))
#     v = f.variables[p.get("v")][
#         p.get("t"), 0 : p.get("yn"), p.get("z"), 0 : p.get("xn")
#     ]  # y, z, x : depth, latitude, longitude
#     f.close()
#     print(p)
#     print(v.shape)
#     v = v.filled(fill_value=0)
#     colors = utils.data_slice_to_rgba_texture(v, p.get("min"), p.get("max"), True)
#     return Response(colors.tobytes(), mimetype="application/octet-stream")


# @bp.route("/zy", methods=["POST"])
# def zy_slice_rgba_texture():
#     p = request.get_json()
#     f = Dataset(utils.datafile(p.get("foldern"), p.get("fn")))
#     v = f.variables[p.get("v")][
#         p.get("t"), 0 : p.get("yn"), 0 : p.get("zn"), p.get("x")
#     ]  # y, z, x : depth, latitude, longitude
#     f.close()
#     v = v.filled(fill_value=0)
#     colors = utils.data_slice_to_rgba_texture(v, p.get("min"), p.get("max"), True)
#     return Response(colors.tobytes(), mimetype="application/octet-stream")


# @bp.route("/xz", methods=["POST"])
# def xz_slice_rgba_texture():
#     p = request.get_json()
#     f = Dataset(utils.datafile(p.get("foldern"), p.get("fn")))
#     v = f.variables[p.get("v")][
#         p.get("t"), p.get("y"), 0 : p.get("zn"), 0 : p.get("xn")
#     ]  # y, z, x : depth, latitude, longitude
#     f.close()
#     v = v.filled(fill_value=0)
#     colors = utils.data_slice_to_rgba_texture(v, p.get("min"), p.get("max"))
#     return Response(colors.tobytes(), mimetype="application/octet-stream")


@bp.route("/dust", methods=["POST"])
def dust_flat_red_texture():
    params = request.get_json()
    print(params)
    # f = Dataset(utils.datafile(p.get("foldern"), p.get("fn")))
    # f = Dataset(params.get("path"))
    # print(params.get("path"))
    f = Dataset(f"{current_app.root_path}/data/dust_{params.get("task")}.nc")
    v = f.variables["DUST"][
        params.get("time"),
        :,
        :,
        :,
    ]
    f.close()
    v_transposed = np.transpose(v, (1, 0, 2))
    v_texture = v_transposed.ravel().astype(np.float16)
    return Response(v_texture.tobytes(), mimetype="application/octet-stream")

    # print(f"min={v.min()} max={v.max()}")
    # if params.get("v") == "uvel" or params.get("v") == "vvel" or params.get("v") == "wvel":
    #     v += 5
    # print(f"min={v.min()} max={v.max()}")
    # v = v.filled(fill_value=0)
    # # v = v.astype(np.float16)
    # data = utils.flat_data_to_3dtexture(v, p.get("yn"), p.get("zn"), p.get("xn"))
    # data = data.astype(np.float16)
    # # data = np.load(utils.datafilenpy(p.get("fn"), p.get("v"), p.get("t")), mmap_mode="r")
    # return Response(data.tobytes(), mimetype="application/octet-stream")


@bp.route("/dust_dimensions", methods=["GET"])
def dust_dimensions():
    # params = request.get_json()
    # f = Dataset(utils.datafile(params.get("folder"), params.get("date")))
    # f = Dataset(params.get("path"))
    # print(f"{current_app.root_path}/data/20250911_hm-KAUST-OCEAN-RSMP-ARG-b20250910_FC01-fv02.00.nc")
    f = Dataset(f"{current_app.root_path}/data/dust_0.nc")
    # print(f.variables)
    print(f.variables["time"])
    print(f.variables["time"].units)
    print(f.variables["time"][:])
    dimensions = []
    for dim in ["lev_2", "lat", "lon", "time"]:
        var_data = f.variables[dim][:]
        if dim == "time":
            time = num2date(
                var_data[:], f.variables["time"].units, only_use_cftime_datetimes=False
            )
            var_data = np.array([str(t) for t in time])
        dimensions.append(var_data.tolist())
    return dimensions


@bp.route("/wind", methods=["POST"])
def uvw_value():
    p = request.get_json()
    print(p)
    f = Dataset(utils.datafile(p.get("foldern"), p.get("fn")))
    v = f.variables[p.get("v")][
        p.get("t"),
        0 : p.get("yn"),
        0 : p.get("zn"),
        0 : p.get("xn"),
    ]
    f.close()
    v = v.filled(fill_value=0)
    return v.tolist()


@bp.route("/u")
def u():
    f = Dataset(utils.datafile("20221115"))
    u = f.variables["uvel"][
        0,
        ::-1,  # z
        ::-1,  # y
        :,  # x
    ]
    f.close()
    u = u.filled(fill_value=0)
    x = u[u != 0]
    print(np.min(x))
    print(np.max(x))
    u = np.transpose(u, (1, 2, 0)).tolist()
    return u


@bp.route("/v")
def v():
    f = Dataset(utils.datafile("20221115"))
    v = f.variables["vvel"][
        0,
        ::-1,  # z
        ::-1,  # y
        :,  # x
    ]
    f.close()
    v = v.filled(fill_value=0)
    x = v[v != 0]
    print(np.min(x))
    print(np.max(x))
    v = np.transpose(v, (1, 2, 0)).tolist()
    return v


@bp.route("/w")
def w():
    f = Dataset(utils.datafile("20221115"))
    w = f.variables["wvel"][
        0,
        ::-1,  # z
        ::-1,  # y
        :,  # x
    ]
    f.close()
    w = w.filled(fill_value=0)
    x = w[w != 0]
    print(np.min(x))
    print(np.max(x))
    w = np.transpose(w, (1, 2, 0)).tolist()
    return w


# @bp.route("/coo")
# def coordinates():
#     # dustfile_old = "tot_Dust_gocart_old.nc"
#     # f = Dataset(f"{current_app.root_path}/data/0/{dustfile_old}")
#     f = Dataset(utils.datafile("20221115"))
#     x = f.variables["longitude"][:]
#     y = f.variables["latitude"][:]
#     # print(y)
#     z = f.variables["depth"][:]
#     f.close()
#     return [x.tolist(), y.tolist(), z.tolist()]


# @bp.route("/xyzt", methods=["POST"])
# def xyzt_flat_red_texture():
#     p = request.get_json()
#     # data = np.load(utils.datafilenpy(p.get("fn"), p.get("v"), p.get("t")), mmap_mode="r")
#     data = np.load("xyz.npy")
#     buffer = io.BytesIO()
#     # np.save(buffer, data)  # Save in compressed .npy format
#     np.savez_compressed(buffer, data=data)
#     buffer.seek(0)
#     return Response(buffer.getvalue(), mimetype="application/octet-stream")
#     # return Response(data.tobytes(), mimetype="application/octet-stream")
#     # return Response(buf.read(), mimetype='application/octet-stream')
#     # return data.tolist()
