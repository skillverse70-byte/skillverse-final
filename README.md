# SkillVerse

This is a full-stack SkillVerse workspace with:

- `backend/` - Django + DRF + MySQL + JWT/session auth + Channels/Celery-ready infrastructure
- `frontend/` - React + Vite application

If you only need the shortest path to run the project locally, follow the steps below in order.

## Windows PowerShell Quick Start

If you want the fastest path on Windows, use this sequence from the project root after MySQL is running:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env

cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# Update backend/.env here if your MySQL password/user/database differ.
python manage.py migrate
python manage.py seed_v1_records
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd frontend; npm install; npm run dev'
python manage.py runserver
```

After that:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/api/docs/swagger/`

Seeded test logins:

- Regular user: `hawibekele4913@gmail.com`
- Organization: `amanuel7245@gmail.com`
- Admin: `skillverse07@gmail.com`
- Password: `StrongPass123!`

## Basic Requirements

- Python 3.12+ recommended
- Node.js 20+ recommended
- MySQL 8+
- `pip`
- `npm`

Optional but useful:

- Redis, if you want production-like background/realtime infrastructure beyond the local in-memory defaults

## Default Local Ports

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- API base: `http://localhost:8000/api/`
- Swagger UI: `http://localhost:8000/api/docs/swagger/`

## 1. Clone Env Files

Backend:

```powershell
Copy-Item backend/.env.example backend/.env
```

Frontend:

```powershell
Copy-Item frontend/.env.example frontend/.env
```

## 2. Create the MySQL Database

Create a MySQL database that matches the backend env file.

Default values from `backend/.env.example`:

- `MYSQL_DATABASE=skillverse`
- `MYSQL_USER=root`
- `MYSQL_PASSWORD=secret`
- `MYSQL_HOST=127.0.0.1`
- `MYSQL_PORT=3306`

Example SQL:

```sql
CREATE DATABASE skillverse CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

If your MySQL username or password is different, update `backend/.env` before running migrations.

## 3. Install Backend Dependencies

From the project root:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 4. Configure Minimum Backend Env

At minimum, verify these values in `backend/.env`:

```env
DJANGO_SETTINGS_MODULE=config.settings.local
DEBUG=True
MYSQL_DATABASE=skillverse
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
FRONTEND_APP_URL=http://localhost:5173
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DJANGO_CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

For basic local boot, the external integrations below can stay empty unless you want to test them:

- `RESEND_API_KEY`
- `CHAPA_SECRET_KEY`
- `OPENROUTER_API_KEY`

If plain HTTP local redirects become awkward, set these in `backend/.env` for local dev:

```env
SECURE_SSL_REDIRECT=False
SECURE_HSTS_SECONDS=0
```

## 5. Run Migrations

From `backend/`:

```powershell
python manage.py migrate
```

## 6. Seed Test Records

The repo includes a seeded V1 data set for testing many workflows.

From `backend/`:

```powershell
python manage.py seed_v1_records
```

Reference data docs:

- [Agents/Versions/v1/MODEL_RELATIONSHIPS.md](./Agents/Versions/v1/MODEL_RELATIONSHIPS.md)
- [Agents/Versions/v1/V1_TEST_RECORDS.md](./Agents/Versions/v1/V1_TEST_RECORDS.md)

Primary seeded accounts:

- Regular user: `hawibekele4913@gmail.com`
- Organization: `amanuel7245@gmail.com`
- Admin: `skillverse07@gmail.com`
- Shared password: `StrongPass123!`

## 7. Run the Backend

From `backend/` with the virtual environment active:

```powershell
python manage.py runserver
```

If port `8000` is already in use:

```powershell
python manage.py runserver 8001
```

If you use port `8001`, update `frontend/.env` so the frontend points to that backend port.

## 8. Install Frontend Dependencies

Open a second terminal from the project root:

```powershell
cd frontend
npm install
```

## 9. Verify Frontend Env

Default local values in `frontend/.env` should look like:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_API_BASE_PATH=/api
VITE_WS_BASE_URL=ws://localhost:8000
```

If your backend runs on another port, change those values to match.

## 10. Run the Frontend

From `frontend/`:

```powershell
npm run dev
```

Then open:

```text
http://localhost:5173
```

## Optional Integrations

These are not required just to boot the app, but some features depend on them:

- Resend: email delivery
- Chapa: payment flows
- OpenRouter: AI/recommendation and adaptive features
- Redis: stronger async/realtime behavior

## Useful Commands

Backend tests:

```powershell
cd backend
python manage.py test
```

Frontend build:

```powershell
cd frontend
npm run build
```

Regenerate the OpenAPI schema:

```powershell
cd backend
python manage.py spectacular --file ..\\schema.yaml
```

Check OpenRouter wiring:

```powershell
cd backend
python manage.py check_openrouter
```

## Where to Look Next

- Root planning/governance: [Agent Tasks.md](./Agent%20Tasks.md), [CONVENTIONS.md](./CONVENTIONS.md), [OWNERSHIP.md](./OWNERSHIP.md)
- Backend package rationale: [backend/BACKEND_SETUP.md](./backend/BACKEND_SETUP.md)
- Frontend package rationale: [frontend/FRONTEND_PRD_READY.md](./frontend/FRONTEND_PRD_READY.md)
- API contract: [schema.yaml](./schema.yaml) and [SCHEMA.md](./SCHEMA.md)

## Short Local Boot Checklist

1. Copy `backend/.env.example` to `backend/.env`
2. Copy `frontend/.env.example` to `frontend/.env`
3. Create MySQL database `skillverse`
4. Install backend dependencies
5. Run `python manage.py migrate`
6. Run `python manage.py seed_v1_records`
7. Start backend with `python manage.py runserver`
8. Install frontend dependencies
9. Start frontend with `npm run dev`
