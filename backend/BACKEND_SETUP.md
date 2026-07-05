# SkillVerse Backend Setup

This document records the backend foundation scaffolded from `PRD.md` and `Agent Tasks.md`.

## What was scaffolded

- Django project root in `backend/`
- Environment-driven settings package under `config/settings/`
- MySQL database configuration
- Django REST Framework enabled for API delivery
- Session-based authentication baseline for web-first V1 flows
- JWT authentication endpoints for API clients
- OpenAPI schema generation plus Swagger and ReDoc docs endpoints
- CORS support for the separate React frontend
- Celery and Redis configuration for background jobs
- Channels and Redis channel-layer support for future realtime chat/session flows
- `.env.example` with local defaults
- `requirements.txt` pinned to the package versions verified during setup

## Packages chosen and why

### `Django==6.0.6`

Chosen as the current stable Django release at setup time. The PRD calls for a modular web application with strong auth, admin, ORM-backed domain modeling, and long-term maintainability.

### `djangorestframework==3.17.1`

Chosen because `Agent Tasks.md` explicitly sets `Django + Django REST Framework` as the backend direction. The product needs a clean API surface for the React frontend and role-aware server-side enforcement.

### `djangorestframework-simplejwt==5.5.1`

Chosen because you explicitly approved JWT support. This adds lightweight token-based API auth without replacing the session-based V1 web auth baseline.

### `drf-spectacular==0.29.0`

Chosen because you explicitly approved API docs and this is the current mainstream OpenAPI package for DRF. It adds schema generation plus Swagger/ReDoc UIs for backend development and integration work.

### `django-environ==0.14.0`

Chosen to keep secrets and environment-specific configuration out of source control. This directly supports the PRD's security, deployment, and maintainability requirements.

### `django-cors-headers==4.9.0`

Chosen because the repo already separates `frontend/` and `backend/`, so cross-origin browser requests are expected during development and likely in deployment topologies.

### `mysqlclient==2.2.8`

Chosen to satisfy your explicit MySQL requirement. It is the database driver used by Django's MySQL backend configuration in this scaffold.

### `celery==5.6.3`

Chosen because the PRD and build notes imply background work for email verification, essential notifications, payment reconciliation, and later certificate generation.

### `redis==8.0.1`

Chosen as the broker/backend dependency for Celery and as the shared infrastructure primitive already recommended in `Agent Tasks.md` for async/realtime workloads.

### `channels==4.3.2`

Chosen because V1 explicitly includes in-platform chat, realtime coordination, and session planning. The PRD also notes realtime features may be introduced progressively, so wiring ASGI support now avoids a structural retrofit later.

### `channels-redis==4.3.0`

Chosen to back Django Channels with Redis when realtime messaging is enabled beyond local development.

## Authentication decision

This scaffold supports both Django sessions and JWT for DRF.

Reason:

- `Agent Tasks.md` explicitly says to prefer cookie/session-based auth for the web app in V1.
- You explicitly approved adding JWT support for API use.
- The resulting setup keeps session auth as the web-first default while also exposing JWT endpoints for API consumers.

JWT endpoints:

- `POST /api/auth/jwt/token/`
- `POST /api/auth/jwt/refresh/`

## API docs endpoints

- `GET /api/schema/`
- `GET /api/docs/swagger/`
- `GET /api/docs/redoc/`

## Packages intentionally not added yet

No further infrastructure packages were added beyond JWT and API docs.

I intentionally did not add extras such as filtering, caching, task scheduling add-ons, or richer auth/account packages yet.

## Settings layout

- `config/settings/base.py`: shared settings
- `config/settings/local.py`: local/dev defaults
- `config/settings/production.py`: production security defaults

## Shared backend domain vocabulary

Canonical backend-side domain contracts and workflow enums now live in:

- `apps/common/contracts.py`
- `apps/common/enums.py`
- `apps/common/trust.py`

Future domain apps should import these shared definitions instead of hardcoding role, trust-state, or lifecycle status strings.

## Runtime entrypoints

- `manage.py`, `config/asgi.py`, `config/wsgi.py`, and `config/celery.py` default to `config.settings.local`
- If `DJANGO_SETTINGS_MODULE` is already set, they honor that value instead of forcing local settings
- `config/settings/__init__.py` is intentionally non-executing so `config.settings.production` does not accidentally inherit `local` settings

## Assumptions made

- Your request overrides the PostgreSQL recommendation in `Agent Tasks.md`, so the scaffold is MySQL-first.
- Realtime foundations are justified now because chat/session coordination is part of V1, but no websocket consumer or chat app has been created yet.
- Background-task foundations are justified now because email and notification flows are explicit in V1, while payment follow-up is explicit in the build notes.
- Local development defaults to an in-memory channel layer unless you switch `CHANNEL_LAYER_BACKEND` to Redis in `.env`.
- No feature/domain apps were created yet, per your instruction.
- `drf-spectacular` 0.29.0 installed and passed project checks in this Django 6 scaffold, but its PyPI requirements text still lists support through Django 5.2, so that compatibility is a verified local integration result rather than an explicit upstream support claim.
