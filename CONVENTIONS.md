# Conventions

This file defines the default rules for all implementation tasks.
Read together with:

- [OWNERSHIP.md](./OWNERSHIP.md)
- [schema.yaml](./schema.yaml)
- [SCHEMA.md](./SCHEMA.md)
- [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md)
- [BLOCKERS.md](./BLOCKERS.md)
- [backend/BACKEND_SETUP.md](./backend/BACKEND_SETUP.md)
- [frontend/FRONTEND_PRD_READY.md](./frontend/FRONTEND_PRD_READY.md)

## Naming

### Backend

- Django app package names: lowercase plural or domain nouns, for example `accounts`, `organizations`, `skills`, `swaps`.
- Python modules, variables, functions: `snake_case`
- Classes, serializers, forms, viewsets: `PascalCase`
- Constants and settings keys: `UPPER_SNAKE_CASE`
- API endpoints: lowercase kebab-free path segments under `/api/`, for example `/api/auth/jwt/token/`, `/api/organizations/`
- Serializer names should mirror resource names, for example `OrganizationSerializer`, `CreateSwapRequestSerializer`

### Frontend

- React components: `PascalCase`
- Hooks: `useCamelCase`
- Utilities, store modules, service modules: `kebab-case` or existing repo style where already established
- Feature folders live under `frontend/src/features/<domain>/`
- Shared UI stays in `frontend/src/components/ui/`
- Shared non-UI components stay in `frontend/src/components/shared/` or `frontend/src/components/layout/`
- Route paths and API keys should match backend resource naming where possible

## Commit Messages

Use:

- `feat(scope): short summary`
- `fix(scope): short summary`
- `refactor(scope): short summary`
- `docs(scope): short summary`
- `test(scope): short summary`
- `chore(scope): short summary`

Examples:

- `feat(auth): add organization onboarding endpoint`
- `fix(courses): enforce enrollment unavailable state`

## Tests

### Backend

- New models, serializers, permissions, services, and API endpoints must have tests.
- Tests live inside the owning Django app, preferably under `backend/apps/<domain>/tests/`.
- Auth, permission, trust-state, and monetization rules always require tests.
- If schema-visible request or response shape changes, regenerate [schema.yaml](/C:/Users/Surafel/Documents/Project%20Works/Contract%20Projects/Skill%20Verse/Project%20Skill%20Verse/schema.yaml).

### Frontend

- New business logic in hooks, stores, or service adapters should have tests when test infrastructure is introduced for that area.
- At minimum, frontend tasks must cover loading, empty, success, error, and permission-denied states in manual verification notes until formal test harnesses are added.
- Any UI that depends on auth, trust state, or server gating must be verified against the backend rule, not only mocked assumptions.

## Error Handling

### Backend

- Validate request data with serializers or forms before mutating state.
- Return structured API errors through DRF responses, not ad hoc dictionaries.
- Permission failures must return proper auth/permission status codes.
- Domain rule failures should produce explicit validation/business-rule messages.
- Background or optional integration failures must not corrupt core records.
- Use `backend/apps/common/email.py` for outbound email so delivery continues through the project's Resend integration unless an explicitly approved exception is documented.

### Frontend

- Never swallow request errors silently.
- Surface user-facing errors with consistent toast or inline form feedback.
- Handle loading, empty, success, and failure states explicitly.
- Treat `401`, `403`, `404`, `409`, and validation errors as distinct UI states where relevant.
- Use `schema.yaml` as the contract source before shaping frontend error handling for an endpoint.

## Hard Never Rules

- Never commit `.env`, real secrets, API keys, passwords, tokens, or credential dumps.
- Never hand-maintain a parallel API contract doc that can drift from [schema.yaml](./schema.yaml).
- Never invent request/response shapes in frontend code when `schema.yaml` exists.
- Never bypass DRF serializers, permission classes, or validation for writable endpoints.
- Never enforce access rules only in the frontend.
- Never hardcode trust-state, role, or monetization decisions in UI without backend enforcement.
- Never add a separate SMTP/client-side/custom email sender path when the project's Resend-backed `backend/apps/common/email.py` flow can be used.
- Never place new domain code outside the folders defined in [OWNERSHIP.md](./OWNERSHIP.md) unless the task explicitly documents an exception.
- Never update [Agent Tasks.md](./Agent%20Tasks.md) task status or coverage without also updating [BLOCKERS.md](./BLOCKERS.md) if a blocker affected the work.
