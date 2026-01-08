from fileinput import filename
import os

from flask import Flask, render_template, send_from_directory

from .route import data_bp

from flask_compress import Compress

# from .route import data_color


def create_app(test_config=None):
    # create and configure the app
    app = Flask(
        __name__,
        instance_relative_config=True,
        # static_folder="static",
        # static_url_path="/static",
    )
    app.config["COMPRESS_MIMETYPES"] = [
        "text/html",
        "text/css",
        "text/xml",
        "application/json",
        "application/javascript",
        "application/octet-stream",
    ]
    # app.config['COMPRESS_LEVEL'] = 1;
    Compress(app)
    app.config.from_mapping(
        SECRET_KEY="dev",
        DATABASE=os.path.join(app.instance_path, "flaskr.sqlite"),
    )

    # print("CWD:", os.getcwd())
    # print("APP ROOT:", app.root_path)
    # print("STATIC FOLDER:", app.static_folder)

    # shader_path = os.path.join(
    #     app.root_path, "static", "js", "dustVertexShader.glsl"
    # )

    # print(os.path.exists(shader_path))

    # js_path = os.path.join(
    #     app.root_path, "static", "js", "Common.js"
    # )

    # print(os.path.exists(js_path))

    if test_config is None:
        # load the instance config, if it exists, when not testing
        app.config.from_pyfile("config.py", silent=True)
    else:
        # load the test config if passed in
        app.config.from_mapping(test_config)

    # ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    @app.route("/")
    def index():
        return render_template("3d.html")

    # @app.route("/static/js/<path:filename>")
    # def static_files(filename):
    #     return send_from_directory(app.static_folder, filename)
    
    # @app.route("/static/js/<path:filename>")
    # def serve_js(filename):
    #     return send_from_directory("static/js", filename)

    from .route import config_bp, data_bp, data_color

    app.register_blueprint(config_bp.bp)
    app.register_blueprint(data_bp.bp)

    app.register_blueprint(data_color.bp)

    return app
