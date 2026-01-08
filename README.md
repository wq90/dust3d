gunicorn -c gunicorn.conf.py wsgi:app

export PIPENV_VENV_IN_PROJECT=1

pipenv requirements > requirements.txt

python -m venv venv
source venv/bin/activate
pip install -r requirements.txt


sudo mkdir -p /var/log/aramco-dashboard-3d-ap
sudo chown cuiw0b:g-cuiw0b /var/log/aramco-dashboard-3d-ap
sudo chmod 750 /var/log/aramco-dashboard-3d-ap

sudo nano /etc/systemd/system/aramco-dashboard-3d-ap.service

sudo systemctl daemon-reload
sudo systemctl enable aramco-dashboard-3d-ap
sudo systemctl start aramco-dashboard-3d-ap
sudo systemctl status aramco-dashboard-3d-ap

sudo systemctl stop aramco-dashboard-3d-ap
sudo systemctl disable aramco-dashboard-3d-ap

sudo rm /etc/systemd/system/aramco-dashboard-3d-ap.service

sudo systemctl daemon-reload
sudo systemctl reset-failed

sudo nano /etc/logrotate.d/aramco-dashboard-3d-ap

/var/log/aramco-dashboard-3d-ap/gunicorn*.log {
    daily                  # rotate logs daily
    rotate 14              # keep 14 days of logs
    compress               # gzip old logs
    delaycompress          # compress only logs older than 1 day
    missingok              # ignore if logs are missing
    notifempty             # skip if log file is empty
    dateext                # add date to rotated logs, e.g. gunicorn.out.log-20250914.gz
    create 640 cuiw0b g-cuiw0b   # new logs owned by user cuiw0b and group www-data
    sharedscripts
    postrotate
        # Tell systemd to reload logs (send HUP to Gunicorn master process)
        systemctl kill -s HUP aramco-dashboard-3d-ap.service >/dev/null 2>&1 || true
    endscript
}