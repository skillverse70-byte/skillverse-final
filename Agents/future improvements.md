# Phase 10 Companion Notes

This file is a Phase 10 companion for deferred and advanced PRD features.

Primary source of truth:
- `PRD.md` Sections `4.2`, `4.3`, `6.5`, `6.6`, `6.7`, `6.8`, `6.10`, `6.11`, `9.2`, and `9.3`
- `Agent Tasks.md` Phase 10 tasks
- `ROLE_ACCESS_MATRIX.md` for every new route added while implementing these features

## AI Provider Foundation

- Use a server-side AI provider abstraction rather than calling models directly from the browser.
- The default provider path for low-cost or free AI capabilities should use OpenRouter unless a later approved change replaces it.
- OpenRouter keys must stay server-side only.
- Every AI-dependent feature must have a non-AI fallback so core workflows remain usable when the provider is unavailable, rate-limited, or disabled.
- AI outputs that affect recommendations, matching, or learning guidance should be traceable enough for admins and users to understand why they were shown.

## Recommendation and Matching Expansion

- AI recommendation work should build on the current structured profile, skills, swaps, enrollments, events, and opportunity signals rather than bypassing them.
- Recommendation work should cover:
  - peer and skill-swap suggestions,
  - course recommendations,
  - cross-module discovery feeds,
  - opportunity suggestions,
  - explainable rationale for each surfaced recommendation.
- Matching quality should remain measurable so later admin analytics can inspect recommendation health.

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

## Remaining Deferred Product Areas

- Regular-user course creation and richer creator tooling are still required by the PRD roadmap.
- Community groups, collaboration spaces, service-credit records, and verified certificates are still required by the PRD roadmap.
- Advanced analytics remain required, including:
  - stronger reporting,
  - matching-quality visibility,
  - system health visibility,
  - broader adaptive intelligence signals.

## Extra Requested Ideas Outside Current PRD Core

These are useful future directions but should not silently replace the PRD priorities above:

- company wallet and scheduled organization settlement flow,
- Zoom or similar live-session integration,
- broader certificate expansion across more activity types.
