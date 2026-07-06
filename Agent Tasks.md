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

Also treat these as source-of-truth where they already cover a decision:

- [PRD.md](./PRD.md)
- [backend/BACKEND_SETUP.md](./backend/BACKEND_SETUP.md)
- [frontend/FRONTEND_PRD_READY.md](./frontend/FRONTEND_PRD_READY.md)
- [SCHEMA.md](./SCHEMA.md)

Rules:

- Frontend and backend land together per feature within the same phase.
- Update [schema.yaml](./schema.yaml) whenever an endpoint changes.
- Update [BLOCKERS.md](./BLOCKERS.md) whenever a task becomes blocked.
- Use the PRD coverage checklist at the bottom to ensure nothing is dropped.
- For backend email work, use the shared helper in `backend/apps/common/email.py` so all outbound email stays on the project's Resend-backed Django email path.

## Phase 1: Foundation, Contracts, and Runtime Boundaries

Goal:
At the end of this phase, both apps have stable foundations, shared contract rules, explicit actor boundaries, and implementation-ready runtime wiring.

Status:
Complete

### TASK-101: Finalize Backend Platform Wiring
- **Phase:** Phase 1: Foundation, Contracts, and Runtime Boundaries
- **Owner:** Backend
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

### TASK-501: Implement Messaging Backend Contracts
- **Phase:** Phase 5: Messaging, Realtime Coordination, Sessions, and Reviews
- **Status:** Complete
- **Owner:** Backend
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
- **Owner:** Backend
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
- **Owner:** Frontend
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
- **Owner:** Backend
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
- **Owner:** Frontend
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
- **Owner:** Both
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
- **Owner:** Both
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

### TASK-701: Implement Financial Account Readiness Backend
- **Phase:** Phase 7: Payments, Enrollment, and Learning Progress
- **Owner:** Backend
- **Files touched:** `backend/apps/payments/`, `backend/apps/organizations/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-601`, `TASK-606`
- **Spec:** `PRD.md` Sections `3.1`, `4.1`, `6.5`, `8`
- **Setup reference:** Payment readiness rationale in `backend/BACKEND_SETUP.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Financial-account setup state exists and can gate monetization
- **Blockers:** None
- **Description:** Build the backend readiness model that decides whether a verified organization may accept paid enrollments.

### TASK-702: Build Financial Setup and Monetization Readiness UI
- **Phase:** Phase 7: Payments, Enrollment, and Learning Progress
- **Owner:** Frontend
- **Files touched:** `frontend/src/features/organizations/`, `frontend/src/features/courses/`, `frontend/src/services/organizations/`
- **Depends on:** `TASK-701`
- **Spec:** `PRD.md` Sections `5.3`, `6.5`; `schema.yaml` financial setup endpoints when added
- **Setup reference:** No extra payment UI package was added by design per `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Organization operators can see monetization readiness and learners can see blocked-vs-available enrollment state
- **Blockers:** None
- **Description:** Deliver the frontend visibility for finance setup readiness and enrollment gating.

### TASK-703: Implement Chapa-Oriented Payment Flow Backend
- **Phase:** Phase 7: Payments, Enrollment, and Learning Progress
- **Owner:** Backend
- **Files touched:** `backend/apps/payments/`, `backend/apps/courses/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-701`
- **Spec:** `PRD.md` Sections `4.1`, `6.5`
- **Setup reference:** Payment provider assumptions in `PRD.md` and `backend/BACKEND_SETUP.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Checkout initiation, price/currency handling, and post-payment enrollment readiness are contract-defined
- **Blockers:** None
- **Description:** Implement the backend payment contract for Chapa-oriented paid-course enrollment.

### TASK-704: Build Paid Enrollment UI and Blocked Enrollment States
- **Phase:** Phase 7: Payments, Enrollment, and Learning Progress
- **Owner:** Frontend
- **Files touched:** `frontend/src/features/courses/`, `frontend/src/services/courses/`, `frontend/src/components/shared/`
- **Depends on:** `TASK-702`, `TASK-703`
- **Spec:** `PRD.md` Sections `5.3`, `6.5`; `schema.yaml` payment/enrollment endpoints when added
- **Setup reference:** Payment UI deferment rationale in `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Paid and blocked enrollment states are visible, including explicit `Enrollment Unavailable`
- **Blockers:** None
- **Description:** Deliver the learner-facing UI for course pricing, checkout entry, and blocked enrollment rules.

### TASK-705: Implement Enrollment and Progress Backend
- **Phase:** Phase 7: Payments, Enrollment, and Learning Progress
- **Owner:** Backend
- **Files touched:** `backend/apps/courses/`, `backend/apps/payments/`, `backend/apps/dashboards/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-603`, `TASK-703`
- **Spec:** `PRD.md` Sections `4.1`, `5.3`, `6.5`, `6.11`
- **Setup reference:** N/A
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Enrollment records, enrollment states, and progress states are persisted and available for dashboards
- **Blockers:** None
- **Description:** Build the backend enrollment and progress layer used by learners, organizations, and dashboards.

### TASK-706: Build Learner Enrollment and Progress UI
- **Phase:** Phase 7: Payments, Enrollment, and Learning Progress
- **Owner:** Frontend
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
- **Owner:** Backend
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
- **Owner:** Frontend
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
- **Owner:** Backend
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
- **Owner:** Frontend
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
- **Owner:** Both
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
- **Owner:** Both
- **Files touched:** `backend/apps/events/`, `backend/apps/opportunities/`, `backend/apps/dashboards/`, `frontend/src/services/`, `frontend/src/lib/`
- **Depends on:** `TASK-801`, `TASK-803`
- **Spec:** `PRD.md` Sections `5.5`, `6.6`, `6.8`, `6.9`
- **Setup reference:** Recommendation groundwork in `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Event and opportunity contracts preserve field, skill, course, and participation linkage for later relevance logic
- **Blockers:** None
- **Description:** Ensure the data model and API outputs do not lose the signals needed for future discovery and recommendation features.

### Phase 8 Definition of Done

- Events and opportunities work end to end.
- Regular users can RSVP and apply.
- Organization-side applicant management exists.

### Phase 8 Known Blockers / Risks

- None yet.

## Phase 9: Dashboards, Notifications, Moderation, and Governance

Goal:
At the end of this phase, each actor has a relevant dashboard, notifications support core flows, and admins can moderate users, content, and taxonomy.

### TASK-901: Implement Dashboard Aggregation Backend
- **Phase:** Phase 9: Dashboards, Notifications, Moderation, and Governance
- **Owner:** Backend
- **Files touched:** `backend/apps/dashboards/`, `backend/apps/common/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-505`, `TASK-705`, `TASK-805`
- **Spec:** `PRD.md` Sections `4.1`, `6.11`
- **Setup reference:** N/A
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Live dashboard aggregates exist for regular users, organizations, and admins
- **Blockers:** None
- **Description:** Build the backend aggregate layer that turns live records into actor-specific dashboard data.

### TASK-902: Build Actor Dashboard Frontend
- **Phase:** Phase 9: Dashboards, Notifications, Moderation, and Governance
- **Owner:** Frontend
- **Files touched:** `frontend/src/features/dashboard/`, `frontend/src/features/organizations/`, `frontend/src/services/dashboard/`, `frontend/src/hooks/dashboard/`
- **Depends on:** `TASK-901`
- **Spec:** `PRD.md` Sections `4.1`, `6.11`; `schema.yaml` dashboard endpoints when added
- **Setup reference:** `recharts` and query foundations already documented in `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Each primary actor has a meaningful dashboard backed by live records
- **Blockers:** None
- **Description:** Deliver the user, organization, and admin dashboard experiences using backend aggregate data.

### TASK-903: Implement Notification Backend
- **Phase:** Phase 9: Dashboards, Notifications, Moderation, and Governance
- **Owner:** Backend
- **Files touched:** `backend/apps/notifications/`, `backend/apps/accounts/`, `backend/apps/messaging/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-202`, `TASK-503`, `TASK-705`
- **Spec:** `PRD.md` Sections `4.1`, `6.4`, `6.11`
- **Setup reference:** Celery/email rationale in `backend/BACKEND_SETUP.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Essential notification records and delivery triggers exist for core workflow events
- **Blockers:** None
- **Description:** Build the backend notification and alert layer for verification, messaging, session, enrollment, and system events.

### TASK-904: Build Notification Frontend
- **Phase:** Phase 9: Dashboards, Notifications, Moderation, and Governance
- **Owner:** Frontend
- **Files touched:** `frontend/src/stores/`, `frontend/src/components/shared/`, `frontend/src/features/dashboard/`, `frontend/src/services/`
- **Depends on:** `TASK-903`, `TASK-902`
- **Spec:** `PRD.md` Sections `4.1`, `6.11`; `schema.yaml` notification endpoints when added
- **Setup reference:** `zustand` rationale in `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Users can see essential notifications and status changes through app-visible surfaces
- **Blockers:** None
- **Description:** Implement notification visibility and client-side notification state handling using the shared store foundation.

### TASK-905: Implement Admin Moderation and Taxonomy Backend
- **Phase:** Phase 9: Dashboards, Notifications, Moderation, and Governance
- **Owner:** Backend
- **Files touched:** `backend/apps/taxonomy/`, `backend/apps/accounts/`, `backend/apps/organizations/`, `backend/apps/audit/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-206`, `TASK-601`
- **Spec:** `PRD.md` Sections `5.4`, `6.12`
- **Setup reference:** N/A
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Admin moderation, category suggestion review, and category activation controls exist server-side
- **Blockers:** None
- **Description:** Build the backend admin governance tools for accounts, content, and controlled category lists.

### TASK-906: Build Admin Moderation and Category Governance UI
- **Phase:** Phase 9: Dashboards, Notifications, Moderation, and Governance
- **Owner:** Frontend
- **Files touched:** `frontend/src/features/organizations/`, `frontend/src/features/dashboard/`, `frontend/src/services/organizations/`, `frontend/src/services/dashboard/`
- **Depends on:** `TASK-905`, `TASK-902`
- **Spec:** `PRD.md` Sections `5.4`, `6.12`; `schema.yaml` moderation/category endpoints when added
- **Setup reference:** N/A
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Admins can review, approve, reject, disable, and manage the governance surfaces required by V1
- **Blockers:** None
- **Description:** Deliver the frontend moderation and category-approval experience for admin operators.

### TASK-907: Implement Audit-Friendly Logging Backend
- **Phase:** Phase 9: Dashboards, Notifications, Moderation, and Governance
- **Owner:** Backend
- **Files touched:** `backend/apps/audit/`, `backend/apps/common/`, `backend/config/urls.py`, `schema.yaml`
- **Depends on:** `TASK-905`
- **Spec:** `PRD.md` Sections `6.12`, `7.4`
- **Setup reference:** N/A
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Key administrative and security-sensitive actions are logged with reviewable records
- **Blockers:** None
- **Description:** Build the audit layer required for admin oversight and trustworthy operational records.

### TASK-908: Expose Audit and Oversight UI
- **Phase:** Phase 9: Dashboards, Notifications, Moderation, and Governance
- **Owner:** Frontend
- **Files touched:** `frontend/src/features/dashboard/`, `frontend/src/services/dashboard/`, `frontend/src/components/shared/`
- **Depends on:** `TASK-907`, `TASK-906`
- **Spec:** `PRD.md` Sections `5.4`, `6.12`; `schema.yaml` audit endpoints when added
- **Setup reference:** N/A
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Admin-facing oversight views expose the audit and moderation information needed by V1
- **Blockers:** None
- **Description:** Finish Phase 9 by surfacing operational records and moderation history in the admin-facing frontend.

### Phase 9 Definition of Done

- Actor dashboards are live-data driven.
- Essential notifications exist.
- Admin moderation, taxonomy governance, and audit logging are operational.

### Phase 9 Known Blockers / Risks

- None yet.

## Phase 10: Deferred Feature Continuity and Expansion Safety

Goal:
At the end of this phase, all deferred V2/V3 PRD features remain intentionally mapped and the V1 architecture preserves extension paths instead of blocking them.

### TASK-1001: Preserve V2 Course and Recommendation Extension Points
- **Phase:** Phase 10: Deferred Feature Continuity and Expansion Safety
- **Owner:** Both
- **Files touched:** `backend/apps/common/`, `backend/apps/courses/`, `backend/apps/skills/`, `frontend/src/lib/`, `frontend/src/services/`, `Agent Tasks.md`
- **Depends on:** `TASK-606`, `TASK-706`
- **Spec:** `PRD.md` Sections `4.2`, `6.5`, `6.6`
- **Setup reference:** Existing package decisions in `backend/BACKEND_SETUP.md` and `frontend/FRONTEND_PRD_READY.md`
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** V2 features like regular-user course creation, richer content operations, and AI-assisted recommendations remain structurally supported
- **Blockers:** None
- **Description:** Review and preserve the foundations needed for near-term expansion features so V1 work does not paint the product into a corner.

### TASK-1002: Preserve Community, Service, and Certificate Extension Points
- **Phase:** Phase 10: Deferred Feature Continuity and Expansion Safety
- **Owner:** Both
- **Files touched:** `backend/apps/common/`, `backend/apps/events/`, `backend/apps/organizations/`, `backend/apps/notifications/`, `frontend/src/lib/`, `frontend/src/features/`, `Agent Tasks.md`
- **Depends on:** `TASK-801`, `TASK-906`
- **Spec:** `PRD.md` Sections `4.2`, `6.8`, `6.10`
- **Setup reference:** N/A
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Community groups, service-credit tracking, verified participation, and certificates remain explicitly supported as future additions
- **Blockers:** None
- **Description:** Keep deferred collaboration and trust-signal features visible and architecturally possible.

### TASK-1003: Preserve Advanced Analytics and Adaptive Feature Hooks
- **Phase:** Phase 10: Deferred Feature Continuity and Expansion Safety
- **Owner:** Both
- **Files touched:** `backend/apps/dashboards/`, `backend/apps/common/`, `frontend/src/features/dashboard/`, `frontend/src/lib/`, `Agent Tasks.md`
- **Depends on:** `TASK-901`, `TASK-908`
- **Spec:** `PRD.md` Sections `4.3`, `6.6`, `6.7`, `6.11`
- **Setup reference:** N/A
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** V3 analytics, adaptive learning, and advanced career intelligence remain intentionally mapped and unblocked by V1 decisions
- **Blockers:** None
- **Description:** Validate that the implemented platform can later grow into advanced intelligence and analytics features without destructive rewrites.

### TASK-1004: Run Full PRD Coverage Audit Before Future Replanning
- **Phase:** Phase 10: Deferred Feature Continuity and Expansion Safety
- **Owner:** Both
- **Files touched:** `Agent Tasks.md`, `BLOCKERS.md`, `schema.yaml`, `DEFINITION_OF_DONE.md`
- **Depends on:** `TASK-1001`, `TASK-1002`, `TASK-1003`
- **Spec:** `PRD.md` Sections `3` through `7`
- **Setup reference:** N/A
- **Conventions:** Follow `CONVENTIONS.md`
- **Definition of Done:** Every PRD feature remains mapped to a task ID and no deferred feature has become invisible
- **Blockers:** None
- **Description:** Maintain the traceability system itself so future planning or reprioritization does not silently drop product requirements.

### Phase 10 Definition of Done

- V2/V3 features remain intentionally mapped.
- V1 architecture does not silently block future work.
- Full PRD-to-task coverage remains intact.

### Phase 10 Known Blockers / Risks

- None yet.

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
- MFA future path: `TASK-1004`

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
- Post-participation ratings for events: `TASK-507`, `TASK-508`, `TASK-802`

### Messaging, coordination, and sessions

- In-platform chat: `TASK-501`, `TASK-502`
- Resource sharing in chat: `TASK-501`, `TASK-502`
- Live or progressive realtime coordination: `TASK-503`, `TASK-504`
- Session scheduling/planning: `TASK-505`, `TASK-506`
- Planned and completed session records: `TASK-505`, `TASK-506`
- Demo-ready session delivery with external link fallback: `TASK-506`
- In-platform video left extensible but not required for V1: `TASK-503`, `TASK-506`, `TASK-1004`

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
- Regular-user course creation deferred but preserved: `TASK-1001`

### Payments, finance, and monetization

- Financial account setup for verified organizations: `TASK-701`, `TASK-702`
- Currency-aware pricing: `TASK-703`, `TASK-704`
- Chapa-oriented payment flow: `TASK-703`, `TASK-704`
- Enrollment reconciliation and payment follow-up: `TASK-703`, `TASK-705`

### AI assistance and recommendation layer

- Recommendation layer based on structured user data: `TASK-401`, `TASK-806`, `TASK-901`
- Cross-module discovery signals: `TASK-103`, `TASK-301`, `TASK-806`, `TASK-1001`
- Explainable rationale for matches/recommendations: `TASK-401`, `TASK-402`, `TASK-1001`
- AI should not block core workflows: `TASK-102`, `TASK-503`, `TASK-1004`
- Future skill-gap analysis and assignment feedback: `TASK-1001`, `TASK-1003`

### Community, service, and collaboration

- Community interaction beyond one-to-one swaps preserved for later: `TASK-1002`
- Volunteer/social-impact/community-service initiatives preserved for later: `TASK-1002`
- Field-based communities preserved for later: `TASK-1002`
- Only verified organizations create communities initially: `TASK-1002`
- Events can be created by organizations regardless of verification state: `TASK-801`, `TASK-802`
- Regular users cannot create communities/events in V1: `TASK-206`, `TASK-801`
- Regular users RSVP/register for events in V1: `TASK-801`, `TASK-802`
- Service-credit tracking and verified participation foundations: `TASK-1002`
- Forums/projects/collaboration spaces progression: `TASK-1002`

### Career and opportunity hub

- Organizations publish opportunities: `TASK-803`, `TASK-804`
- Jobs/internships by organizations, not regular users: `TASK-206`, `TASK-803`
- Regular users apply inside the platform: `TASK-803`, `TASK-804`
- Applicant pipeline with applied/shortlisted/interview/hired: `TASK-803`, `TASK-805`
- Opportunity relevance tied to field/skills/courses/participation: `TASK-806`, `TASK-901`

### Certificates, verification, and trust signals

- Verified digital certificates preserved for later: `TASK-1002`
- Verified-org-only issuance rule preserved: `TASK-1002`
- Unique certificate ID and verification lookup path preserved: `TASK-1002`
- Extensible verification workflows: `TASK-601`, `TASK-1002`

### Dashboards and analytics

- Regular-user dashboard: `TASK-901`, `TASK-902`
- Organization dashboard: `TASK-901`, `TASK-902`
- Applicant pipeline visibility in org dashboards: `TASK-805`, `TASK-902`
- Admin dashboard: `TASK-901`, `TASK-902`, `TASK-908`
- Advanced analytics and reporting preserved for later: `TASK-1003`

### Administration and moderation

- Admin management of users, organizations, content, roles, reports, moderation: `TASK-905`, `TASK-906`
- Admin management of fixed category lists: `TASK-905`, `TASK-906`
- User/org category suggestions with approval before activation: `TASK-905`, `TASK-906`
- Audit-friendly important action records: `TASK-907`, `TASK-908`
- Future identity/compliance workflows preserved: `TASK-1004`

### Non-functional requirements

- Responsive web experience across mobile and desktop: `TASK-102`, `TASK-201`, `TASK-302`, `TASK-402`, `TASK-604`, `TASK-902`
- Secure auth, authorization, and session management: `TASK-101`, `TASK-104`, `TASK-202`, `TASK-206`
- Sensitive data protected in transit and trust-sensitive flows protected: `TASK-101`, `TASK-206`, `TASK-601`, `TASK-703`
- Privacy-preserving handling and limited unnecessary exposure: `TASK-305`, `TASK-602`, `TASK-1003`
- Reliability of core records despite optional service failure: `TASK-503`, `TASK-505`, `TASK-705`, `TASK-907`
- Maintainable modular architecture for V2/V3: `TASK-103`, `TASK-1001`, `TASK-1002`, `TASK-1003`, `TASK-1004`
- Accessibility considered from V1: `TASK-102`, `TASK-201`, `TASK-302`, `TASK-604`, `TASK-902`

### Explicitly deferred but still tracked

- Regular-user course creation: `TASK-1001`
- Richer content management: `TASK-1001`
- AI-assisted recommendations and assignment feedback: `TASK-1001`, `TASK-1003`
- Discussion forums and community groups: `TASK-1002`
- Verified digital certificates: `TASK-1002`
- Organization-side verification workflow expansion: `TASK-601`, `TASK-1002`
- Stronger analytics/reporting: `TASK-1003`
- Focus drift detection and mood mirror: `TASK-1003`
- Advanced career matching and ecosystem intelligence: `TASK-1003`

## Unmapped PRD Items

None currently.
