# LinkSnip / Linkora-AI quick-start
# Run from the project root.

Write-Host "1. Starting Redis + TimescaleDB..."
docker compose up -d redis timescaledb

Write-Host "2. Backend setup..."
Set-Location "$PSScriptRoot\backend"
if (-not (Test-Path ".\venv")) {
    py -3.14 -m venv venv
}
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py check
python manage.py setup_timescale

Write-Host "Setup complete. Use separate terminals for Django, worker, redirect stack and frontend."
