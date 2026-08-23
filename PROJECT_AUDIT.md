# LinkSnip / Linkora-AI audit

## What was verified
- Python source files compile with `compileall`.
- Frontend package metadata and source tree were inspected.
- Email service uses Brevo HTTPS API.
- Registration, verification, resend, login, forgot-password and reset-password routes are present.
- JWT refresh route is present.
- Redis cache is configured.
- TimescaleDB schema/worker code is present.
- Redirect service exposes `/health` and short-code routes.
- NGINX reverse-proxy/load-balancer configuration is present.

## Changes made in this clean package
- Removed the checked-in Python virtual environment from the deliverable.
- Removed local SQLite database from the deliverable.
- Removed frontend build output from the deliverable so it cannot mask source changes.
- Normalized `backend/requirements.txt` to UTF-8. The uploaded requirements file was UTF-16LE and was not suitable for normal Docker/pip use.
- Added an environment template instead of copying live credentials.
- Made IP geolocation default to `https://ipapi.co/{ip}/json/` and fail safely when unavailable.
- Added conservative HTTP/HTTPS and private-destination validation to link creation.
- Updated the FastAPI redirect route to receive request headers and enqueue click analytics asynchronously.
- Added Django `/health/` endpoint.
- Added local Docker Compose support for Redis, TimescaleDB, three redirect replicas and NGINX.
- Added Windows setup/run documentation.

## Important remaining deployment prerequisites
1. Put real secrets into `backend/.env` based on `.env.example`.
2. Rotate the Brevo key and database password that were previously pasted into chat/uploaded files.
3. Use real production URLs for frontend/backend/redirect/Redis/PostgreSQL/TimescaleDB when deploying publicly.
4. The PRD's full malware/phishing safe-browsing requirement is not claimed complete. The clean package only performs conservative local URL validation until a threat-intelligence provider is configured.
5. A full production deployment still needs the chosen hosting provider's database/Redis/TimescaleDB resources and DNS/TLS configuration.

## Validation limitation
The backend source was statically compiled in this environment. Full Django runtime checks and a production frontend build could not be completed here because the container does not have the project's Python environment and frontend dependency installation timed out. The package is therefore a cleaned, source-level ready project, not a claim that every external service is live from inside this environment.
