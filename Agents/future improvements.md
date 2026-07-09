# Phase 10 Companion Notes

This file is a Phase 10 companion for deferred and advanced PRD features.

Primary source of truth:
- `PRD.md` Sections `4.2`, `4.3`, `6.5`, `6.6`, `6.7`, `6.8`, `6.10`, `6.11`, `9.2`, and `9.3`
- `Agent Tasks.md` Phase 10 tasks
- `ROLE_ACCESS_MATRIX.md` for every new route added while implementing these features

## Phase 10 Sequencing

- Starting after `TASK-1006`, Phase 10 work is intentionally sequenced `backend first`, then `frontend`.
- The backend task keeps the base task ID and defines the contracts, permissions, policy limits, and `schema.yaml` surface.
- The frontend follow-up uses the matching `-FE` task ID and must build on the backend contract rather than inventing parallel behavior in the client.
- Current Phase 10 split:
  - `TASK-1007` -> `TASK-1007-FE`
  - `TASK-1008` -> `TASK-1008-FE`
  - `TASK-1009` -> `TASK-1009-FE`
  - `TASK-1010` -> `TASK-1010-FE`
  - `TASK-1011` -> `TASK-1011-FE`
- When this file references a Phase 10 area below, read it as guidance for both halves of that task pair unless the note explicitly says backend-only or frontend-only.

## AI Provider Foundation

- Use a server-side AI provider abstraction rather than calling models directly from the browser.
- The default provider path for low-cost or free AI capabilities should use OpenRouter unless a later approved change replaces it.
- OpenRouter keys must stay server-side only.
- Every AI-dependent feature must have a non-AI fallback so core workflows remain usable when the provider is unavailable, rate-limited, or disabled.
- AI outputs that affect recommendations, matching, or learning guidance should be traceable enough for admins and users to understand why they were shown.
- Backend and frontend should share a capability snapshot contract for rollout state, fallback behavior, and availability instead of duplicating AI flag logic per feature.
- For split execution:
  - backend work defines provider abstraction, rollout flags, feature contracts, safety limits, and fallback metadata;
  - frontend work consumes the shared capability snapshot and only exposes AI affordances that the backend says are available.

## Recommendation and Matching Expansion

- AI recommendation work should build on the current structured profile, skills, swaps, enrollments, events, and opportunity signals rather than bypassing them.
- Recommendation work should cover:
  - peer and skill-swap suggestions,
  - course recommendations,
  - cross-module discovery feeds,
  - opportunity suggestions,
  - explainable rationale for each surfaced recommendation.
- Matching quality should remain measurable so later admin analytics can inspect recommendation health.
- For split execution:
  - backend first provides recommendation generation, rationale payloads, fallback behavior, and measurable quality/system-health signals;
  - frontend second surfaces those recommendation feeds and rationale in actor-safe discovery and dashboard UI.

## Learning Guidance and Feedback

- Phase 10 should explicitly cover:
  - skill-gap analysis,
  - AI-assisted assignment feedback,
  - learning guidance derived from course, profile, and activity signals.
- These features should plug into the existing course and dashboard structure rather than creating detached one-off flows.

## Cognitive Monitoring Guardrails

- Focus drift detection and the learning mood mirror are advanced adaptive capabilities, not default always-on camera features.
- Implementations should prefer privacy-preserving signals.
- If adaptive monitoring is active, the user must be told:
  - what is active,
  - what signals are used,
  - what effect the feature has.
- Opt-in, disclosure, and sensitive-data handling rules must be designed before adaptive monitoring logic is relied on.
- For split execution:
  - `TASK-1007` establishes backend consent, policy, storage, auditability, and allowed-signal contracts;
  - `TASK-1007-FE` exposes disclosure, consent, and transparency UI;
  - `TASK-1008` implements backend adaptive logic and explainable outputs;
  - `TASK-1008-FE` delivers the user-facing focus drift, mood mirror, and adaptive-response experience.

## Remaining Deferred Product Areas

- Regular-user course creation and richer creator tooling are still required by the PRD roadmap.
- Community groups, collaboration spaces, service-credit records, and verified certificates are still required by the PRD roadmap.
- Advanced analytics remain required, including:
  - stronger reporting,
  - matching-quality visibility,
  - system health visibility,
  - broader adaptive intelligence signals.
- For split execution:
  - `TASK-1009` is backend-first analytics, oversight, and monitoring contracts;
  - `TASK-1009-FE` is frontend analytics, charting, operator visibility, and drill-down UX;
  - `TASK-1010` is backend-first monetization and automation support for paid community-service offerings;
  - `TASK-1010-FE` is the learner/operator/admin payment workflow UI on top of those contracts;
  - `TASK-1011` closes backend/schema/governance coverage first;
  - `TASK-1011-FE` closes route/UI/actor-surface coverage after the backend audit is stable.

## Extra Requested Ideas Outside Current PRD Core

These are useful future directions but should not silently replace the PRD priorities above:

- company wallet and scheduled organization settlement flow,
- Zoom or similar live-session integration,
- broader certificate expansion across more activity types.
- more on course management when using resources it should feel like a very completed course management 
- Generate certeficate document if issued
- On organization when issuing certeficate it should only select courses, or events or others that they completed , the list should be filtered based on the user. 

- Add AI navigation helper since this project have a lot of features and alot of routes m a lot of things present in dashboard of each user role we need to add an AI assitant to help them go to pages just by typing like, Take me to a page where my certefication is found and it shows them suggestions then the user manually clicks, or regular user says how many courses an I enrolled to then it tells them, or says show me event listing tailered to my profile and it suggests links and the user manually clicks but when they open the chatbot it should suggest them 3 questions atilered to there user role to get them started , this should be applied for all user roles and the AI assistant should use open router and also visible at all times and at all screen types like in bottom right corner just floating there. When implementing this take out multiple tasks to handle this feature. 
- Have a flow like i dont have to go to other page to find learners for a course i should see a link that says learners besides of every course or see attendees for every event , or see cereticate issued for course inside or besides a course or event or something similar. while current is good but finding connected things shouldn't be hard or complicated
-1, Adaptive monitoring should have all turned on by default and I should find that customization on there own link not embedded in other pages maybe in my profile on its own tab
- Make sure you have check .env file to make sure you have enabled nessessary once like AI_FEATURES_ENABLED