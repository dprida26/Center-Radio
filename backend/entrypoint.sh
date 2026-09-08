#!/bin/sh
set -e

python manage.py migrate --noinput
python manage.py seed_if_empty
python manage.py collectstatic --noinput

exec gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 4 --timeout 120 tienda.wsgi:application
