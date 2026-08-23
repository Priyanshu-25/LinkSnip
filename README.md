# LinkSnip / Linkora-AI — Clean Ready-to-Run Project

This package is a cleaned version of the uploaded project. It keeps the existing architecture and fixes the main issues found in the uploaded copy:

- OTP registration and password reset use Brevo HTTPS API instead of Gmail SMTP.
- Email verification/resend/reset routes are wired consistently.
- Django has a `/health/` endpoint.
- Redirect service captures request headers and queues click analytics asynchronously.
- IP geolocation defaults to `https://ipapi.co/{ip}/json/` and fails gracefully.
- Destination URLs accept only HTTP/HTTPS and reject localhost/private/loopback IP destinations.
- `backend/requirements.txt` is saved as normal UTF-8 (the uploaded file was UTF-16LE and would break Docker/pip installs).
- Secrets are intentionally excluded from this package; use the provided `.env.example` files.

## Windows local run

### 1. Start PostgreSQL

Use the PostgreSQL instance used by your project and create `linkora_db`.

### 2. Start Redis and TimescaleDB

From the project root:

```powershell
docker compose up -d redis timescaledb
```

### 3. Configure backend

```powershell
cd backend
Copy-Item .env.example .env
```

Edit `backend/.env` and set:

- `DB_PASSWORD`
- `DJANGO_SECRET_KEY`
- `BREVO_API_KEY`
- `EMAIL_HOST_USER`
- matching `DATABASE_URL` and `TIMESCALE_DATABASE_URL` passwords

### 4. Create Python environment

```powershell
py -3.14 -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 5. Prepare database

```powershell
python manage.py migrate
python manage.py check
python manage.py setup_timescale
```

### 6. Start Django

Terminal 1:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python manage.py runserver 127.0.0.1:8000
```

Health:

`http://127.0.0.1:8000/health/`

### 7. Start the click worker

Terminal 2:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python manage.py process_click_queue
```

### 8. Start redirect replicas + nginx

Terminal 3 / project root:

```powershell
docker compose up -d redirect-1 redirect-2 redirect-3 nginx
```

Redirect load balancer:

`http://127.0.0.1:8080/`

A direct redirect service is also available on ports 8001–8003.

### 9. Start frontend

Terminal 4:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open:

`http://localhost:5173/`

## Authentication flow

1. Register with an email you control.
2. Brevo sends a 6-digit verification OTP.
3. Verify the OTP.
4. Sign in with the verified account.
5. Forgot password sends another OTP through Brevo.
6. Reset the password and sign in again.

## Important security note

Do not commit real API keys, database passwords, or Django secret keys. The uploaded project contained live credentials; rotate those credentials before using this cleaned package publicly.

## Public deployment

For production you must replace localhost URLs and credentials with the actual service URLs for:

- PostgreSQL
- Redis
- TimescaleDB
- Django API
- Frontend
- redirect service

The application code is prepared for environment-based configuration, but a public deployment still requires those external services to exist and be configured.

## PRD limitation

The current cleaned package adds strong local destination validation, but it does not claim guaranteed phishing/malware detection. Add a threat-intelligence provider before claiming the full safe-browsing requirement in the PRD.
