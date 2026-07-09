# Frontend PRD Readiness Map

This notes the frontend capability gaps implied by `PRD.md` that were not fully prepared yet, and the minimal package/config added to close those gaps without building the features themselves.

## PRD-to-package mapping

| PRD feature area | Package chosen | Why this package |
| --- | --- | --- |
| Skill-swap chat, session coordination, future live alerts, dashboard freshness | `react-use-websocket` | The PRD explicitly calls for in-platform chat, realtime coordination, and progressive live features. This gives a React-friendly websocket client with reconnect support, shared connections, and a clean hook surface for future Channels integration. |
| Cross-module client state for chat presence, notification inbox state, session drafts, and role-aware UI shell state | `zustand` | The app already has React Query for server data, but the PRD implies lightweight shared client state that should not live in route-local component trees. Zustand keeps that simple without forcing reducers or app rewrites. |
| Organization verification uploads, course resources, message attachments, profile/organization media | `react-dropzone` | The PRD explicitly includes optional business license upload, course resources, and resource sharing in chat. This gives a consistent drag-and-drop/file-selection base for those flows. |

## Existing packages that already cover other PRD capabilities

- Forms and validation: already supported by `react-hook-form`, `@hookform/resolvers`, and `zod`
- Data fetching and cache management: already supported by `@tanstack/react-query`
- Routing and protected/public flows: already supported by `react-router-dom`
- UI notifications and toasts: already supported by the existing Radix/Sonner toast setup
- Scheduling/date picking: already supported by `react-day-picker`
- Rich content editing: already supported by `react-quill`
- Charts and dashboards: already supported by `recharts`

## No new package added for these PRD needs

- Chapa payment UI: no package added yet. The PRD requires Chapa-oriented payment support, but the frontend can handle that with backend-provided checkout/session URLs and normal redirect/form flows when implemented.
- Video session delivery: no package added yet. The PRD explicitly allows external meeting-link sharing as a valid V1 path, so a video SDK is not required at scaffold time.
- Push/browser notifications: no package added yet. Browser notifications can be layered on top of websocket events and the Notification API later without additional dependency pressure right now.

## Where the new setup will plug in later

- Realtime hooks and websocket channels: `src/lib/realtime/socket-client.js`
- Shared frontend store slices: `src/stores/app-shell-store.js`
- Upload presets and dropzone config: `src/lib/uploads/upload-presets.js`
- Shared AI rollout/capability parsing: `src/lib/ai-capabilities.js`
- Shared AI capability fetches: `src/services/ai/ai.service.js`
- Environment wiring for API + websocket endpoints: `.env.example`

## Shared domain contract baseline

Canonical frontend domain enums and entity/status references now live in:

- `src/lib/domain-enums.js`
- `src/lib/domain-contracts.js`
- `src/lib/trust-state.js`

These are the frontend-side shared vocabulary for roles, trust states, workflow statuses, and major domain entities. Future feature work should import these instead of hardcoding status strings.

## AI rollout contract

The backend now exposes a shared AI capability snapshot so future AI features can read rollout state, fallback behavior, and availability without embedding provider logic in components. Frontend AI work should consume that contract instead of reading environment flags directly.

## Shared detail-page navigation rule

To keep feature-heavy module pages usable as AI, analytics, payments, and governance surfaces grow, detail pages should not stack every secondary panel into one long scroll.

The shared pattern now lives in:

- `src/components/shared/ModuleDetailShell.jsx`
- `src/hooks/dashboard/useDetailPageTab.js`
- `src/hooks/dashboard/useRouteTab.js`

Rules for future frontend work:

- Module detail pages should default to the core overview or primary content tab.
- Secondary surfaces such as AI helpers, analytics, application tools, payment state, and support panels should live behind tabs unless they are essential to the first view.
- Detail-page tabs should use the `tab` query param, and the default tab should keep the URL clean by omitting the param when possible.
- Dashboard-style workspaces can continue using `WorkspaceShell`, while feature detail pages should prefer `ModuleDetailShell`.

Audit outcome after `TASK-1008-FE-D`:

- `/courses/:id`, `/events/:id`, and `/jobs/:id` now use tabbed detail workspaces.
- `/messages` now separates the core chat flow from adaptive focus support with tabs.
- `/discover` now separates public exploration from personalized AI discovery with tabs.
- `/dashboard` was reviewed and intentionally kept on the existing `WorkspaceShell` model because it already provides first-level navigation instead of a single long surface.

Audit outcome after `TASK-1008-FE-E`:

- `/dashboard`, `/org`, and `/admin` already satisfy the rule through `WorkspaceShell`-based navigation and do not need a second tab system layered on top.
- `/courses` currently remains an intentionally single-purpose catalog page: search/filter controls feed one browse flow instead of multiple competing subflows.
- `/communities` currently remains acceptable as a scoped master/detail workspace: users choose a community first, then reveal discussion, members, and related links within that selected context.
- `/events` and `/jobs` should be normalized next because each page currently mixes a personalized AI recommendation feed with the main browse/filter/list flow on the same surface.
- `/certificates` should be normalized next because public certificate lookup and authenticated personal trust-record management currently share one page and should move toward clearer tabbed or workspace-style separation.
- Future frontend work should treat this audit as the baseline: if a non-detail page grows a second major workflow, it should graduate to tabs, cards, drill-downs, or workspace navigation instead of becoming a longer stacked page.

Audit outcome after `TASK-1008-FE-F`:

- `/events` now separates public catalog browsing from personalized event discovery with route-driven tabs.
- `/jobs` now separates public opportunity browsing from learner-specific personalized matching with route-driven tabs.
- `/certificates` now separates public verification lookup, personal certificate history, and service-credit records into distinct tabs.
- Future non-detail pages should follow the same rule: when a public browse flow and a personalized or private workspace start competing on one page, split them into intentional tabs or workspace sections instead of stacking both surfaces together.
