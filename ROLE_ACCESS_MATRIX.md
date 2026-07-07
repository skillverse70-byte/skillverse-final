# Role Access Matrix

This file turns the PRD actor model into the current frontend route contract so role separation stays explicit while public browsing remains available where the PRD requires it.

This is the source of truth for actor-to-route access.
Whenever a task changes route access, navigation visibility, or redirect behavior, update this file and the matching task entry in [Agent Tasks.md](./Agent%20Tasks.md) in the same change.

PRD basis:
- `PRD.md` Section `3`: actors and permissions
- `PRD.md` Section `4.1`: V1 role-aware access and basic dashboards
- `PRD.md` Sections `6.1`, `6.2`, `6.3`, `6.4`, `6.8`, `6.9`, `6.11`, `6.12`

Legend:
- `Yes`: actor may access the route
- `Redirect`: actor is sent to their own home/workspace instead
- `No`: actor is blocked from the route

| Route | Guest | Regular User | Organization | Admin | Notes |
| --- | --- | --- | --- | --- | --- |
| `/` | Yes | Redirect | Redirect | Redirect | Public landing page only |
| `/get-started` | Yes | Redirect | Redirect | Redirect | Public entry flow only |
| `/login` | Yes | Redirect | Redirect | Redirect | Authenticated actors go to their own home |
| `/register` | Yes | Redirect | Redirect | Redirect | Regular-user signup only |
| `/organizations/register` | Yes | Redirect | Redirect | Redirect | Organization signup only |
| `/forgot-password` | Yes | Redirect | Redirect | Redirect | Public password recovery |
| `/reset-password` | Yes | Redirect | Redirect | Redirect | Public reset completion |
| `/verify-email` | Yes | Redirect | Redirect | Redirect | Public verification completion page |
| `/discover` | Yes | Yes | Yes | Yes | Public browse surface |
| `/courses` | Yes | Yes | Yes | Yes | Public browse surface |
| `/courses/:id` | Yes | Yes | Yes | Yes | Public course detail and trust visibility |
| `/events` | Yes | Yes | Yes | Yes | Public event browse surface |
| `/events/:id` | Yes | Yes | Yes | Yes | Public event detail |
| `/jobs` | Yes | Yes | Yes | Yes | Public opportunity browse surface |
| `/jobs/:id` | Yes | Yes | Yes | Yes | Public opportunity detail |
| `/organizations/:id` | Yes | Yes | Yes | Yes | Public organization profile |
| `/dashboard` | No | Yes | Redirect to `/org` | Redirect to `/admin` | Role-aware home entry |
| `/welcome` | No | Yes | No | No | Regular-user onboarding only |
| `/profile` | No | Yes | No | No | Private regular-user profile |
| `/skill-portfolio` | No | Yes | No | No | Regular-user skills only |
| `/skill-swap` | No | Yes | No | No | Free peer swap workflow only |
| `/messages` | No | Yes | No | No | Swap/session messaging only |
| `/saved-opportunities` | No | Yes | No | No | Regular-user saved items only |
| `/org` | No | No | Yes | No | Structured organization workspace with overview, account setup, finance status, and publishing sections |
| `/organization-profile` | No | No | Yes | No | Organization profile management |
| `/course-builder` | No | No | Yes | No | Organization course authoring |
| `/admin` | No | No | No | Yes | Admin dashboard for organization verification, financial-account review, moderation, and oversight |

## Actor Home Rules

- Guest default home: public routes
- Regular User home: `/dashboard`
- Organization home: `/org`
- Admin home: `/admin`

## Navigation Rules

- Regular User navigation exposes discovery plus learner/member workflows.
- Organization navigation exposes organization workspace routes only.
- Admin navigation exposes oversight routes only.
- Public browse routes stay directly reachable because the PRD requires public trust-sensitive listings and public opportunity/course/event discovery.

## Separation Intent

- Regular Users own skill swaps, messaging, personal profiles, saved items, enrollments, and learner progress.
- Organizations own organization profile management, verification readiness, and program authoring.
- Admins own moderation, verification review, and platform oversight.
- Admin access is not treated as "show every regular-user or organization screen"; admin gets its own workspace.
