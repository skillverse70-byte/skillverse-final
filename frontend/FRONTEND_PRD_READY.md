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
- Environment wiring for API + websocket endpoints: `.env.example`

## Shared domain contract baseline

Canonical frontend domain enums and entity/status references now live in:

- `src/lib/domain-enums.js`
- `src/lib/domain-contracts.js`
- `src/lib/trust-state.js`

These are the frontend-side shared vocabulary for roles, trust states, workflow statuses, and major domain entities. Future feature work should import these instead of hardcoding status strings.
