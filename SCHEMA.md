# Schema

[schema.yaml](./schema.yaml) is the single source of truth for API contracts. Regenerate it from `backend/` with `.venv\\Scripts\\python manage.py spectacular --file ..\\schema.yaml`, and view the live docs at `/api/docs/swagger/` or `/api/docs/redoc/`. If an endpoint changes, regenerate `schema.yaml` as part of the task’s Definition of Done instead of documenting the contract by hand anywhere else.
