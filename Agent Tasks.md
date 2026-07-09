# SkillVerse Agent Tasks

Planning only.
Do not start implementation from this file without also reading the linked governance files and source-of-truth setup docs.

## How to use this file

Mandatory reading before starting any task:

1. [CONVENTIONS.md](./CONVENTIONS.md)
2. [OWNERSHIP.md](./OWNERSHIP.md)
3. [schema.yaml](./schema.yaml)
4. [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md)
5. [BLOCKERS.md](./BLOCKERS.md)
6. [ROLE_ACCESS_MATRIX.md](./ROLE_ACCESS_MATRIX.md)

Also treat these as source-of-truth where they already cover a decision:

- [PRD.md](./PRD.md)
- [backend/BACKEND_SETUP.md](./backend/BACKEND_SETUP.md)
- [frontend/FRONTEND_PRD_READY.md](./frontend/FRONTEND_PRD_READY.md)
- [SCHEMA.md](./SCHEMA.md)
- [ROLE_ACCESS_MATRIX.md](./ROLE_ACCESS_MATRIX.md)
- [Agents/PAYMENT_SERVICE.md](./Agents/PAYMENT_SERVICE.md) for any payment, financial-account, checkout, webhook, verification, cancellation, receipt, or Chapa-specific work

Rules:

- Frontend and backend land together per feature within the same phase.
- Update [schema.yaml](./schema.yaml) whenever an endpoint changes.
- Update [BLOCKERS.md](./BLOCKERS.md) whenever a task becomes blocked.
- Treat [ROLE_ACCESS_MATRIX.md](./ROLE_ACCESS_MATRIX.md) as the source of truth for actor-to-route access. If a task changes route access, update the matrix in the same task.
- Use the PRD coverage checklist at the bottom to ensure nothing is dropped.
- For backend email work, use the shared helper in `backend/apps/common/email.py` so all outbound email stays on the project's Resend-backed Django email path.
- For any payment-related task, read [Agents/PAYMENT_SERVICE.md](./Agents/PAYMENT_SERVICE.md) before implementation and treat it as the Chapa integration source of truth.
- Payment-specific hard rules from `Agents/PAYMENT_SERVICE.md` apply automatically to `TASK-701` through `TASK-705`, and to any future task that touches `backend/apps/payments/` or Chapa-linked course enrollment.

Task metadata contract:

- `Owner` says which implementation side is responsible.
- `Actor(s)` says who the feature is built for.
- `Route(s)` says where that actor should encounter the feature in the product.
- If `Route(s)` conflicts with [ROLE_ACCESS_MATRIX.md](./ROLE_ACCESS_MATRIX.md), update the matrix first and then update the task entry in the same change.

## Phase 1: Foundation, Contracts, and Runtime Boundaries

Goal:
At the end of this phase, both apps have stable foundations, shared contract rules, explicit actor boundaries, and implementation-ready runtime wiring.

Status:
Complete

### TASK-101: Finalize Backend Platform Wiring
- **Phase:** Phase 1: Foundation, Contracts, and Runtime Boundaries
- **Owner:** Backend
- **Actor(s):** Guest, Regular User, Organization, Admin
- **Route(s):** All current public and protected routes; see `ROLE_ACCESS_MATRIX.md`
- **Files touched:** `backend/config/`, `backend/manage.py`, `backend/requirements.txt`, `backend/.env.example`
- **Depends on:** None
- **Spec:** `PRD.md` Sections `3`, `6.1`, `7`; `schema.yaml` existing auth/docs endpoints
- **Setup reference:** Backend infrastructure choices already documented in `backend/BACKEND_SETUP.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Confirm backend runtime wiring still matches installed packages, auth modes, env layout, and schema generation flow
- **Blockers:** None
- **Description:** Lock the backend runtime baseline around Django, DRF, JWT/session auth, MySQL, CORS, Celery, Channels, and drf-spectacular so future feature work builds on one stable foundation instead of re-opening setup decisions.

### TASK-102: Finalize Frontend Platform Wiring
- **Phase:** Phase 1: Foundation, Contracts, and Runtime Boundaries
- **Owner:** Frontend
- **Actor(s):** Guest, Regular User, Organization, Admin
- **Route(s):** All current frontend routes and navigation surfaces in `ROLE_ACCESS_MATRIX.md`
- **Files touched:** `frontend/src/app/`, `frontend/src/lib/`, `frontend/src/stores/`, `frontend/src/services/`, `frontend/.env.example`, `frontend/package.json`
- **Depends on:** None
- **Spec:** `PRD.md` Sections `4.1`, `6.4`, `7`; `schema.yaml` for current auth endpoints
- **Setup reference:** Frontend package decisions already documented in `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Confirm routing, query/cache, upload, websocket, and shared-state readiness stay aligned with the documented package choices
- **Blockers:** None
- **Description:** Keep the frontend infrastructure implementation-ready for forms, API calls, realtime, uploads, and shared app state without introducing feature logic yet.

### TASK-103: Define Core Domain Contracts and Status Enums
- **Phase:** Phase 1: Foundation, Contracts, and Runtime Boundaries
- **Owner:** Both
- **Actor(s):** Guest, Regular User, Organization, Admin
- **Route(s):** All actor-scoped routes; shared contract task anchored by `ROLE_ACCESS_MATRIX.md`
- **Files touched:** `backend/apps/common/`, `backend/apps/*/`, `frontend/src/lib/`, `frontend/src/services/`, `schema.yaml`
- **Depends on:** `TASK-101`, `TASK-102`
- **Spec:** `PRD.md` Sections `3`, `6`, `8`; `schema.yaml` current endpoint conventions
- **Setup reference:** `backend/BACKEND_SETUP.md` and `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Shared enum vocabulary exists for roles, verification states, swap states, enrollment states, application states, notification states, and review eligibility
- **Blockers:** None
- **Description:** Define the shared domain language that later tasks will use so frontend and backend do not drift on statuses, trust states, or workflow transitions.

### TASK-104: Define Actor Access and Route Boundaries
- **Phase:** Phase 1: Foundation, Contracts, and Runtime Boundaries
- **Owner:** Both
- **Actor(s):** Guest, Regular User, Organization, Admin
- **Route(s):** All actor-scoped routes in `ROLE_ACCESS_MATRIX.md`
- **Files touched:** `backend/apps/accounts/`, `backend/apps/common/permissions.py`, `frontend/src/app/`, `frontend/src/contexts/`, `frontend/src/components/`
- **Depends on:** `TASK-103`
- **Spec:** `PRD.md` Sections `3`, `5.4`, `6.1`, `7.2`; `schema.yaml` auth endpoints
- **Setup reference:** Session and JWT baseline in `backend/BACKEND_SETUP.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Guest, Regular User, Organization, and Admin access boundaries are explicit in both backend and frontend architecture
- **Blockers:** None
- **Description:** Establish the role model used by every later feature so permission logic and route guards stay aligned from the start.

### TASK-105: Define Shared Trust-State and Gating Rules
- **Phase:** Phase 1: Foundation, Contracts, and Runtime Boundaries
- **Owner:** Both
- **Actor(s):** Guest, Regular User, Organization, Admin
- **Route(s):** `/organizations/:id`, `/courses`, `/courses/:id`, `/events`, `/events/:id`, `/jobs`, `/jobs/:id`, `/org`, `/organization-profile`, `/course-builder`
- **Files touched:** `backend/apps/organizations/`, `backend/apps/payments/`, `frontend/src/components/shared/`, `frontend/src/features/organizations/`, `frontend/src/features/courses/`
- **Depends on:** `TASK-103`, `TASK-104`
- **Spec:** `PRD.md` Sections `3.1`, `5.3`, `6.2`, `6.5`
- **Setup reference:** Monetization and trust-state decisions in `backend/BACKEND_SETUP.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** `Unverified`, `Verified`, and `Enrollment Unavailable` rules are defined once and reusable by later course, event, and opportunity tasks
- **Blockers:** None
- **Description:** Centralize trust-sensitive UI and backend gating decisions so they are not reinterpreted per feature.

### Phase 1 Definition of Done

- Platform foundations are stable on both sides.
- Shared contracts and statuses are explicitly defined.
- Actor boundaries and trust rules are ready for feature implementation.

### Phase 1 Known Blockers / Risks

- None yet.

## Phase 2: Guest Access, Authentication, and Onboarding

Goal:
At the end of this phase, guests can enter the product safely, regular users can authenticate and verify, and organizations can onboard through a separate path.

Status:
Complete

### TASK-201: Build Public Guest Entry Flow
- **Phase:** Phase 2: Guest Access, Authentication, and Onboarding
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Guest
- **Route(s):** `/`, `/get-started`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/organizations/register`
- **Files touched:** `frontend/src/features/landing/`, `frontend/src/features/auth/`, `frontend/src/app/routes.jsx`, `frontend/src/components/layout/`
- **Depends on:** `TASK-102`, `TASK-104`
- **Spec:** `PRD.md` Sections `4.1`, `5.1`, `6.1`, `7.5`; `schema.yaml` current auth endpoints
- **Setup reference:** Frontend router/query foundation in `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Guest-facing entry points clearly separate public browsing from protected flows
- **Blockers:** None
- **Description:** Deliver the public-facing auth and onboarding entry surfaces that begin the guest-to-registered-user journey.

### TASK-202: Implement Regular User Authentication
- **Phase:** Phase 2: Guest Access, Authentication, and Onboarding
- **Status:** Complete
- **Owner:** Backend
- **Actor(s):** Guest, Regular User
- **Route(s):** `/register`, `/login`, `/forgot-password`, `/reset-password`, `/verify-email`, `/dashboard`
- **Files touched:** `backend/apps/accounts/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-101`, `TASK-104`
- **Spec:** `PRD.md` Sections `5.1`, `6.1`; `schema.yaml` `/api/auth/jwt/token/`, `/api/auth/jwt/refresh/`
- **Setup reference:** Auth package rationale in `backend/BACKEND_SETUP.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Registration, login, logout, password reset, and verification flows are contract-defined and schema-aligned
- **Blockers:** None
- **Description:** Implement the backend account flows for regular users including protected workflow gating and auth-state retrieval.

### TASK-203: Wire Regular User Auth UI to Real Backend Contracts
- **Phase:** Phase 2: Guest Access, Authentication, and Onboarding
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Guest, Regular User
- **Route(s):** `/register`, `/login`, `/forgot-password`, `/reset-password`, `/verify-email`, `/dashboard`
- **Files touched:** `frontend/src/features/auth/`, `frontend/src/contexts/`, `frontend/src/services/auth/`, `frontend/src/app/`
- **Depends on:** `TASK-201`, `TASK-202`
- **Spec:** `PRD.md` Sections `5.1`, `6.1`; `schema.yaml` auth endpoints
- **Setup reference:** JWT/session baseline in `backend/BACKEND_SETUP.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Frontend auth flows consume backend auth endpoints and respect schema-defined inputs and outputs
- **Blockers:** None
- **Description:** Replace assumption-driven auth behavior with schema-aligned API consumption and protected-route handling.

### TASK-204: Implement Separate Organization Onboarding Backend Flow
- **Phase:** Phase 2: Guest Access, Authentication, and Onboarding
- **Status:** Complete
- **Owner:** Backend
- **Actor(s):** Guest, Organization
- **Route(s):** `/organizations/register`, `/verify-email`, `/org`
- **Files touched:** `backend/apps/accounts/`, `backend/apps/organizations/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-202`
- **Spec:** `PRD.md` Sections `3`, `5.3`, `6.1`, `6.2`; `schema.yaml` N/A — see description
- **Setup reference:** Organization trust-state baseline in `backend/BACKEND_SETUP.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Organization registration is separate from regular-user registration and creates a distinct organization-controlled path
- **Blockers:** None
- **Description:** Add the backend onboarding path for organizations, keeping V1’s rule that regular user accounts do not convert into organizations.

### TASK-205: Implement Separate Organization Onboarding Frontend Flow
- **Phase:** Phase 2: Guest Access, Authentication, and Onboarding
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Guest, Organization
- **Route(s):** `/organizations/register`, `/verify-email`, `/org`
- **Files touched:** `frontend/src/features/onboarding/`, `frontend/src/features/auth/`, `frontend/src/services/organizations/`, `frontend/src/app/routes.jsx`
- **Depends on:** `TASK-201`, `TASK-204`
- **Spec:** `PRD.md` Sections `3`, `5.3`, `6.1`, `6.2`; `schema.yaml` org onboarding endpoints when added
- **Setup reference:** Upload readiness in `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Organization applicants have a clearly separate onboarding experience from regular users
- **Blockers:** None
- **Description:** Build the UI path for organization onboarding using the backend’s dedicated registration flow and future document-upload readiness.

### TASK-206: Enforce Protected Access and Admin Baseline
- **Phase:** Phase 2: Guest Access, Authentication, and Onboarding
- **Status:** Complete
- **Owner:** Both
- **Actor(s):** Guest, Regular User, Organization, Admin
- **Route(s):** All actor-scoped routes in `ROLE_ACCESS_MATRIX.md`
- **Files touched:** `backend/apps/accounts/`, `backend/apps/common/`, `frontend/src/contexts/`, `frontend/src/components/ProtectedRoute.jsx`, `frontend/src/app/`
- **Depends on:** `TASK-203`, `TASK-204`, `TASK-205`
- **Spec:** `PRD.md` Sections `6.1`, `7.2`
- **Setup reference:** Auth mode decision in `backend/BACKEND_SETUP.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Guest/admin/user/org route and endpoint protections are active and tested against real flows
- **Blockers:** None
- **Description:** Finish Phase 2 by ensuring backend permissions and frontend protected routes agree on who can access what.

### Phase 2 Definition of Done

- Guest-to-user and guest-to-organization entry paths exist.
- Regular-user auth flows work end to end.
- Access rules are enforced in both UI and backend.

### Phase 2 Known Blockers / Risks

- None yet.

## Phase 3: Profiles, Skills, and Organization Public Presence

Goal:
At the end of this phase, regular users can maintain private profiles and skill signals, while organizations expose public trust-sensitive profiles.

### TASK-301: Implement Regular User Profile and Field Models
- **Phase:** Phase 3: Profiles, Skills, and Organization Public Presence
- **Status:** Complete
- **Owner:** Backend
- **Actor(s):** Regular User
- **Route(s):** `/welcome`, `/profile`, `/skill-portfolio`, `/dashboard`
- **Files touched:** `backend/apps/accounts/`, `backend/apps/skills/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-206`
- **Spec:** `PRD.md` Sections `5.1`, `6.2`, `8`; `schema.yaml` N/A — see description
- **Setup reference:** DRF foundation in `backend/BACKEND_SETUP.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** User profile, field-interest, skill, and user-skill contracts exist with private-profile behavior and structured signals
- **Blockers:** None
- **Description:** Build the backend profile and skill graph needed by onboarding, matching, and future recommendations.

### TASK-302: Build Regular User Profile and Skill UI
- **Phase:** Phase 3: Profiles, Skills, and Organization Public Presence
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Regular User
- **Route(s):** `/welcome`, `/profile`, `/skill-portfolio`, `/dashboard`
- **Files touched:** `frontend/src/features/profile/`, `frontend/src/features/skills/`, `frontend/src/hooks/profile/`, `frontend/src/hooks/skills/`, `frontend/src/services/profile/`, `frontend/src/services/skills/`
- **Depends on:** `TASK-301`
- **Spec:** `PRD.md` Sections `5.1`, `6.2`; `schema.yaml` user profile and skill endpoints when added
- **Setup reference:** Existing form/validation stack in `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Users can add, edit, and remove profile, field, and skill data with proper loading/error states
- **Blockers:** None
- **Description:** Deliver the frontend flow for building a meaningful regular-user profile with offered and requested skills.

### TASK-303: Implement Organization Profile and Trust Fields
- **Phase:** Phase 3: Profiles, Skills, and Organization Public Presence
- **Status:** Complete
- **Owner:** Backend
- **Actor(s):** Organization, Guest, Regular User
- **Route(s):** `/organization-profile`, `/org`, `/organizations/:id`, `/courses/:id`, `/events/:id`, `/jobs/:id`
- **Files touched:** `backend/apps/organizations/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-204`, `TASK-301`
- **Spec:** `PRD.md` Sections `3`, `3.1`, `5.3`, `6.2`
- **Setup reference:** Trust-state rationale in `backend/BACKEND_SETUP.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Organization type, public profile data, trust-state fields, and optional license-upload contract exist
- **Blockers:** None
- **Description:** Build the backend organization profile model and API surface used by public trust-sensitive listings and later verification workflows.

### TASK-304: Build Organization Public/Profile Management UI
- **Phase:** Phase 3: Profiles, Skills, and Organization Public Presence
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Organization, Guest, Regular User
- **Route(s):** `/organization-profile`, `/org`, `/organizations/:id`, `/courses/:id`, `/events/:id`, `/jobs/:id`
- **Files touched:** `frontend/src/features/organizations/`, `frontend/src/services/organizations/`, `frontend/src/components/shared/`
- **Depends on:** `TASK-303`
- **Spec:** `PRD.md` Sections `3`, `5.3`, `6.2`; `schema.yaml` organization endpoints when added
- **Setup reference:** Upload and shared-state readiness in `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Organization profiles display trust-sensitive information and regular-user profiles remain non-public
- **Blockers:** None
- **Description:** Implement the frontend organization profile surfaces, including visible trust-state treatment and public/private behavior differences.

### TASK-305: Enforce Visibility and Privacy Rules
- **Phase:** Phase 3: Profiles, Skills, and Organization Public Presence
- **Status:** Complete
- **Owner:** Both
- **Actor(s):** Guest, Regular User, Organization
- **Route(s):** `/profile`, `/organizations/:id`, `/courses`, `/courses/:id`, `/events`, `/events/:id`, `/jobs`, `/jobs/:id`
- **Files touched:** `backend/apps/accounts/`, `backend/apps/organizations/`, `frontend/src/features/profile/`, `frontend/src/features/organizations/`, `frontend/src/app/`
- **Depends on:** `TASK-302`, `TASK-304`
- **Spec:** `PRD.md` Sections `6.2`, `7.2`, `7.3`
- **Setup reference:** N/A
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Guests cannot see private regular-user profiles and trust-sensitive organization status is visible wherever required
- **Blockers:** None
- **Description:** Make privacy and visibility rules explicit in both backend access behavior and frontend presentation.

### Phase 3 Definition of Done

- Regular-user profile and skill management works.
- Organization public presence is modeled and displayed correctly.
- Privacy and trust visibility rules are enforceable.

### Phase 3 Known Blockers / Risks

- None yet.

## Phase 4: Discovery, Matching, and Swap Request Lifecycle

Goal:
At the end of this phase, users can discover relevant peers, understand compatibility, and manage a full free-only swap request lifecycle.

### TASK-401: Implement Matching and Match Suggestion Backend
- **Phase:** Phase 4: Discovery, Matching, and Swap Request Lifecycle
- **Status:** Complete
- **Owner:** Backend
- **Actor(s):** Regular User
- **Route(s):** `/discover`, `/skill-swap`, `/dashboard`
- **Files touched:** `backend/apps/skills/`, `backend/apps/swaps/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-301`, `TASK-305`
- **Spec:** `PRD.md` Sections `5.2`, `6.3`, `6.6`
- **Setup reference:** Recommendation baseline in `backend/BACKEND_SETUP.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Matching logic and match suggestion payloads support reciprocal overlap and rationale-ready data
- **Blockers:** None
- **Description:** Build the backend matching layer that powers V1 deterministic matching while remaining extensible toward later AI assistance.

### TASK-402: Build Discovery and Match UI
- **Phase:** Phase 4: Discovery, Matching, and Swap Request Lifecycle
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Regular User
- **Route(s):** `/discover`, `/skill-swap`, `/dashboard`
- **Files touched:** `frontend/src/features/skills/pages/`, `frontend/src/features/skills/components/`, `frontend/src/hooks/skills/`, `frontend/src/services/skills/`
- **Depends on:** `TASK-401`
- **Spec:** `PRD.md` Sections `5.2`, `6.3`, `6.6`; `schema.yaml` matching endpoints when added
- **Setup reference:** Query and state rationale in `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Users can browse candidate matches and understand overlap or rationale with proper empty/loading/error states
- **Blockers:** None
- **Description:** Deliver the discovery surfaces that turn profile and skill data into a usable matching experience.

### TASK-403: Implement Swap Request Lifecycle Backend
- **Phase:** Phase 4: Discovery, Matching, and Swap Request Lifecycle
- **Status:** Complete
- **Owner:** Backend
- **Actor(s):** Regular User
- **Route(s):** `/skill-swap`, `/dashboard`
- **Files touched:** `backend/apps/swaps/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-401`
- **Spec:** `PRD.md` Sections `5.2`, `6.3`
- **Setup reference:** N/A
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Swap requests support initiate, accept, reject, cancel, and status history with server-side rule enforcement
- **Blockers:** None
- **Description:** Build the backend workflow engine for the swap lifecycle, including history preservation and free-only constraints.

### TASK-404: Build Swap Request Management UI
- **Phase:** Phase 4: Discovery, Matching, and Swap Request Lifecycle
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Regular User
- **Route(s):** `/skill-swap`, `/dashboard`
- **Files touched:** `frontend/src/features/skills/pages/`, `frontend/src/features/skills/components/`, `frontend/src/services/skills/`
- **Depends on:** `TASK-402`, `TASK-403`
- **Spec:** `PRD.md` Sections `5.2`, `6.3`; `schema.yaml` swap request endpoints when added
- **Setup reference:** N/A
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Users can send, accept, reject, cancel, and review swap request state from the UI
- **Blockers:** None
- **Description:** Deliver the user-facing lifecycle controls for swap requests without leaving the platform flow.

### TASK-405: Enforce Free-Only Swap Rules and Future Recommendation Compatibility
- **Phase:** Phase 4: Discovery, Matching, and Swap Request Lifecycle
- **Status:** Complete
- **Owner:** Both
- **Actor(s):** Regular User
- **Route(s):** `/skill-swap`, `/dashboard`
- **Files touched:** `backend/apps/swaps/`, `backend/apps/skills/`, `frontend/src/features/skills/`, `frontend/src/lib/`
- **Depends on:** `TASK-403`, `TASK-404`
- **Spec:** `PRD.md` Sections `2.1`, `6.3`, `6.6`
- **Setup reference:** N/A
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Swap flow contains no monetization path and match payloads remain extensible toward later recommendation features
- **Blockers:** None
- **Description:** Lock the core product principle that skill swaps stay free while preserving forward-compatible recommendation structure.

### Phase 4 Definition of Done

- Discovery and matching work end to end.
- Swap lifecycle works with status history.
- Skill swaps remain fully free.

### Phase 4 Known Blockers / Risks

- None yet.

## Phase 5: Messaging, Realtime Coordination, Sessions, and Reviews

Goal:
At the end of this phase, matched users can communicate, coordinate sessions, share resources, record sessions, and leave ratings/reviews after participation.

Status:
Complete

### TASK-501: Implement Messaging Backend Contracts
- **Phase:** Phase 5: Messaging, Realtime Coordination, Sessions, and Reviews
- **Status:** Complete
- **Owner:** Backend
- **Actor(s):** Regular User
- **Route(s):** `/messages`, `/skill-swap`, `/dashboard`
- **Files touched:** `backend/apps/messaging/`, `backend/config/urls.py`, `backend/config/routing.py`, `schema.yaml`
- **Depends on:** `TASK-403`
- **Spec:** `PRD.md` Sections `5.2`, `6.4`, `8`
- **Setup reference:** Channels/Celery/Redis rationale in `backend/BACKEND_SETUP.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Message threads, messages, and resource-sharing contracts exist and are ready for websocket-backed enhancement
- **Blockers:** None
- **Description:** Build the backend conversation and messaging contract that supports user coordination after successful matching.

### TASK-502: Build Messaging UI and Service Integration
- **Phase:** Phase 5: Messaging, Realtime Coordination, Sessions, and Reviews
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Regular User
- **Route(s):** `/messages`, `/skill-swap`, `/dashboard`
- **Files touched:** `frontend/src/features/messages/`, `frontend/src/hooks/messages/`, `frontend/src/services/messages/`, `frontend/src/lib/realtime/`
- **Depends on:** `TASK-501`
- **Spec:** `PRD.md` Sections `5.2`, `6.4`; `schema.yaml` messaging endpoints when added
- **Setup reference:** Websocket readiness in `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Users can read threads, send messages, and share resource links through schema-aligned services
- **Blockers:** None
- **Description:** Deliver the frontend chat experience using the backend contract and the existing realtime-ready client scaffolding.

### TASK-503: Implement Realtime Message and Coordination Support
- **Phase:** Phase 5: Messaging, Realtime Coordination, Sessions, and Reviews
- **Status:** Complete
- **Owner:** Backend
- **Actor(s):** Regular User
- **Route(s):** `/messages`, `/skill-swap`, `/dashboard`
- **Files touched:** `backend/apps/messaging/`, `backend/config/routing.py`, `backend/config/asgi.py`, `backend/apps/notifications/`
- **Depends on:** `TASK-501`
- **Spec:** `PRD.md` Sections `6.4`, `7.4`
- **Setup reference:** `channels` and `channels-redis` in `backend/BACKEND_SETUP.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Realtime delivery or graceful fallback path exists without corrupting session or message records
- **Blockers:** None
- **Description:** Add the backend realtime coordination path for chat and session-sensitive updates while preserving graceful degradation.

### TASK-504: Wire Frontend Realtime Coordination Behavior
- **Phase:** Phase 5: Messaging, Realtime Coordination, Sessions, and Reviews
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Regular User
- **Route(s):** `/messages`, `/skill-swap`, `/dashboard`
- **Files touched:** `frontend/src/lib/realtime/`, `frontend/src/features/messages/`, `frontend/src/stores/`, `frontend/src/hooks/messages/`
- **Depends on:** `TASK-502`, `TASK-503`
- **Spec:** `PRD.md` Sections `6.4`, `7.1`
- **Setup reference:** `react-use-websocket` and `zustand` mapping in `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Frontend can consume live coordination updates or fallback safely when realtime is unavailable
- **Blockers:** None
- **Description:** Connect the frontend messaging experience to the realtime-ready socket and shared-state foundation without inventing unsupported contracts.

### TASK-505: Implement Session Planning and Session Record Backend
- **Phase:** Phase 5: Messaging, Realtime Coordination, Sessions, and Reviews
- **Status:** Complete
- **Owner:** Backend
- **Actor(s):** Regular User
- **Route(s):** `/messages`, `/dashboard`
- **Files touched:** `backend/apps/sessions/`, `backend/apps/swaps/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-403`
- **Spec:** `PRD.md` Sections `5.2`, `6.4`, `8`
- **Setup reference:** N/A
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Planned and completed learning-session records store participants, time, status, and metadata
- **Blockers:** None
- **Description:** Build the backend record model for session planning, completion tracking, and dashboard visibility.

### TASK-506: Build Session Planning and Meeting-Link UI
- **Phase:** Phase 5: Messaging, Realtime Coordination, Sessions, and Reviews
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Regular User
- **Route(s):** `/messages`, `/dashboard`
- **Files touched:** `frontend/src/features/messages/`, `frontend/src/features/dashboard/`, `frontend/src/services/messages/`, `frontend/src/services/dashboard/`
- **Depends on:** `TASK-505`, `TASK-502`
- **Spec:** `PRD.md` Sections `5.2`, `6.4`; `schema.yaml` session endpoints when added
- **Setup reference:** No video SDK added by design per `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Users can coordinate time, store meeting links, and view upcoming/completed sessions
- **Blockers:** None
- **Description:** Deliver the V1-safe session coordination UI path, including external meeting-link sharing and session status visibility.

### TASK-507: Implement Participation-Based Review Rules
- **Phase:** Phase 5: Messaging, Realtime Coordination, Sessions, and Reviews
- **Status:** Complete
- **Owner:** Backend
- **Actor(s):** Regular User
- **Route(s):** `/messages`, `/skill-swap`, `/dashboard`, `/courses/:id`, `/events/:id`
- **Files touched:** `backend/apps/reviews/`, `backend/apps/swaps/`, `backend/apps/courses/`, `backend/apps/events/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-505`
- **Spec:** `PRD.md` Sections `6.3.1`, `9.1`
- **Setup reference:** N/A
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Backend eligibility rules exist for swap, course, and event reviews after meaningful participation
- **Blockers:** None
- **Description:** Build the backend rating/review rule set so participation, not page access alone, controls review availability.

### TASK-508: Build Ratings and Reviews UI
- **Phase:** Phase 5: Messaging, Realtime Coordination, Sessions, and Reviews
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Regular User
- **Route(s):** `/messages`, `/dashboard`, `/courses/:id`, `/events/:id`
- **Files touched:** `frontend/src/features/messages/`, `frontend/src/features/courses/`, `frontend/src/features/events/`, `frontend/src/services/`
- **Depends on:** `TASK-507`, `TASK-506`
- **Spec:** `PRD.md` Sections `6.3.1`, `9.1`; `schema.yaml` review endpoints when added
- **Setup reference:** Existing forms/validation stack in `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Required review flows exist for completed swaps and are ready for course/event participation contexts
- **Blockers:** None
- **Description:** Deliver the UI flows for leaving post-participation feedback in the contexts required by the PRD.

### Phase 5 Definition of Done

- Users can message and coordinate inside the platform.
- Sessions can be planned and recorded.
- Participation-based reviews are supported.

### Phase 5 Known Blockers / Risks

- None yet.

## Phase 6: Organization Verification and Program Authoring

Goal:
At the end of this phase, organizations can move through trust workflows and author structured programs with real learning content.

### TASK-601: Implement Organization Verification Workflow Backend
- **Phase:** Phase 6: Organization Verification and Program Authoring
- **Status:** Complete
- **Owner:** Backend
- **Actor(s):** Organization, Admin
- **Route(s):** `/organization-profile`, `/org`, `/admin`, `/organizations/:id`, `/courses/:id`, `/jobs/:id`
- **Files touched:** `backend/apps/organizations/`, `backend/apps/audit/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-303`, `TASK-305`
- **Spec:** `PRD.md` Sections `3.1`, `5.3`, `6.1`, `6.10`
- **Setup reference:** Trust-state and upload rationale in `backend/BACKEND_SETUP.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Verification records, review states, and override-capable trust workflow exist and are schema-aligned
- **Blockers:** None
- **Description:** Build the backend verification process that moves organizations from `Unverified` to `Verified` and supports future trust-sensitive workflows.

### TASK-602: Build Verification Status and Organization Trust UI
- **Phase:** Phase 6: Organization Verification and Program Authoring
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Organization, Admin, Guest, Regular User
- **Route(s):** `/organization-profile`, `/org`, `/admin`, `/organizations/:id`, `/courses/:id`, `/jobs/:id`
- **Files touched:** `frontend/src/features/organizations/`, `frontend/src/lib/uploads/`, `frontend/src/services/organizations/`, `frontend/src/components/shared/`
- **Depends on:** `TASK-601`
- **Spec:** `PRD.md` Sections `3.1`, `5.3`, `6.2`; `schema.yaml` verification endpoints when added
- **Setup reference:** `react-dropzone` mapping in `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Organizations can see and act on verification state, and required trust indicators appear in the UI
- **Blockers:** None
- **Description:** Build the frontend verification and trust-status experience for organization operators and public trust-sensitive surfaces.

### TASK-603: Implement Course, Module, and Lesson Backend
- **Phase:** Phase 6: Organization Verification and Program Authoring
- **Status:** Complete
- **Owner:** Backend
- **Actor(s):** Organization, Regular User, Guest
- **Route(s):** `/course-builder`, `/org`, `/courses`, `/courses/:id`
- **Files touched:** `backend/apps/courses/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-601`
- **Spec:** `PRD.md` Sections `4.1`, `5.3`, `6.5`, `8`
- **Setup reference:** Course structure rationale in `backend/BACKEND_SETUP.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Course/program, module, lesson, resource, checklist, and assessment contracts exist
- **Blockers:** None
- **Description:** Build the backend learning-content engine for organization-managed structured programs.

### TASK-604: Build Course Authoring UI
- **Phase:** Phase 6: Organization Verification and Program Authoring
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Organization
- **Route(s):** `/course-builder`, `/org`
- **Files touched:** `frontend/src/features/courses/`, `frontend/src/features/courses/course-builder/`, `frontend/src/hooks/courses/`, `frontend/src/services/courses/`
- **Depends on:** `TASK-603`
- **Spec:** `PRD.md` Sections `5.3`, `6.5`; `schema.yaml` course authoring endpoints when added
- **Setup reference:** Existing course-builder structure plus upload readiness in `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Organizations can author structured course content with modules, lessons, resources, and assessments
- **Blockers:** None
- **Description:** Deliver the frontend authoring experience for real course content, not shallow placeholders.

### TASK-605: Implement Progression Gating and Content Visibility Rules
- **Phase:** Phase 6: Organization Verification and Program Authoring
- **Status:** Complete
- **Owner:** Both
- **Actor(s):** Organization, Regular User
- **Route(s):** `/course-builder`, `/courses/:id`, `/dashboard`
- **Files touched:** `backend/apps/courses/`, `frontend/src/features/courses/`, `schema.yaml`
- **Depends on:** `TASK-603`, `TASK-604`
- **Spec:** `PRD.md` Sections `5.3`, `6.5`
- **Setup reference:** N/A
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Learners can see structured completion flow and backend progression logic supports gated advancement
- **Blockers:** None
- **Description:** Implement the progression behavior that turns course content into a real learning product.

### TASK-606: Enforce Paid-Course Trust Restrictions
- **Phase:** Phase 6: Organization Verification and Program Authoring
- **Status:** Complete
- **Owner:** Both
- **Actor(s):** Organization, Regular User, Guest
- **Route(s):** `/course-builder`, `/organization-profile`, `/org`, `/courses`, `/courses/:id`
- **Files touched:** `backend/apps/courses/`, `backend/apps/organizations/`, `frontend/src/features/courses/`, `frontend/src/features/organizations/`, `schema.yaml`
- **Depends on:** `TASK-601`, `TASK-603`, `TASK-605`
- **Spec:** `PRD.md` Sections `3.1`, `6.5`
- **Setup reference:** Monetization rule rationale in `backend/BACKEND_SETUP.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Unverified or insufficiently verified organizations cannot create or edit paid courses, and the UI mirrors that rule
- **Blockers:** None
- **Description:** Implement the server-side and UI gating that protects paid-course creation rules before finance setup is even considered.

### Phase 6 Definition of Done

- Verification workflow exists.
- Organization program authoring works with structured content.
- Paid-course creation restrictions are enforced.

### Phase 6 Known Blockers / Risks

- None yet.

## Phase 7: Payments, Enrollment, and Learning Progress

Goal:
At the end of this phase, verified organizations can reach finance readiness, paid-course gating works correctly, and learners can enroll and track progress.

Phase 7 source-of-truth note:
- [Agents/PAYMENT_SERVICE.md](./Agents/PAYMENT_SERVICE.md) is the authoritative Chapa integration guide for this phase.
- Any payment provider call must go through `backend/apps/payments/services/payment.py`.
- Never trust initiation alone; payment success must be confirmed by verification.
- Webhook signature verification is mandatory before processing.
- Sandbox/live differences must come from settings only.
- Phase 7 V1 payment scope is direct Chapa payment only.
- Split payment and Chapa subaccount routing are explicitly out of scope for Phase 7 unless a later task adds them.

### TASK-701: Implement Financial Account Readiness Backend
- **Phase:** Phase 7: Payments, Enrollment, and Learning Progress
- **Status:** Complete
- **Owner:** Backend
- **Actor(s):** Organization
- **Route(s):** `/org`, `/organization-profile`, `/course-builder`
- **Files touched:** `backend/apps/payments/`, `backend/apps/organizations/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-601`, `TASK-606`
- **Spec:** `PRD.md` Sections `3.1`, `4.1`, `6.5`, `8`
- **Setup reference:** Payment readiness rationale in `backend/BACKEND_SETUP.md`; Chapa/finance source of truth in `Agents/PAYMENT_SERVICE.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Financial-account setup state exists and can gate monetization
- **Blockers:** None
- **Description:** Build the backend readiness model that decides whether a verified organization may accept paid enrollments. This task must shape internal finance/account state so later direct Chapa payment work in `TASK-703` can rely on it without redefining provider rules. Do not introduce split-payment or subaccount-routing behavior in this task.

### TASK-702: Build Financial Setup and Monetization Readiness UI
- **Phase:** Phase 7: Payments, Enrollment, and Learning Progress
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Organization, Regular User
- **Route(s):** `/org`, `/organization-profile`, `/course-builder`, `/courses/:id`
- **Files touched:** `frontend/src/features/organizations/`, `frontend/src/features/courses/`, `frontend/src/services/organizations/`
- **Depends on:** `TASK-701`
- **Spec:** `PRD.md` Sections `5.3`, `6.5`; `schema.yaml` financial setup endpoints when added
- **Setup reference:** No extra payment UI package was added by design per `frontend/FRONTEND_PRD_READY.md`; payment-state semantics must match `Agents/PAYMENT_SERVICE.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Organization operators can see monetization readiness and learners can see blocked-vs-available enrollment state
- **Blockers:** None
- **Description:** Deliver the frontend visibility for finance setup readiness and enrollment gating. This task must mirror the backend/payment-service meanings of `ready`, `pending`, blocked paid enrollment, and `Enrollment Unavailable` without inventing frontend-only payment states. UI language should prepare users for direct Chapa payment, not split-payout behavior.

### TASK-703: Implement Chapa-Oriented Payment Flow Backend
- **Phase:** Phase 7: Payments, Enrollment, and Learning Progress
- **Status:** Complete
- **Owner:** Backend
- **Actor(s):** Organization, Regular User
- **Route(s):** `/courses/:id`, `/dashboard`, `/org`
- **Files touched:** `backend/apps/payments/`, `backend/apps/courses/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-701`
- **Spec:** `PRD.md` Sections `4.1`, `6.5`
- **Setup reference:** Payment provider assumptions in `PRD.md` and `backend/BACKEND_SETUP.md`; Chapa integration contract in `Agents/PAYMENT_SERVICE.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Direct-payment initiation, authorization/verification handling where required, price/currency handling, and post-payment enrollment readiness are contract-defined
- **Blockers:** None
- **Description:** Implement the backend payment contract for direct Chapa paid-course enrollment. Use `Agents/PAYMENT_SERVICE.md` as the execution contract: all Chapa API calls must go through `backend/apps/payments/services/payment.py`; implement the direct-payment path defined in the Chapa docs, including initiation, any required authorization step, and server-side verification; initiation must persist a pending local transaction; webhook signatures must be verified before processing; and final enrollment/value delivery must happen only after server-side verification succeeds. Do not implement split payment or subaccount routing in this task.

### TASK-704: Build Paid Enrollment UI and Blocked Enrollment States
- **Phase:** Phase 7: Payments, Enrollment, and Learning Progress
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Regular User, Organization
- **Route(s):** `/courses/:id`, `/dashboard`, `/org`
- **Files touched:** `frontend/src/features/courses/`, `frontend/src/services/courses/`, `frontend/src/components/shared/`
- **Depends on:** `TASK-702`, `TASK-703`
- **Spec:** `PRD.md` Sections `5.3`, `6.5`; `schema.yaml` payment/enrollment endpoints when added
- **Setup reference:** Payment UI deferment rationale in `frontend/FRONTEND_PRD_READY.md`; checkout/status semantics must match `Agents/PAYMENT_SERVICE.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Paid and blocked enrollment states are visible, including explicit `Enrollment Unavailable`, and the learner can enter the direct Chapa payment flow exposed by the backend
- **Blockers:** None
- **Description:** Deliver the learner-facing UI for course pricing, direct-payment entry, and blocked enrollment rules. Frontend must consume backend-generated initiation/authorization/verification results and payment states from schema-backed endpoints rather than constructing Chapa requests directly in the browser. Do not build split-payout UI in this task.

### TASK-705: Implement Enrollment and Progress Backend
- **Phase:** Phase 7: Payments, Enrollment, and Learning Progress
- **Status:** Complete
- **Owner:** Backend
- **Actor(s):** Regular User, Organization
- **Route(s):** `/courses/:id`, `/dashboard`, `/org`
- **Files touched:** `backend/apps/courses/`, `backend/apps/payments/`, `backend/apps/dashboards/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-603`, `TASK-703`
- **Spec:** `PRD.md` Sections `4.1`, `5.3`, `6.5`, `6.11`
- **Setup reference:** Enrollment reconciliation rules must remain consistent with `Agents/PAYMENT_SERVICE.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Enrollment records, enrollment states, and progress states are persisted and available for dashboards
- **Blockers:** None
- **Description:** Build the backend enrollment and progress layer used by learners, organizations, and dashboards. When a course is paid, enrollment activation must be driven by verified outcomes from the direct Chapa payment flow defined in `Agents/PAYMENT_SERVICE.md`, not by initiation alone.

### TASK-706: Build Learner Enrollment and Progress UI
- **Phase:** Phase 7: Payments, Enrollment, and Learning Progress
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Regular User
- **Route(s):** `/courses/:id`, `/dashboard`
- **Files touched:** `frontend/src/features/courses/`, `frontend/src/features/dashboard/`, `frontend/src/hooks/courses/`, `frontend/src/services/courses/`
- **Depends on:** `TASK-704`, `TASK-705`
- **Spec:** `PRD.md` Sections `4.1`, `6.5`, `6.11`; `schema.yaml` enrollment/progress endpoints when added
- **Setup reference:** Existing dashboard/query stack in `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Learners can enroll in eligible programs and see progress reflected in user-facing surfaces
- **Blockers:** None
- **Description:** Deliver the frontend enrollment and progress experience for course participation.

### Phase 7 Definition of Done

- Finance readiness gates paid enrollment correctly.
- `Enrollment Unavailable` is enforced where required.
- Enrollments and progress tracking work end to end.

### Phase 7 Known Blockers / Risks

- None yet.

## Phase 8: Events, Opportunities, and Applications

Goal:
At the end of this phase, organizations can publish events and opportunities, and regular users can RSVP and apply inside the platform.

### TASK-801: Implement Event and RSVP Backend
- **Phase:** Phase 8: Events, Opportunities, and Applications
- **Status:** Complete
- **Owner:** Backend
- **Actor(s):** Organization, Regular User, Guest
- **Route(s):** `/events`, `/events/:id`, `/org`
- **Files touched:** `backend/apps/events/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-206`, `TASK-303`
- **Spec:** `PRD.md` Sections `4.1`, `6.8`, `8`
- **Setup reference:** N/A
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Organizations can create events, regular users can RSVP/register, and actor restrictions are enforced server-side
- **Blockers:** None
- **Description:** Build the backend event creation and participation model for V1.

### TASK-802: Build Event Discovery and RSVP UI
- **Phase:** Phase 8: Events, Opportunities, and Applications
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Guest, Regular User
- **Route(s):** `/events`, `/events/:id`
- **Files touched:** `frontend/src/features/events/`, `frontend/src/services/events/`, `frontend/src/components/shared/`
- **Depends on:** `TASK-801`
- **Spec:** `PRD.md` Sections `4.1`, `6.8`; `schema.yaml` event endpoints when added
- **Setup reference:** Existing date and toast stack in `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Users can discover events, view details, and RSVP while trust-state presentation remains correct
- **Blockers:** None
- **Description:** Deliver the frontend event experience for public browsing and regular-user participation.

### TASK-803: Implement Opportunity and Application Backend
- **Phase:** Phase 8: Events, Opportunities, and Applications
- **Status:** Complete
- **Owner:** Backend
- **Actor(s):** Organization, Regular User, Guest
- **Route(s):** `/jobs`, `/jobs/:id`, `/org`
- **Files touched:** `backend/apps/opportunities/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-206`, `TASK-303`
- **Spec:** `PRD.md` Sections `4.1`, `6.9`, `8`
- **Setup reference:** N/A
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Opportunity posting and in-platform application pipeline support the required states: applied, shortlisted, interview, hired
- **Blockers:** None
- **Description:** Build the backend opportunity and application workflow used by organizations and regular users.

### TASK-804: Build Opportunity Discovery and Application UI
- **Phase:** Phase 8: Events, Opportunities, and Applications
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Guest, Regular User
- **Route(s):** `/jobs`, `/jobs/:id`, `/dashboard`
- **Files touched:** `frontend/src/features/jobs/`, `frontend/src/services/jobs/`, `frontend/src/components/shared/`
- **Depends on:** `TASK-803`
- **Spec:** `PRD.md` Sections `4.1`, `6.9`; `schema.yaml` opportunity/application endpoints when added
- **Setup reference:** Existing query/form stack in `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Regular users can browse opportunities and submit applications through the platform UI
- **Blockers:** None
- **Description:** Deliver the frontend opportunity listing, detail, and application experience for regular users.

### TASK-805: Build Organization Applicant Pipeline Management
- **Phase:** Phase 8: Events, Opportunities, and Applications
- **Status:** Complete
- **Owner:** Both
- **Actor(s):** Organization
- **Route(s):** `/org`
- **Files touched:** `backend/apps/opportunities/`, `backend/apps/dashboards/`, `frontend/src/features/organizations/`, `frontend/src/features/jobs/`, `frontend/src/services/`
- **Depends on:** `TASK-803`, `TASK-804`
- **Spec:** `PRD.md` Sections `5.3`, `6.9`, `6.11`
- **Setup reference:** N/A
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Organizations can view and update applicant pipeline states in both backend behavior and frontend management surfaces
- **Blockers:** None
- **Description:** Finish the opportunity workflow by giving organizations the operational UI and API path for application management.

### TASK-806: Preserve Relevance Signals for Events and Opportunities
- **Phase:** Phase 8: Events, Opportunities, and Applications
- **Status:** Complete
- **Owner:** Both
- **Actor(s):** Regular User, Organization
- **Route(s):** `/discover`, `/events`, `/events/:id`, `/jobs`, `/jobs/:id`, `/dashboard`, `/org`
- **Files touched:** `backend/apps/events/`, `backend/apps/opportunities/`, `backend/apps/dashboards/`, `frontend/src/services/`, `frontend/src/lib/`
- **Depends on:** `TASK-801`, `TASK-803`
- **Spec:** `PRD.md` Sections `5.5`, `6.6`, `6.8`, `6.9`
- **Setup reference:** Recommendation groundwork in `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Event and opportunity contracts preserve field, skill, course, and participation linkage for later relevance logic
- **Blockers:** None
- **Description:** Ensure the data model and API outputs do not lose the signals needed for future discovery and recommendation features.

### TASK-807: Expand Event Management and Attendee Backend
- **Phase:** Phase 8: Events, Opportunities, and Applications
- **Status:** Complete
- **Owner:** Backend
- **Actor(s):** Organization
- **Route(s):** `/org`, `/events`, `/events/:id`
- **Files touched:** `backend/apps/events/`, `backend/apps/reviews/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-801`, `TASK-806`
- **Spec:** `PRD.md` Sections `6.8`, `6.10`, `6.11`; `schema.yaml` organization event management and attendee endpoints
- **Setup reference:** N/A
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Organizations can list their events, create/update/delete them safely, control lifecycle state and RSVP availability, inspect attendee/RSVP records, mark attendance, and expose event analytics and participation-verification-ready fields through the API
- **Blockers:** None
- **Description:** Extend the event backend beyond public browsing and self-RSVP so organizations have operational event-management APIs. This includes organization-scoped event listing, edit/delete safeguards, attendee list endpoints, RSVP-status filtering, attendance marking, event-level totals such as RSVP count and attendance count, and participation fields that later trust/review workflows can rely on without redefining event records.

### TASK-808: Build Organization Event Management Workspace
- **Phase:** Phase 8: Events, Opportunities, and Applications
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Organization
- **Route(s):** `/org`
- **Files touched:** `frontend/src/features/organizations/`, `frontend/src/features/events/`, `frontend/src/services/events/`, `frontend/src/components/shared/`
- **Depends on:** `TASK-807`
- **Spec:** `PRD.md` Sections `4.1`, `6.8`, `6.11`; `schema.yaml` organization event management endpoints
- **Setup reference:** Existing workspace-shell and query/form foundations in `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** `/org` contains a real event-management surface where organizations can create events, edit them, control status and RSVP settings, review summary metrics, and safely remove or archive events from the same workspace
- **Blockers:** None
- **Description:** Deliver the organization event workspace inside `/org`, covering event creation, edit/update, status controls such as `upcoming`, `live`, `completed`, and `cancelled`, RSVP-open toggles, capacity controls, online/in-person fields, relevance signals, and event analytics such as total RSVPs, remaining spots, and attended counts.

### TASK-809: Build Organization Attendee and Attendance Operations
- **Phase:** Phase 8: Events, Opportunities, and Applications
- **Status:** Complete
- **Owner:** Both
- **Actor(s):** Organization
- **Route(s):** `/org`
- **Files touched:** `backend/apps/events/`, `backend/apps/reviews/`, `frontend/src/features/organizations/`, `frontend/src/services/events/`, `schema.yaml`
- **Depends on:** `TASK-807`, `TASK-808`
- **Spec:** `PRD.md` Sections `6.4`, `6.8`, `6.10`, `6.11`; `schema.yaml` attendee-management endpoints
- **Setup reference:** Participation review foundation already present from `TASK-507` and `TASK-508`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Organizations can manage attendee records from `/org`, filter RSVP states, mark participation/attendance, and expose the event participation data needed by later review and trust workflows
- **Blockers:** None
- **Description:** Finish the organization-side event operations by adding attendee-management flows: RSVP list views, per-event filtering, attendance confirmation, participation-ready metadata for later verification/review unlocks, and operator-friendly attendee actions that do not require leaving the organization workspace.

### TASK-810: Add Admin Event Oversight and Moderation Hooks
- **Phase:** Phase 8: Events, Opportunities, and Applications
- **Status:** Complete
- **Owner:** Both
- **Actor(s):** Admin
- **Route(s):** `/admin`, `/events`, `/events/:id`
- **Files touched:** `backend/apps/events/`, `backend/apps/audit/`, `frontend/src/features/organizations/`, `frontend/src/features/dashboard/`, `frontend/src/services/events/`, `schema.yaml`
- **Depends on:** `TASK-807`, `TASK-808`
- **Spec:** `PRD.md` Sections `4.1`, `6.8`, `6.11`; `ROLE_ACCESS_MATRIX.md`; `schema.yaml` admin event oversight endpoints
- **Setup reference:** Admin workspace and moderation conventions already established in later admin tasks; this task adds only event-specific oversight needed to close Phase 8
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Admins can inspect organization-created events and take basic oversight actions without inheriting organization-only operational controls
- **Blockers:** None
- **Description:** Add minimal but explicit admin event oversight so events are not the only publishable content type without an admin path. Scope this to moderation/oversight actions such as reviewing event records, trust visibility, and intervention-ready status changes where policy requires it, while keeping daily attendee operations owned by organizations.

### Phase 8 Definition of Done

- Events and opportunities work end to end.
- Regular users can RSVP and apply.
- Organization-side applicant management exists.
- Organization-side event management exists in `/org`.
- Event attendee and attendance operations exist for organizations.
- Event participation records preserve later review and trust hooks.
- Admin event oversight exists where platform intervention is needed.

### Phase 8 Known Blockers / Risks

- None yet.

## Phase 9: Dashboards, Notifications, Moderation, and Governance

Goal:
At the end of this phase, the existing role-specific workspaces at `/dashboard`, `/org`, and `/admin` are upgraded into live operational dashboards, notifications are unified across in-app, realtime, and email delivery, and admin governance extends the current review surfaces instead of introducing a parallel system.

### TASK-901: Implement Dashboard Aggregation Backend
- **Phase:** Phase 9: Dashboards, Notifications, Moderation, and Governance
- **Status:** Complete
- **Owner:** Backend
- **Actor(s):** Regular User, Organization, Admin
- **Route(s):** `/dashboard`, `/org`, `/admin`
- **Files touched:** `backend/apps/dashboards/`, `backend/apps/courses/`, `backend/apps/events/`, `backend/apps/opportunities/`, `backend/apps/learning_sessions/`, `backend/apps/organizations/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-505`, `TASK-705`, `TASK-805`, `TASK-809`, `TASK-810`
- **Spec:** `PRD.md` Sections `4.1`, `6.11`; `ROLE_ACCESS_MATRIX.md`; `schema.yaml` dashboard endpoints when added
- **Setup reference:** Reuse the existing role-separated workspace contract and keep aggregate payloads aligned with current course, event, application, session, and moderation records
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Live dashboard aggregates exist for regular users, organizations, and admins
- **Blockers:** None
- **Description:** Build the backend aggregate layer that turns live records into actor-specific dashboard data without replacing the current workspace model. Regular-user payloads should cover activity, progress, sessions, swaps, events, and recommendation-ready signals. Organization payloads should cover enrollments, learner progress, managed offerings, applicant pipeline, event participation, and course performance summaries. Admin payloads should cover oversight queues, moderation counts, trust/finance review state, and platform reporting summaries.

### TASK-902: Upgrade Existing Actor Dashboard Frontends
- **Phase:** Phase 9: Dashboards, Notifications, Moderation, and Governance
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Regular User, Organization, Admin
- **Route(s):** `/dashboard`, `/org`, `/admin`
- **Files touched:** `frontend/src/features/dashboard/`, `frontend/src/features/organizations/`, `frontend/src/services/dashboard/`, `frontend/src/hooks/dashboard/`, `frontend/src/components/shared/`
- **Depends on:** `TASK-901`, `TASK-808`, `TASK-809`, `TASK-810`
- **Spec:** `PRD.md` Sections `4.1`, `6.11`; `schema.yaml` dashboard endpoints when added
- **Setup reference:** Reuse the existing `WorkspaceShell`, query stack, and dashboard route separation already established in the frontend; charting/query rationale remains in `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Each primary actor has a meaningful dashboard backed by live records
- **Blockers:** None
- **Description:** Upgrade the current role-specific workspaces instead of rebuilding them from scratch. The regular-user dashboard should stay focused on learning, swaps, sessions, opportunities, and events. The organization dashboard should present enrollments, student progress, managed courses, events,attendees, attendee management (RSVP management), jobs,applicant pipeline and performance highlights in a scalable layout. The admin dashboard should build on the existing review tabs and add live oversight summaries without exposing unrelated regular-user or organization flows.Make sure the header links corresponds to the actors and they are enough. On organization header links are Dashboard, Org profile and Course builder in which those needs to be updated to the current flow and functionality Organizations have. I should be able to find links in Dashboard to manage my work and responsability for each Actor. like Organization dashboard should at least show Active courses, Active Events, Open Jobs, Applicants cards which are clickable and redirect to there respective data when clicked. 

### TASK-903: Implement Unified Notification Backend
- **Phase:** Phase 9: Dashboards, Notifications, Moderation, and Governance
- **Owner:** Backend
- **Status:** Complete
- **Actor(s):** Guest, Regular User, Organization, Admin
- **Route(s):** `/verify-email`, `/login`, `/dashboard`, `/org`, `/admin`, `/messages`, `/skill-swap`, `/courses/:id`, `/events/:id`, `/jobs/:id`
- **Files touched:** `backend/apps/notifications/`, `backend/apps/accounts/`, `backend/apps/messaging/`, `backend/apps/courses/`, `backend/apps/events/`, `backend/apps/opportunities/`, `backend/apps/swaps/`, `backend/apps/organizations/`, `backend/config/routing.py`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-202`, `TASK-404`, `TASK-405`, `TASK-503`, `TASK-705`, `TASK-810`
- **Spec:** `PRD.md` Sections `4.1`, `6.4`, `6.11`
- **Setup reference:** Use the existing Resend email helper path for email delivery and the current websocket/realtime foundation for live in-app notification updates; see `backend/BACKEND_SETUP.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Essential notification records and delivery triggers exist for core workflow events
- **Blockers:** None
- **Description:** Build a real notification record layer instead of relying on isolated badges or one-off emails. Core flows should create stored notifications and, where appropriate, fan out through realtime and email using the existing Resend helper. Scope includes verification, swap actions, messaging/unread events, learning-session changes, enrollment/payment state changes, event RSVP/attendance changes, application pipeline changes, and admin-governance actions that users need to see.

### TASK-904: Build Notification Frontend and App-Shell Surfaces
- **Phase:** Phase 9: Dashboards, Notifications, Moderation, and Governance
- **Owner:** Frontend
- **Actor(s):** Regular User, Organization, Admin
- **Route(s):** `/dashboard`, `/org`, `/admin`, `/messages`
- **Files touched:** `frontend/src/stores/`, `frontend/src/components/layout/`, `frontend/src/components/shared/`, `frontend/src/features/dashboard/`, `frontend/src/features/organizations/`, `frontend/src/services/`, `frontend/src/lib/realtime/`
- **Depends on:** `TASK-903`, `TASK-902`
- **Spec:** `PRD.md` Sections `4.1`, `6.11`; `schema.yaml` notification endpoints when added
- **Setup reference:** Reuse the existing `zustand` app-shell store and websocket client foundations instead of creating a second notification state system; see `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Users can see essential notifications and status changes through app-visible surfaces
- **Blockers:** None
- **Description:** Surface notifications through the existing app shell and actor workspaces. This should extend the current unread badge model into a proper notification experience with counts, read state, deep links into the relevant workflow, and actor-relevant visibility in `/dashboard`, `/org`, and `/admin` without inventing disconnected UI patterns.

### TASK-905: Implement Admin Moderation, Taxonomy, and Suggestion Backend
  - **Phase:** Phase 9: Dashboards, Notifications, Moderation, and Governance
  - **Status:** Complete
  - **Owner:** Backend
- **Actor(s):** Regular User, Organization, Admin
- **Route(s):** `/profile`, `/skill-portfolio`, `/organization-profile`, `/course-builder`, `/org`, `/admin`
- **Files touched:** `backend/apps/taxonomy/`, `backend/apps/accounts/`, `backend/apps/organizations/`, `backend/apps/skills/`, `backend/apps/events/`, `backend/apps/opportunities/`, `backend/apps/audit/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-206`, `TASK-601`, `TASK-810`
- **Spec:** `PRD.md` Sections `5.4`, `6.12`
- **Setup reference:** Extend the current admin review model already used for verification, finance, and event oversight so governance remains centralized in `/admin`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Admin moderation, category suggestion review, and category activation controls exist server-side
- **Blockers:** None
- **Description:** Build the backend governance layer for admin review of accounts, organizations, publishable content, and controlled category lists. This phase should also add user- and organization-submitted category suggestion flows that remain inactive until approved, plus server-side controls for disabling or reviewing problematic records without breaking actor separation.

### TASK-906: Build Admin Moderation and Category Governance UI
  - **Phase:** Phase 9: Dashboards, Notifications, Moderation, and Governance
  - **Status:** Complete
  - **Owner:** Frontend
- **Actor(s):** Admin
- **Route(s):** `/admin`
- **Files touched:** `frontend/src/features/organizations/`, `frontend/src/features/dashboard/`, `frontend/src/services/organizations/`, `frontend/src/services/dashboard/`, `frontend/src/services/`, `frontend/src/components/shared/`
- **Depends on:** `TASK-905`, `TASK-902`
- **Spec:** `PRD.md` Sections `5.4`, `6.12`; `schema.yaml` moderation/category endpoints when added
- **Setup reference:** Build inside the existing admin workspace and tab system rather than creating a second admin surface
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Admins can review, approve, reject, disable, and manage the governance surfaces required by V1
- **Blockers:** None
- **Description:** Extend `/admin` with moderation and taxonomy governance surfaces that fit the existing review workspace. This includes admin handling for category suggestions, problematic content/account review, and status-management actions while preserving the strict separation between admin tools and organization/regular-user workflows.

### TASK-907: Expand Audit Logging and Review APIs
- **Phase:** Phase 9: Dashboards, Notifications, Moderation, and Governance
- **Status:** Complete
- **Owner:** Backend
- **Actor(s):** Admin
- **Route(s):** `/admin`
- **Files touched:** `backend/apps/audit/`, `backend/apps/accounts/`, `backend/apps/organizations/`, `backend/apps/events/`, `backend/apps/opportunities/`, `backend/apps/payments/`, `backend/apps/common/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-905`
- **Spec:** `PRD.md` Sections `6.12`, `7.4`
- **Setup reference:** Build on the existing `apps.audit` model and current audit hooks already used for verification and event oversight
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Key administrative and security-sensitive actions are logged with reviewable records
- **Blockers:** None
- **Description:** Expand the existing audit foundation into a reviewable backend audit system with filterable endpoints and broader coverage of sensitive actions. At minimum, moderation decisions, verification/finance actions, event oversight, payment-sensitive admin actions, and taxonomy approvals should be logged consistently and queryable from the admin workspace.

### TASK-908: Expose Audit and Oversight UI
- **Phase:** Phase 9: Dashboards, Notifications, Moderation, and Governance
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Admin
- **Route(s):** `/admin`
- **Files touched:** `frontend/src/features/dashboard/`, `frontend/src/features/organizations/`, `frontend/src/services/dashboard/`, `frontend/src/components/shared/`
- **Depends on:** `TASK-907`, `TASK-906`
- **Spec:** `PRD.md` Sections `5.4`, `6.12`; `schema.yaml` audit endpoints when added
- **Setup reference:** Extend the existing admin dashboard rather than creating a detached audit screen
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Admin-facing oversight views expose the audit and moderation information needed by V1
- **Blockers:** None
- **Description:** Finish Phase 9 by surfacing audit history, moderation outcomes, and governance activity inside `/admin`. The result should let admins inspect what happened, who acted, and what changed without leaving the existing oversight workspace.

### Phase 9 Definition of Done

- The existing actor workspaces at `/dashboard`, `/org`, and `/admin` are live-data driven rather than stitched together from isolated fetches.
- Essential notifications exist as stored in-app records, integrate with the existing realtime shell behavior, and use the Resend helper for email delivery where the workflow requires email.
- Admin moderation, taxonomy governance, and audit logging are operational inside the existing admin workspace.

### Phase 9 Known Blockers / Risks

- None yet.

## Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery

Goal:
At the end of this phase, the remaining deferred PRD features are no longer treated only as extension points. The platform has an explicit execution path for AI provider setup, AI-assisted recommendations and guidance, richer creator workflows, community and certificate systems, cognitive monitoring, advanced analytics, and a final PRD coverage closure.

### TASK-1000: Scaffold AI Provider Foundation and Verification Tools
- **Phase:** Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery
- **Status:** Complete
- **Owner:** Backend
- **Actor(s):** Admin
- **Route(s):** `/admin`
- **Files touched:** `backend/apps/ai/`, `backend/config/settings/`, `backend/config/urls.py`, `backend/.env.example`, `backend/.env`, `schema.yaml`, `Agent Tasks.md`
- **Depends on:** `TASK-101`, `TASK-104`
- **Spec:** `PRD.md` Sections `6.6`, `6.11`; OpenRouter provider behavior should follow the official API docs
- **Setup reference:** Use `Agents/future improvements.md` sections `AI Provider Foundation` and `Recommendation and Matching Expansion`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** The backend has a dedicated `apps.ai` provider abstraction, Django settings read OpenRouter config and feature flags cleanly, and developers/admins have a lightweight way to verify provider readiness without exposing secrets client-side
- **Blockers:** None
- **Description:** Create the backend AI foundation required before recommendation or adaptive features are implemented. This task should add the reusable provider layer, OpenRouter environment settings and defaults, a protected health/test surface or management command for future provider checks, and enough structure that later AI tasks can build on a stable contract instead of embedding direct API calls.

### TASK-1001: Establish AI Provider Foundation with OpenRouter
- **Phase:** Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery
- **Status:** Complete
- **Owner:** Both
- **Actor(s):** Regular User, Organization, Admin
- **Route(s):** `/dashboard`, `/discover`, `/skill-swap`, `/courses/:id`, `/org`, `/admin`
- **Files touched:** `backend/apps/ai/`, `backend/apps/common/`, `backend/config/settings/`, `backend/.env.example`, `frontend/src/lib/`, `frontend/src/services/`, `backend/BACKEND_SETUP.md`, `Agents/future improvements.md`, `schema.yaml`
- **Depends on:** `TASK-1000`, `TASK-102`, `TASK-103`
- **Spec:** `PRD.md` Sections `4.2`, `6.6`, `6.11`
- **Setup reference:** Use `Agents/future improvements.md` section `AI Provider Foundation`; preserve existing backend/frontend setup documents rather than redefining package rationale elsewhere
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** The provider foundation from `TASK-1000` is extended into feature-ready AI rollout controls, fallback contracts, and shared frontend/backend integration rules
- **Blockers:** None
- **Description:** Build on the initial backend provider setup so AI capabilities can be turned on per feature safely. This task should define shared AI contracts, fallback handling expectations, rollout controls, and frontend/backend integration rules that later recommendation and adaptive tasks can consume without rewriting the provider layer.

### TASK-1002: Build AI-Assisted Recommendation and Matching Backend
- **Phase:** Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery
- **Status:** Complete
- **Owner:** Backend
- **Actor(s):** Regular User, Organization, Admin
- **Route(s):** `/discover`, `/dashboard`, `/skill-swap`, `/courses/:id`, `/jobs/:id`, `/events/:id`, `/admin`
- **Files touched:** `backend/apps/ai/`, `backend/apps/skills/`, `backend/apps/swaps/`, `backend/apps/courses/`, `backend/apps/opportunities/`, `backend/apps/events/`, `backend/apps/dashboards/`, `backend/apps/common/`, `schema.yaml`
- **Depends on:** `TASK-401`, `TASK-901`, `TASK-1001`
- **Spec:** `PRD.md` Sections `4.2`, `6.3`, `6.6`
- **Setup reference:** Use `Agents/future improvements.md` sections `Recommendation and Matching Expansion` and `AI Provider Foundation`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** The backend can generate AI-assisted peer, skill, course, event, and opportunity recommendations with at least one explainable rationale and graceful fallback to non-AI logic
- **Blockers:** None
- **Description:** Extend the current deterministic matching foundation into an AI-assisted recommendation service that uses structured platform signals across profiles, skills, enrollments, swaps, events, and opportunities. Recommendations must remain explainable, must not bypass existing trust/access rules, and must degrade cleanly to heuristic or cached recommendations when AI is unavailable.

### TASK-1003: Surface AI Recommendations and Cross-Module Discovery in Frontend
- **Phase:** Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Regular User, Organization, Admin
- **Route(s):** `/discover`, `/dashboard`, `/skill-swap`, `/courses/:id`, `/jobs`, `/events`, `/admin`
- **Files touched:** `frontend/src/features/dashboard/`, `frontend/src/features/skills/`, `frontend/src/features/courses/`, `frontend/src/features/jobs/`, `frontend/src/features/events/`, `frontend/src/services/`, `frontend/src/hooks/`, `frontend/src/components/shared/`
- **Depends on:** `TASK-1002`
- **Spec:** `PRD.md` Sections `4.2`, `6.6`
- **Setup reference:** Use `Agents/future improvements.md` sections `Recommendation and Matching Expansion` and `AI Provider Foundation`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Users can see AI-assisted recommendations and field-aware discovery feeds across relevant surfaces, with visible rationale and no blocking dependence on AI availability
- **Blockers:** None
- **Description:** Bring the recommendation layer into the product experience. This includes discover feeds, dashboard recommendation sections, skill-swap and peer-suggestion entry points, and recommendation rationale UI that explains why a course, peer, event, or opportunity was suggested.

### TASK-1004: Add AI Learning Guidance, Skill-Gap Analysis, and Assignment Feedback
- **Phase:** Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery
- **Status:** Complete
- **Owner:** Both
- **Actor(s):** Regular User, Organization, Admin
- **Route(s):** `/courses/:id`, `/dashboard`, `/org`, `/admin`
- **Files touched:** `backend/apps/ai/`, `backend/apps/courses/`, `backend/apps/reviews/`, `backend/apps/dashboards/`, `frontend/src/features/courses/`, `frontend/src/features/dashboard/`, `frontend/src/services/`, `schema.yaml`
- **Depends on:** `TASK-706`, `TASK-1001`, `TASK-1002`
- **Spec:** `PRD.md` Sections `4.2`, `6.5`, `6.6`
- **Setup reference:** Use `Agents/future improvements.md` section `Learning Guidance and Feedback`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** The platform can provide AI-assisted learning guidance, future-ready assignment feedback, and skill-gap insights that fit inside the existing course and dashboard workflows
- **Blockers:** None
- **Description:** Implement the learning-intelligence side of the PRD. This task should connect course participation, profile data, and structured skill data into learner guidance that helps users understand what to improve, what to study next, and how current activity relates to future goals.

### TASK-1005: Expand Course Creation for Regular Users and Richer Creator Operations
- **Phase:** Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery
- **Owner:** Both
- **Actor(s):** Regular User, Organization, Admin
- **Route(s):** `/course-builder`, `/dashboard`, `/org`, `/admin`, `/courses/:id`
- **Files touched:** `backend/apps/courses/`, `backend/apps/common/`, `frontend/src/features/courses/`, `frontend/src/features/dashboard/`, `frontend/src/services/courses/`, `ROLE_ACCESS_MATRIX.md`, `schema.yaml`
- **Depends on:** `TASK-706`, `TASK-104`
- **Spec:** `PRD.md` Sections `4.2`, `6.5`
- **Setup reference:** Use `Agents/future improvements.md` section `Remaining Deferred Product Areas`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Regular-user course creation, free-only creator rules, and richer content operations exist without breaking the organization monetization model or admin oversight model
- **Blockers:** None
- **Description:** Deliver the deferred creator-side course roadmap. This task should expand course authoring so regular users can create allowed course types under the PRD rules, while keeping organization-only monetization boundaries, richer content operations, and admin governance intact.

### TASK-1006: Build Community, Service-Credit, and Certificate Systems
- **Phase:** Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery
- **Status:** Complete
- **Owner:** Both
- **Actor(s):** Regular User, Organization, Admin
- **Route(s):** `/communities`, `/events`, `/events/:id`, `/courses/:id`, `/dashboard`, `/org`, `/admin`, `/certificates`, `/certificates/:id`
- **Files touched:** `backend/apps/communities/`, `backend/apps/events/`, `backend/apps/organizations/`, `backend/apps/notifications/`, `backend/apps/certificates/`, `backend/apps/common/`, `frontend/src/features/`, `frontend/src/services/`, `ROLE_ACCESS_MATRIX.md`, `schema.yaml`
- **Depends on:** `TASK-801`, `TASK-809`, `TASK-906`
- **Spec:** `PRD.md` Sections `4.2`, `6.1`, `6.8`, `6.10`
- **Setup reference:** Use `Agents/future improvements.md` section `Remaining Deferred Product Areas`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Community groups, service-credit records, organization-side trust/verification expansion, verified participation evidence, and certificate issuance/lookup flows exist with actor-safe routing and governance
- **Blockers:** None
- **Description:** Deliver the deferred collaboration and trust-signal areas from the PRD. This includes community spaces beyond one-to-one swaps, organization-run service or participation records, stronger organization-side verification and trust workflows where needed, and verified certificates with lookup paths and governance.

### TASK-1007: Build Cognitive Monitoring Foundation, Consent, and Privacy Controls Backend
- **Phase:** Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery
- **Owner:** Backend
- **Status:** Complete
- **Actor(s):** Regular User, Admin
- **Route(s):** `/dashboard`, `/courses/:id`, `/messages`, `/admin`
- **Files touched:** `backend/apps/ai/`, `backend/apps/common/`, `backend/apps/dashboards/`, `backend/config/settings/`, `schema.yaml`, `DEFINITION_OF_DONE.md`
- **Depends on:** `TASK-1001`, `TASK-503`, `TASK-506`
- **Spec:** `PRD.md` Sections `4.3`, `6.7`, `6.11`
- **Setup reference:** Use `Agents/future improvements.md` section `Cognitive Monitoring Guardrails`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Adaptive monitoring has an explicit backend foundation with consent records, disclosure-ready contracts, signal-policy limits, auditability, and non-camera-dependent defaults
- **Blockers:** None
- **Description:** Build the backend governance and contract foundation required before adaptive monitoring features are activated. This task should define what signals are permitted, how users opt in, how sensitive data is minimized and protected, how consent is stored and revoked, and what schema/API surface later frontend work must consume.

### TASK-1007-FE: Build Cognitive Monitoring Consent and Privacy Frontend
- **Phase:** Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery
- **Owner:** Frontend
- **Status:** Complete
- **Actor(s):** Regular User, Admin
- **Route(s):** `/dashboard`, `/courses/:id`, `/messages`, `/admin`
- **Files touched:** `frontend/src/features/dashboard/`, `frontend/src/features/courses/`, `frontend/src/components/shared/`, `frontend/src/services/`, `ROLE_ACCESS_MATRIX.md`
- **Depends on:** `TASK-1007`
- **Spec:** `PRD.md` Sections `4.3`, `6.7`, `6.11`; `schema.yaml` cognitive-monitoring consent endpoints when added
- **Setup reference:** Use `Agents/future improvements.md` section `Cognitive Monitoring Guardrails`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Users can see disclosure, consent, transparency, and privacy controls for adaptive monitoring without hidden assumptions about camera analysis
- **Blockers:** None
- **Description:** Build the frontend disclosure and consent experience on top of `TASK-1007`. This includes opt-in UI, signal transparency, revocation controls, and admin-safe visibility that matches the backend privacy contract rather than inventing new behavior in the client.

### TASK-1008: Implement Focus Drift, Mood Mirror, and Adaptive Responses Backend
- **Phase:** Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery
- **Owner:** Backend
- **Status:** Complete
- **Actor(s):** Regular User, Admin
- **Route(s):** `/dashboard`, `/courses/:id`, `/messages`, `/admin`
- **Files touched:** `backend/apps/ai/`, `backend/apps/dashboards/`, `backend/apps/courses/`, `backend/apps/common/`, `schema.yaml`
- **Depends on:** `TASK-1007`
- **Spec:** `PRD.md` Sections `4.3`, `6.7`
- **Setup reference:** Use `Agents/future improvements.md` section `Cognitive Monitoring Guardrails`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** The backend can generate opt-in focus drift, mood mirror, and adaptive-response outputs using approved signals with explainable state and safe fallback behavior
- **Blockers:** None
- **Description:** Deliver the backend adaptive learning engine after the privacy foundation exists. This task should implement the actual signal processing, bounded inference, explainable outputs, and API contracts that help users re-focus or reflect without making camera analysis a hidden assumption.

### TASK-1008-FE: Implement Focus Drift, Mood Mirror, and Adaptive Responses Frontend
- **Phase:** Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery
- **Owner:** Frontend
- **Status:** Complete
- **Actor(s):** Regular User, Admin
- **Route(s):** `/dashboard`, `/courses/:id`, `/messages`, `/admin`
- **Files touched:** `frontend/src/features/dashboard/`, `frontend/src/features/courses/`, `frontend/src/services/`, `frontend/src/hooks/`, `frontend/src/components/shared/`
- **Depends on:** `TASK-1008`, `TASK-1007-FE`
- **Spec:** `PRD.md` Sections `4.3`, `6.7`; `schema.yaml` adaptive-monitoring endpoints when added
- **Setup reference:** Use `Agents/future improvements.md` section `Cognitive Monitoring Guardrails`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Focus drift detection and the learning mood mirror are surfaced as understandable, opt-in adaptive tools with clear user-facing behavior
- **Blockers:** None
- **Description:** Deliver the user-facing adaptive learning experience after the backend engine and consent surfaces exist. This includes in-product prompts, adaptive-response UI, explanation copy, and safe empty/error states that match the backend outputs.

### TASK-1008-FE-A: Define Shared Detail-Page Tab Pattern for Multi-Panel Modules
- **Phase:** Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery
- **Owner:** Frontend
- **Status:** Complete
- **Actor(s):** Guest, Regular User, Organization, Admin
- **Route(s):** `/courses/:id`, `/events/:id`, `/jobs/:id`, `/messages`
- **Files touched:** `frontend/src/components/shared/`, `frontend/src/hooks/dashboard/`, `frontend/src/app/routes.jsx`, `frontend/FRONTEND_PRD_READY.md`
- **Depends on:** `TASK-1008-FE`
- **Spec:** `PRD.md` Sections `4.1`, `4.2`, `4.3`, `6.5`, `6.7`; `schema.yaml` existing detail endpoints remain the source of truth for data shapes
- **Setup reference:** Reuse `WorkspaceShell`, `useWorkspaceTab`, and existing actor-safe route structure; see `Agents/future improvements.md` section `Cognitive Monitoring Guardrails`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** A reusable tab/query-param navigation pattern exists for detail pages so auxiliary tools do not stack endlessly above or below the core module content
- **Blockers:** None
- **Description:** Establish the shared frontend pattern we will use for module detail pages that now contain multiple independent panels. This task defines the tab behavior, default active tab rules, mobile handling, query-param or route-state convention, and visual hierarchy so later pages can adopt one consistent navigation-first structure instead of long stacked scrolling.

### TASK-1008-FE-B: Refactor Course Detail into Navigable Tabs
- **Phase:** Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery
- **Owner:** Frontend
- **Status:** Complete
- **Actor(s):** Guest, Regular User, Organization, Admin
- **Route(s):** `/courses/:id`
- **Files touched:** `frontend/src/features/courses/pages/CourseDetailPage.jsx`, `frontend/src/components/shared/`, `frontend/src/hooks/dashboard/`
- **Depends on:** `TASK-1008-FE-A`
- **Spec:** `PRD.md` Sections `4.2`, `4.3`, `6.5`, `6.7`; `schema.yaml` course detail, enrollment, recommendation, learning-guidance, and adaptive-monitoring endpoints already in use
- **Setup reference:** Use the frontend AI surfaces already introduced in `TASK-1003`, `TASK-1004`, and `TASK-1008-FE`; see `Agents/future improvements.md` sections `Learning Guidance and Feedback` and `Cognitive Monitoring Guardrails`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** The course page defaults to a course-detail tab and moves AI/support surfaces into their own navigable tabs so learners do not need to scroll through every panel in one column
- **Blockers:** None
- **Description:** Rework `/courses/:id` so the main course detail remains the default first tab and the auxiliary surfaces each live behind clear navigation. At minimum, course details/content should stop competing with `Recommended next moves`, `Course learning guidance`, and `Course focus mirror` in one long stacked column. Preserve existing backend behavior and actor restrictions while improving readability and discoverability.

### TASK-1008-FE-C: Apply the Same Tabbed Detail Pattern to Event and Job Modules
- **Phase:** Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery
- **Owner:** Frontend
- **Status:** Complete
- **Actor(s):** Guest, Regular User, Organization, Admin
- **Route(s):** `/events/:id`, `/jobs/:id`
- **Files touched:** `frontend/src/features/events/pages/EventDetailPage.jsx`, `frontend/src/features/jobs/pages/JobDetailPage.jsx`, `frontend/src/components/shared/`
- **Depends on:** `TASK-1008-FE-A`
- **Spec:** `PRD.md` Sections `4.1`, `4.2`, `6.8`; `schema.yaml` event-detail, RSVP, opportunity-detail, and application endpoints
- **Setup reference:** Reuse the shared detail-page tab pattern from `TASK-1008-FE-A`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Event and job detail pages separate overview information from action-heavy or supplemental sections so those modules remain readable as more capability is added
- **Blockers:** None
- **Description:** Apply the same navigation-first detail-page structure to events and opportunities before those pages grow further. Event pages should separate details, participation, and related verification/certificate context. Job pages should separate overview, requirements, and application workflow so the page remains scalable instead of becoming a single long document.

### TASK-1008-FE-D: Audit Remaining Stacked Module Surfaces and Normalize Navigation
- **Phase:** Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery
- **Owner:** Frontend
- **Status:** Complete
- **Actor(s):** Guest, Regular User, Organization, Admin
- **Route(s):** `/messages`, `/dashboard`, `/discover`, additional module surfaces identified during implementation
- **Files touched:** `frontend/src/features/messages/`, `frontend/src/features/dashboard/`, `frontend/src/features/skills/`, `frontend/src/components/shared/`, `ROLE_ACCESS_MATRIX.md`
- **Depends on:** `TASK-1008-FE-B`, `TASK-1008-FE-C`
- **Spec:** `PRD.md` Sections `4.1`, `4.2`, `4.3`, `6.6`, `6.7`, `6.11`
- **Setup reference:** Use the shared detail-page pattern from `TASK-1008-FE-A` and keep route ownership aligned with `ROLE_ACCESS_MATRIX.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Any remaining module surface that stacks auxiliary tools around a core workflow is either converted to clearer tabbed/sectional navigation or explicitly documented as intentionally single-flow
- **Blockers:** None
- **Description:** Perform a UX architecture sweep after the course, event, and job detail refactors land. The goal is to catch any remaining pages where AI tools, supporting panels, or secondary actions are still bolted onto the main flow in a way that makes the page tiring to use. This task should normalize the pattern and update route/access notes where new tab affordances matter.

### TASK-1008-FE-E: Audit Non-Detail User-Facing Pages for Progressive Disclosure
- **Phase:** Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery
- **Owner:** Frontend
- **Status:** Complete
- **Actor(s):** Guest, Regular User, Organization, Admin
- **Route(s):** `/dashboard`, `/org`, `/admin`, `/discover`, `/courses`, `/events`, `/jobs`, `/communities`, `/certificates`, additional user-facing list/workspace routes identified during implementation
- **Files touched:** `frontend/src/features/dashboard/`, `frontend/src/features/organizations/`, `frontend/src/features/skills/`, `frontend/src/features/courses/`, `frontend/src/features/events/`, `frontend/src/features/jobs/`, `frontend/src/features/communities/`, `frontend/src/features/certificates/`, `frontend/src/components/shared/`, `ROLE_ACCESS_MATRIX.md`
- **Depends on:** `TASK-1008-FE-D`
- **Spec:** `PRD.md` Sections `4.1`, `4.2`, `4.3`, `6.5`, `6.6`, `6.8`, `6.9`, `6.11`
- **Setup reference:** Use the tabs-first and progressive-disclosure rule established under `TASK-1008-FE-A` through `TASK-1008-FE-D`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Every important user-facing non-detail surface is reviewed for whether it reveals information progressively through tabs, cards, expandable sections, or workspace navigation instead of dumping everything at once
- **Blockers:** None
- **Description:** Extend the UX audit beyond detail pages. This task should review browse pages, dashboards, operator workspaces, list pages, and trust/certificate/community surfaces so the platform does not regress into overwhelming “everything visible immediately” layouts. The output should identify which pages already satisfy the rule and which still need restructuring work.

### TASK-1008-FE-F: Normalize Non-Detail User-Facing Pages with Tabs, Cards, and Progressive Disclosure
- **Phase:** Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery
- **Owner:** Frontend
- **Status:** Complete
- **Actor(s):** Guest, Regular User, Organization, Admin
- **Route(s):** `/dashboard`, `/org`, `/admin`, `/discover`, `/courses`, `/events`, `/jobs`, `/communities`, `/certificates`, plus additional non-detail routes confirmed by `TASK-1008-FE-E`
- **Files touched:** `frontend/src/features/dashboard/`, `frontend/src/features/organizations/`, `frontend/src/features/skills/`, `frontend/src/features/courses/`, `frontend/src/features/events/`, `frontend/src/features/jobs/`, `frontend/src/features/communities/`, `frontend/src/features/certificates/`, `frontend/src/components/shared/`, `ROLE_ACCESS_MATRIX.md`, `frontend/FRONTEND_PRD_READY.md`
- **Depends on:** `TASK-1008-FE-E`
- **Spec:** `PRD.md` Sections `4.1`, `4.2`, `4.3`, `6.5`, `6.6`, `6.8`, `6.9`, `6.11`
- **Setup reference:** Use `ModuleDetailShell`, `WorkspaceShell`, and the shared progressive-disclosure rule from `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** User-facing non-detail pages are intentionally structured so people reveal what they need when they need it through tabs, cards, summaries, drill-downs, or expandable sections rather than long undifferentiated content stacks
- **Blockers:** None
- **Description:** Implement the non-detail-page UX cleanup after the audit. Prioritize the pages confirmed by `TASK-1008-FE-E`: `/events` and `/jobs`, where personalized recommendation feeds currently compete with the main browse/filter flow on the same page, and `/certificates`, where public lookup and authenticated record management currently share one surface. Keep `/dashboard`, `/org`, and `/admin` on the existing workspace-shell model, keep `/courses` as an intentionally single-purpose catalog unless new competing subflows are added, and preserve `/communities` as a scoped master/detail experience unless new secondary tools make tabs necessary. Use tabs where multiple major subflows compete, use cards or summaries where a lighter structure is enough, and keep “show everything immediately” layouts out of the product unless a page is intentionally single-purpose.


<!-- Make sure you update the frontend tasks to adpat to tab related approch -->
### TASK-1009: Deliver Advanced Analytics, Matching-Quality Monitoring, and System Health Backend
- **Phase:** Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery
- **Owner:** Backend
- **Status:** Complete
- **Actor(s):** Organization, Admin
- **Route(s):** `/dashboard`, `/org`, `/admin`, `/discover`
- **Files touched:** `backend/apps/dashboards/`, `backend/apps/ai/`, `backend/apps/common/`, `schema.yaml`
- **Depends on:** `TASK-901`, `TASK-908`, `TASK-1002`, `TASK-1007`
- **Spec:** `PRD.md` Sections `4.3`, `6.6`, `6.7`, `6.11`
- **Setup reference:** Use `Agents/future improvements.md` sections `Recommendation and Matching Expansion` and `Remaining Deferred Product Areas`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Organization and admin analytics APIs include stronger reporting, matching-quality visibility, adaptive-signal visibility, and system-health style monitoring required by the PRD roadmap
- **Blockers:** None
- **Description:** Deliver the backend intelligence and oversight analytics that turn recommendations and adaptive behavior into measurable, governable system capabilities rather than opaque background logic. This task should explicitly cover social impact heatmaps, active video-session analytics where applicable, global knowledge analytics, matching-quality monitoring, and broader automation or predictive-insight contracts required by the PRD roadmap.

### TASK-1009-FE: Deliver Advanced Analytics, Matching-Quality Monitoring, and System Health Frontend
- **Phase:** Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Organization, Admin
- **Route(s):** `/dashboard`, `/org`, `/admin`, `/discover`
- **Files touched:** `frontend/src/features/dashboard/`, `frontend/src/features/organizations/`, `frontend/src/services/dashboard/`, `frontend/src/components/shared/`
- **Depends on:** `TASK-1009`, `TASK-1008-FE-A`
- **Spec:** `PRD.md` Sections `4.3`, `6.6`, `6.7`, `6.11`; `schema.yaml` analytics endpoints when added
- **Setup reference:** Use `Agents/future improvements.md` sections `Recommendation and Matching Expansion`, `Cognitive Monitoring Guardrails`, and `Remaining Deferred Product Areas`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Organization and admin dashboards expose the analytics, matching-quality monitoring, adaptive-signal visibility, and system-health views required by the PRD roadmap through tabs, card summaries, drill-downs, or workspace sections instead of collapsing those operator surfaces into stacked, hard-to-scan page sections
- **Blockers:** None
- **Description:** Build the frontend analytics surfaces on top of `TASK-1009` so operators can actually use the new reporting and monitoring layer. This includes charts, summaries, drill-downs, explanation states, and actor-safe visibility rules. Any new heavy dashboard or detail surfaces introduced here must follow the shared tabs-first navigation rule from `TASK-1008-FE-A`, using card summaries and drill-down states where a full tab split is not needed, instead of appending more content into existing long pages.

### TASK-1010: Add Community-Service Monetization and Advanced Payment Automation Backend
- **Phase:** Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery
- **Status:** Complete
- **Owner:** Backend
- **Actor(s):** Regular User, Organization, Admin
- **Route(s):** `/courses/:id`, `/dashboard`, `/org`, `/admin`, `/payments`
- **Files touched:** `backend/apps/payments/`, `backend/apps/courses/`, `backend/apps/events/`, `backend/apps/organizations/`, `backend/apps/common/`, `schema.yaml`
- **Depends on:** `TASK-703`, `TASK-704`, `TASK-1006`
- **Spec:** `PRD.md` Sections `4.3`, `6.8`, `6.9`, `6.10`
- **Setup reference:** Use `Agents/future improvements.md` sections `Remaining Deferred Product Areas` and `Extra Requested Ideas Outside Current PRD Core`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Paid community-service offerings and their advanced payment or monetization workflow requirements are explicitly supported in backend rules, contracts, and automation flows
- **Blockers:** None
- **Description:** Deliver the backend PRD roadmap area where community-service offerings intersect with payments. This task should cover paid community-service course support, advanced monetization automation needed for those offerings, and the required operator/audit visibility for organizations and admins.

### TASK-1010-FE: Add Community-Service Monetization and Advanced Payment Automation Frontend
- **Phase:** Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery
- **Status:** Complete
- **Owner:** Frontend
- **Actor(s):** Regular User, Organization, Admin
- **Route(s):** `/courses/:id`, `/dashboard`, `/org`, `/admin`, `/payments`
- **Files touched:** `frontend/src/features/courses/`, `frontend/src/features/dashboard/`, `frontend/src/features/organizations/`, `frontend/src/services/payments/`
- **Depends on:** `TASK-1010`, `TASK-1008-FE-A`
- **Spec:** `PRD.md` Sections `4.3`, `6.8`, `6.9`, `6.10`; `schema.yaml` payment and community-service monetization endpoints when added
- **Setup reference:** Use `Agents/future improvements.md` sections `Remaining Deferred Product Areas`, `Extra Requested Ideas Outside Current PRD Core`, and the shared detail-page rule established in `TASK-1008-FE-A`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Users, organizations, and admins can operate the paid community-service workflow through frontend surfaces that match the backend monetization rules and slot into scalable tabs, card-based workflow summaries, drill-down views, or workspace sections rather than cluttering existing pages
- **Blockers:** None
- **Description:** Build the frontend operator and learner experience on top of `TASK-1010`. This includes checkout-adjacent UI, payment state visibility, organization/admin workflow surfaces, and actor-safe messaging for community-service monetization behavior. Any course, dashboard, or operator page touched here should use the shared tabs-first module pattern where multiple major flows compete, and otherwise use card summaries with intentional drill-downs so the experience does not regress into a stacked list of payment and governance panels.

### TASK-1011: Run Final PRD Coverage Audit and Deferred-Feature Closure Backend
- **Phase:** Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery
- **Owner:** Backend
- **Actor(s):** Guest, Regular User, Organization, Admin
- **Route(s):** All routes in `ROLE_ACCESS_MATRIX.md` plus future additions that must be added there first
- **Files touched:** `Agent Tasks.md`, `Agents/future improvements.md`, `BLOCKERS.md`, `ROLE_ACCESS_MATRIX.md`, `schema.yaml`, `DEFINITION_OF_DONE.md`
- **Depends on:** `TASK-1003`, `TASK-1004`, `TASK-1005`, `TASK-1006`, `TASK-1007`, `TASK-1008`, `TASK-1009`, `TASK-1010`
- **Spec:** `PRD.md` Sections `3` through `7`
- **Setup reference:** Use `Agents/future improvements.md` as the companion source for Phase 10 deferred and advanced features
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Every remaining backend/API contract in the PRD is either implemented in this phase or explicitly re-mapped with no silent omissions, and the coverage checklist stays accurate
- **Blockers:** None
- **Description:** Close the backend and contract side of the PRD loop after the remaining roadmap work lands. This task should update the task map, route matrix, blockers, schema, and governance docs so backend/system coverage can be claimed without ambiguous leftovers.

### TASK-1011-FE: Run Final PRD Coverage Audit and Deferred-Feature Closure Frontend
- **Phase:** Phase 10: Intelligence, Adaptive Features, and Remaining PRD Delivery
- **Owner:** Frontend
- **Actor(s):** Guest, Regular User, Organization, Admin
- **Route(s):** All routes in `ROLE_ACCESS_MATRIX.md` plus future additions that must be added there first
- **Files touched:** `Agent Tasks.md`, `Agents/future improvements.md`, `BLOCKERS.md`, `ROLE_ACCESS_MATRIX.md`, `DEFINITION_OF_DONE.md`
- **Depends on:** `TASK-1011`, `TASK-1007-FE`, `TASK-1008-FE`, `TASK-1008-FE-A`, `TASK-1009-FE`, `TASK-1010-FE`
- **Spec:** `PRD.md` Sections `3` through `7`
- **Setup reference:** Use `Agents/future improvements.md` as the companion source for Phase 10 deferred and advanced features, including the tabs-first navigation rule introduced under `TASK-1008-FE-A`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Every remaining frontend or actor-surface PRD requirement is either implemented in this phase or explicitly re-mapped with no silent omissions, the coverage checklist stays accurate, and no newly added module surface regresses into stacked-panel UX where tabs, card summaries, drill-downs, or workspace navigation are required
- **Blockers:** None
- **Description:** Close the frontend and actor-surface side of the PRD loop after the remaining roadmap work lands. This task should reconcile the task map, role matrix, blockers, and governance docs so UI/route coverage can be claimed without ambiguous leftovers. The final audit must also enforce the shared navigation rule across both detail and non-detail pages so feature growth does not quietly turn key surfaces back into endless vertical stacks when they should instead use tabs, card summaries, drill-downs, or workspace navigation.

### Phase 10 Definition of Done

- AI provider setup, recommendation features, and learning-guidance features are explicitly planned through implementation-ready tasks rather than vague future hooks.
- Cognitive monitoring, analytics, monetization, and final-closure work are sequenced backend-first and frontend-second so implementation does not drift across layers.
- Regular-user course creation, community/service systems, certificates, and advanced analytics all have explicit task coverage.
- The PRD-to-task coverage checklist remains complete and no deferred PRD feature is left unmapped.

### Phase 10 Known Blockers / Risks

- OpenRouter free-model availability, quotas, or provider behavior may change and must not become a hard dependency for core workflows.
- Adaptive and cognitive features require careful privacy, disclosure, and consent decisions before implementation is considered complete.
- Community, certificate, and advanced analytics features may introduce new domain apps, routes, and schema surface area that must be reflected in `OWNERSHIP.md`, `ROLE_ACCESS_MATRIX.md`, and `schema.yaml`.

## PRD-to-Task Coverage Checklist

Every PRD feature or rule below maps to at least one task ID.

### Actors, roles, and trust model

- Guest browsing and protected/public split: `TASK-104`, `TASK-201`, `TASK-206`
- Regular User actor model: `TASK-104`, `TASK-301`, `TASK-401`
- Organization actor model and separate onboarding: `TASK-204`, `TASK-205`, `TASK-303`
- Admin actor model and oversight: `TASK-104`, `TASK-905`, `TASK-908`
- Organization type field: `TASK-303`
- Verification trust states `Unverified` and `Verified`: `TASK-105`, `TASK-303`, `TASK-601`, `TASK-602`
- Verification visible in trust-sensitive contexts: `TASK-105`, `TASK-304`, `TASK-602`, `TASK-704`, `TASK-802`
- Organizations begin `Unverified`: `TASK-303`, `TASK-601`
- Admin manual override for verification: `TASK-601`, `TASK-905`
- Monetization requires verification and financial setup: `TASK-105`, `TASK-606`, `TASK-701`, `TASK-704`

### Identity, authentication, and access control

- Create account, sign in, sign out, reset password: `TASK-202`, `TASK-203`
- Email verification before protected trust-sensitive workflows: `TASK-202`, `TASK-203`, `TASK-903`
- Dedicated organization onboarding path: `TASK-204`, `TASK-205`
- Regular users do not convert into organizations in V1: `TASK-204`, `TASK-205`
- Access rules enforced server-side: `TASK-104`, `TASK-206`
- Frontend protected route enforcement: `TASK-104`, `TASK-203`, `TASK-206`
- Stronger admin security baseline: `TASK-206`
- MFA future path: `TASK-1011`, `TASK-1011-FE`

### Profile and skill graph

- Regular-user profiles with bio/interests/experience: `TASK-301`, `TASK-302`
- Field-interest declarations across modules: `TASK-301`, `TASK-302`, `TASK-806`
- Skills as offering/requesting/both: `TASK-301`, `TASK-302`
- Regular-user profiles not public: `TASK-305`
- Organization public profiles with trust state: `TASK-303`, `TASK-304`
- Organization minimum registration fields and optional business license upload: `TASK-204`, `TASK-205`, `TASK-303`, `TASK-602`
- Structured profile data supporting matching, recommendations, reporting: `TASK-103`, `TASK-301`, `TASK-401`, `TASK-806`, `TASK-901`

### Skill discovery, matching, and swaps

- Compatible user discovery: `TASK-401`, `TASK-402`
- Swap request lifecycle: `TASK-403`, `TASK-404`
- Swap status history: `TASK-403`, `TASK-404`
- Swap flow stays free forever: `TASK-405`
- Matching extensible toward AI/ML later: `TASK-401`, `TASK-405`, `TASK-1001`

### Ratings and reviews

- Post-participation ratings for skill swaps: `TASK-507`, `TASK-508`
- Post-participation ratings for courses: `TASK-507`, `TASK-508`, `TASK-706`
- Post-participation ratings for events: `TASK-507`, `TASK-508`, `TASK-809`

### Messaging, coordination, and sessions

- In-platform chat: `TASK-501`, `TASK-502`
- Resource sharing in chat: `TASK-501`, `TASK-502`
- Live or progressive realtime coordination: `TASK-503`, `TASK-504`
- Session scheduling/planning: `TASK-505`, `TASK-506`
- Planned and completed session records: `TASK-505`, `TASK-506`
- Demo-ready session delivery with external link fallback: `TASK-506`
- In-platform video left extensible but not required for V1: `TASK-503`, `TASK-506`, `TASK-1009`, `TASK-1009-FE`

### Courses, programs, and learning content

- Organization-created courses/programs: `TASK-603`, `TASK-604`
- Modules, lessons, videos, resources, checklists, assessments: `TASK-603`, `TASK-604`
- Progression-gated assessments and advancement: `TASK-605`, `TASK-705`, `TASK-706`
- Regular users browse and enroll in eligible programs: `TASK-704`, `TASK-705`, `TASK-706`
- Participation and progress tracking: `TASK-705`, `TASK-706`
- Unverified organizations limited to free programs: `TASK-606`, `TASK-701`, `TASK-704`
- Missing verification blocks paid create/edit: `TASK-606`
- Visible paid course before finance setup but enrollment blocked: `TASK-701`, `TASK-702`, `TASK-704`
- UI must show `Enrollment Unavailable`: `TASK-105`, `TASK-704`
- Regular-user course creation deferred but preserved: `TASK-1005`

### Payments, finance, and monetization

- Financial account setup for verified organizations: `TASK-701`, `TASK-702`
- Currency-aware pricing: `TASK-703`, `TASK-704`
- Chapa-oriented payment flow: `TASK-703`, `TASK-704`
- Enrollment reconciliation and payment follow-up: `TASK-703`, `TASK-705`
- Paid community-service courses and advanced payment automation: `TASK-1010`, `TASK-1010-FE`

### AI assistance and recommendation layer

- Recommendation layer based on structured user data: `TASK-401`, `TASK-806`, `TASK-901`, `TASK-1002`
- Cross-module discovery signals: `TASK-103`, `TASK-301`, `TASK-806`, `TASK-1002`, `TASK-1003`
- Field-aware discovery feeds connecting courses, swaps, communities, events, and opportunities: `TASK-1002`, `TASK-1003`, `TASK-1006`
- Explainable rationale for matches/recommendations: `TASK-401`, `TASK-402`, `TASK-1002`, `TASK-1003`
- AI should not block core workflows: `TASK-102`, `TASK-503`, `TASK-1000`, `TASK-1001`, `TASK-1002`, `TASK-1003`
- Future skill-gap analysis and assignment feedback: `TASK-1004`

### Community, service, and collaboration

- Community interaction beyond one-to-one swaps preserved for later: `TASK-1006`
- Volunteer/social-impact/community-service initiatives preserved for later: `TASK-1006`, `TASK-1010`, `TASK-1010-FE`
- Field-based communities preserved for later: `TASK-1006`
- Only verified organizations create communities initially: `TASK-1006`
- Events can be created by organizations regardless of verification state: `TASK-801`, `TASK-807`, `TASK-808`
- Organizations can manage events after publishing: `TASK-807`, `TASK-808`
- Organizations can manage attendees and attendance records: `TASK-807`, `TASK-809`
- Event lifecycle state and RSVP-open control exist: `TASK-807`, `TASK-808`
- Event analytics and attendance totals exist for operators: `TASK-807`, `TASK-808`, `TASK-902`
- Regular users cannot create communities/events in V1: `TASK-206`, `TASK-801`
- Regular users RSVP/register for events in V1: `TASK-801`, `TASK-802`
- Service-credit tracking and verified participation foundations: `TASK-809`, `TASK-1006`
- Forums/projects/collaboration spaces progression: `TASK-1006`

### Career and opportunity hub

- Organizations publish opportunities: `TASK-803`, `TASK-804`
- Jobs/internships by organizations, not regular users: `TASK-206`, `TASK-803`
- Regular users apply inside the platform: `TASK-803`, `TASK-804`
- Applicant pipeline with applied/shortlisted/interview/hired: `TASK-803`, `TASK-805`
- Opportunity relevance tied to field/skills/courses/participation: `TASK-806`, `TASK-901`

### Certificates, verification, and trust signals

- Verified digital certificates preserved for later: `TASK-1006`
- Verified-org-only issuance rule preserved: `TASK-1006`
- Unique certificate ID and verification lookup path preserved: `TASK-1006`
- Extensible verification workflows: `TASK-601`, `TASK-1006`, `TASK-1011`, `TASK-1011-FE`

### Dashboards and analytics

- Regular-user dashboard: `TASK-901`, `TASK-902`
- Organization dashboard: `TASK-901`, `TASK-902`
- Applicant pipeline visibility in org dashboards: `TASK-805`, `TASK-902`
- Event management visibility and event analytics in org surfaces: `TASK-808`, `TASK-809`, `TASK-902`
- Admin dashboard: `TASK-901`, `TASK-902`, `TASK-908`
- Advanced analytics and reporting preserved for later: `TASK-1009`, `TASK-1009-FE`
- Social impact heatmaps, global knowledge analytics, and broader predictive insights: `TASK-1009`, `TASK-1009-FE`
- System health and matching-quality monitoring: `TASK-1009`, `TASK-1009-FE`

### Administration and moderation

- Admin management of users, organizations, content, roles, reports, moderation: `TASK-905`, `TASK-906`
- Admin oversight of published events: `TASK-810`
- Admin management of fixed category lists: `TASK-905`, `TASK-906`
- User/org category suggestions with approval before activation: `TASK-905`, `TASK-906`
- Audit-friendly important action records: `TASK-907`, `TASK-908`
- Future identity/compliance workflows preserved: `TASK-1011`, `TASK-1011-FE`

### Non-functional requirements

- Responsive web experience across mobile and desktop: `TASK-102`, `TASK-201`, `TASK-302`, `TASK-402`, `TASK-604`, `TASK-902`
- Secure auth, authorization, and session management: `TASK-101`, `TASK-104`, `TASK-202`, `TASK-206`
- Sensitive data protected in transit and trust-sensitive flows protected: `TASK-101`, `TASK-206`, `TASK-601`, `TASK-703`
- Privacy-preserving handling and limited unnecessary exposure: `TASK-305`, `TASK-602`, `TASK-1007`, `TASK-1007-FE`, `TASK-1008`, `TASK-1008-FE`
- Reliability of core records despite optional service failure: `TASK-503`, `TASK-505`, `TASK-705`, `TASK-907`
- Maintainable modular architecture for V2/V3: `TASK-103`, `TASK-1000`, `TASK-1001`, `TASK-1002`, `TASK-1005`, `TASK-1006`, `TASK-1007`, `TASK-1007-FE`, `TASK-1009`, `TASK-1009-FE`, `TASK-1011`, `TASK-1011-FE`
- Accessibility considered from V1: `TASK-102`, `TASK-201`, `TASK-302`, `TASK-604`, `TASK-902`

### Explicitly deferred but still tracked

- Regular-user course creation: `TASK-1005`
- Richer content management: `TASK-1005`
- AI-assisted recommendations and assignment feedback: `TASK-1002`, `TASK-1003`, `TASK-1004`
- Discussion forums and community groups: `TASK-1006`
- Verified digital certificates: `TASK-1006`
- Organization-side verification workflow expansion: `TASK-601`, `TASK-1006`
- Stronger analytics/reporting: `TASK-1009`, `TASK-1009-FE`
- Focus drift detection and mood mirror: `TASK-1007`, `TASK-1007-FE`, `TASK-1008`, `TASK-1008-FE`
- Advanced career matching and ecosystem intelligence: `TASK-1002`, `TASK-1009`, `TASK-1009-FE`
- Social impact heatmaps, active video-session analytics, and global knowledge analytics: `TASK-1009`, `TASK-1009-FE`
- Paid community-service courses and broader monetization automation: `TASK-1010`, `TASK-1010-FE`

## Unmapped PRD Items

None currently.
