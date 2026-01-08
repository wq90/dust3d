gunicorn -c gunicorn.conf.py wsgi:app

export PIPENV_VENV_IN_PROJECT=1

pipenv requirements > requirements.txt

python -m venv venv
source venv/bin/activate
pip install -r requirements.txt