#!/usr/bin/env bash
set -e

python manage.py migrate

python manage.py collectstatic --noinput

python manage.py process_click_queue &
WORKER_PID=$!

trap 'kill $WORKER_PID 2>/dev/null || true' EXIT

gunicorn config.wsgi:application \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers 2 \
    --timeout 120