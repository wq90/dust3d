from flask import Blueprint

bp = Blueprint("config", __name__, url_prefix="/config")

from netCDF4 import Dataset

import numpy as np

from flask import request, Response, current_app

from .service import utils





@bp.route("/legend", methods=["POST"])
def legend():
    p = request.get_json()
    print(p)
    return utils.colorCanvas(p.get("min"), p.get("max"), p.get("v"))


@bp.route("/colortable")
def color_table_texture():
    return Response(utils.colortable().tobytes(), mimetype="application/octet-stream")