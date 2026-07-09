# Definition of Done

This checklist applies to every task in addition to task-specific requirements in [Agent Tasks.md](./Agent%20Tasks.md).
Read together with:

- [CONVENTIONS.md](./CONVENTIONS.md)
- [OWNERSHIP.md](./OWNERSHIP.md)
- [schema.yaml](./schema.yaml)
- [SCHEMA.md](./SCHEMA.md)
- [BLOCKERS.md](./BLOCKERS.md)

## Global Checklist

- The task outcome matches the linked `PRD.md` requirement.
- Files were added or changed only in the locations allowed by [OWNERSHIP.md](./OWNERSHIP.md), unless the task explicitly documents an exception.
- Naming, error handling, and safety rules follow [CONVENTIONS.md](./CONVENTIONS.md).
- Relevant tests were added or updated.
- Relevant test commands pass, or any unrun tests are explicitly called out.
- If user data, trust state, payments, moderation, or private records were touched, auth and permission checks were reviewed.
- If a new endpoint or endpoint shape changed, [schema.yaml](./schema.yaml) was regenerated.
- If frontend consumes a changed endpoint, frontend work was aligned to `schema.yaml`, not a hand-written assumption.
- If the API contract changed, [SCHEMA.md](./SCHEMA.md) still accurately explains regeneration/viewing.
- No secrets, `.env` files, or private credentials were committed.
- For new backend endpoints, CORS expectations were checked.
- For auth-sensitive or abuse-sensitive new endpoints, rate-limiting needs were considered and noted if not yet implemented.
- If a task sends email, it uses the configured Django email backend and remains compatible with the project's Resend email setup.
- If a task introduces adaptive monitoring, AI privacy, or sensitive learner-signal handling, explicit consent, signal-minimization, and audit logging were reviewed.
- If docs or planning state changed, the relevant governance file or [Agent Tasks.md](./Agent%20Tasks.md) section was updated.
- If blocked, [BLOCKERS.md](./BLOCKERS.md) was updated instead of silently skipping work.
