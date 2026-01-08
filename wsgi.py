from app import create_app

app = create_app()

# gunicorn -c gunicorn.conf.py wsgi:app
# flask run --debug --host=0.0.0.0
# export PIPENV_VENV_IN_PROJECT=1