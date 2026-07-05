# Ownership

This file is the location map for all implementation work.
Read together with:

- [CONVENTIONS.md](./CONVENTIONS.md)
- [schema.yaml](./schema.yaml)
- [SCHEMA.md](./SCHEMA.md)
- [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md)
- [BLOCKERS.md](./BLOCKERS.md)
- [backend/BACKEND_SETUP.md](./backend/BACKEND_SETUP.md)
- [frontend/FRONTEND_PRD_READY.md](./frontend/FRONTEND_PRD_READY.md)

Equivalent refactor-summary source used:

- No standalone componentization summary file was found.
- Structural frontend decisions here are based on [frontend/README.md](./frontend/README.md) plus the current `frontend/src` feature-based layout and app bootstrap files.

## Runtime Map

- Frontend app: `http://localhost:5173`
- Backend app: `http://localhost:8000`
- Backend HTTP API base: `http://localhost:8000/api/`
- Backend websocket base: `ws://localhost:8000/ws/`
- Swagger UI: `http://localhost:8000/api/docs/swagger/`
- ReDoc UI: `http://localhost:8000/api/docs/redoc/`
- MySQL default local port: `3306`
- Redis default local port: `6379`

How they talk:

- Frontend calls backend HTTP endpoints under `/api/*`
- Frontend realtime features connect to backend websocket channels under `/ws/*`
- Endpoint shapes, auth requirements, and request/response formats come from [schema.yaml](./schema.yaml)

## Backend Ownership

Root:

- `backend/manage.py`
- `backend/requirements.txt`
- `backend/.env.example`
- `backend/config/`
- `backend/apps/`

Settings and platform wiring:

- `backend/config/settings/`
- `backend/config/urls.py`
- `backend/config/asgi.py`
- `backend/config/wsgi.py`
- `backend/config/celery.py`
- `backend/config/routing.py`

One folder per Django domain app under `backend/apps/`.
Planned domain ownership:

- `backend/apps/accounts/`
- `backend/apps/organizations/`
- `backend/apps/skills/`
- `backend/apps/swaps/`
- `backend/apps/messaging/`
- `backend/apps/sessions/`
- `backend/apps/courses/`
- `backend/apps/payments/`
- `backend/apps/events/`
- `backend/apps/opportunities/`
- `backend/apps/reviews/`
- `backend/apps/notifications/`
- `backend/apps/taxonomy/`
- `backend/apps/dashboards/`
- `backend/apps/audit/`
- `backend/apps/common/`

Suggested structure inside each app:

- `models.py` or `models/`
- `serializers.py` or `serializers/`
- `views.py` or `views/`
- `permissions.py`
- `services.py` or `services/`
- `urls.py`
- `tests/`

## Frontend Ownership

Root:

- `frontend/package.json`
- `frontend/.env.example`
- `frontend/src/`

App/bootstrap layer:

- `frontend/src/main.jsx`
- `frontend/src/App.jsx`
- `frontend/src/app/`

Feature code belongs here:

- `frontend/src/features/<domain>/pages/`
- `frontend/src/features/<domain>/components/`

Feature data access belongs here:

- `frontend/src/services/<domain>/`

Feature hooks belong here:

- `frontend/src/hooks/<domain>/`

Cross-app state and infrastructure:

- `frontend/src/contexts/`
- `frontend/src/stores/`
- `frontend/src/lib/`
- `frontend/src/api/`

Reusable presentation layers:

- `frontend/src/components/ui/`
- `frontend/src/components/shared/`
- `frontend/src/components/layout/`

Current structural decision from the componentized layout:

- New page-level UI goes in `src/features/<domain>/pages/`
- New feature-specific components go in `src/features/<domain>/components/`
- New shared business hooks go in `src/hooks/<domain>/`
- New backend-facing client/service wrappers go in `src/services/<domain>/`
- New app-wide adapters or infra helpers go in `src/lib/`
- Do not put new domain logic in `src/pages/` unless cleaning up legacy leftovers

## Environment Files

- Backend env template: `backend/.env.example`
- Frontend env template: `frontend/.env.example`

Do not create or commit a root project `.env`.

## Package Rationale Pointers

- Backend package rationale lives in [backend/BACKEND_SETUP.md](./backend/BACKEND_SETUP.md)
- Frontend package rationale lives in [frontend/FRONTEND_PRD_READY.md](./frontend/FRONTEND_PRD_READY.md)

Do not re-document package “why” anywhere else unless a new package is introduced.
