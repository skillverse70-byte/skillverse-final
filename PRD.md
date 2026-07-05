Product Requirements Document

**SkillVerse**

_AI-Powered Skill Exchange, Learning, Community Service, and Career Development Platform_

Document Status: Build-Ready PRD  
Document Version: 2.1  
Last Updated: July 2, 2026

Source Note: This document refines the original SkillVerse concept into a product-facing PRD that is easier for engineers, AI agents, and collaborators to implement. It preserves the original feature vision while clarifying priorities, actors, release boundaries, and acceptance criteria.

# 1. Purpose of This PRD

This document defines the intended final product direction for SkillVerse and provides enough structure for a human team or AI coding agent to make implementation decisions without guessing the product's meaning.

Interpretation rules:

- Sections 3 through 7 are the source of truth for product requirements.
- Features are not removed from the product vision; they are phased by release to avoid ambiguity.
- `V1 / P0` means required for the first production-ready release.
- `V2 / P1` means important next-phase scope and should influence extensibility, but must not block V1 delivery.
- `V3 / P2` means advanced roadmap scope that remains in the product vision.
- If a requirement is ambiguous, the simpler user flow that preserves the product's core value should win.
- "AI-powered" does not require complex machine learning in V1. A rules-based or lightweight intelligent system is acceptable in early releases if it supports the same user outcome.

# 2. Product Overview

## 2.1 Product Summary

SkillVerse is a web-based platform that combines peer-to-peer skill exchange, structured learning, community participation, and career development in one ecosystem.

Its core idea is that a user should not be limited to being only a learner or only a teacher. A regular user can both learn and contribute skills, making the platform collaborative rather than one-directional. Over time, SkillVerse expands beyond skill exchange into organizational programs, verified community service, career opportunities, and adaptive AI-guided learning.

The product should behave like a connected ecosystem rather than a collection of isolated modules. A user should be able to move from courses to skill swaps to events to communities to opportunities using the same profile, field, skill, and activity signals.

Skill swaps are a permanently free exchange mechanism, while course monetization is restricted to verified organizations with approved payment setup.

## 2.2 Problem Statement

SkillVerse addresses the following market and user problems:

- Formal education and many online learning platforms are expensive, rigid, or inaccessible.
- Personalized mentorship is hard to find even when information is abundant.
- Existing peer-to-peer learning systems often lack trust, structure, and verification.
- Most learning systems do not adapt to user engagement, focus, or momentum.
- Skills gained informally are difficult to translate into verified opportunities, community impact, or employability.

## 2.3 Product Vision

SkillVerse aims to become a trusted ecosystem where people and organizations can:

- exchange skills directly,
- deliver structured programs,
- track learning and contribution,
- verify outcomes,
- and connect those outcomes to real opportunities.

## 2.4 Product Principles

- One account, multiple capabilities: users should not need separate identities to learn and teach.
- Exchange before complexity: the skill-exchange loop is the heart of the product.
- Modules should reinforce one another: activity in one module should improve discovery in others.
- Verified signals over vague claims: the platform should help users prove effort, skill, and participation.
- Core workflows should feel complete in demo form: even simplified V1 features must show an end-to-end user cycle rather than placeholder shells.
- AI should assist decision-making, not create unexplained black boxes.
- Roadmap ambition is welcome, but release scope must remain explicit.

# 3. Actors, Roles, and Permissions

The actor model is intentionally simplified for clarity and scalability.

| Actor | Description | V1 Role in Product |
| --- | --- | --- |
| Guest | Unauthenticated visitor browsing public content and platform information. | Required |
| Regular User | Primary individual account. Can act as both learner and mentor depending on context, profile, and actions. | Required |
| Organization | Business, NGO, institution, training center, or community organization using the platform for programs, opportunities, community activity, or verification workflows. | Required |
| Admin | Internal platform operator responsible for moderation, configuration, and system oversight. | Required |
| Payment Gateway | External service for paid offerings and transactions. | External integration |
| Email / Notification Service | External service for verification, alerts, reminders, and certificate delivery. | External integration |
| Realtime / Video Service | External or internal infrastructure for chat, calls, live sessions, or alerts. | External or platform integration |

Clarifications:

- `Regular User` replaces separate primary actors such as Learner and Mentor.
- A Regular User may switch between "learning" and "teaching" behavior without changing account type.
- `Organization` replaces fragmented business-side roles such as Employer, Institution, and NGO at the actor level.
- `Organization` uses one actor model with a `type` field such as company, NGO, institution, or training center.
- Organizations register through a dedicated organization onboarding flow that is separate from Regular User registration.
- Regular User accounts do not convert into organizations in V1 and do not apply to join organizations.
- Organizations move through explicit trust states so access and monetization can be enforced consistently.
- Verification requires approved license or equivalent organization documentation.
- Verification state must be visible in trust-sensitive contexts such as courses, enrollments, payments, and opportunities.
- Individual course creation by Regular Users is not part of V1; it is a planned V2 capability.

## 3.1 Organization Verification States

| Status | Meaning | Product Rules |
| --- | --- | --- |
| Unverified | Organization is registered on the platform but has not passed license or document verification. | Can publish permitted non-paid offerings. Cannot create or accept paid course enrollments. |
| Verified | Organization has passed license or document review by the platform. | Can publish free offerings and may publish paid offerings subject to financial account setup. |

Verification rules:

- Organizations begin in `Unverified`, even if they submit license information during registration.
- Verification review is a separate platform process that can later move an organization from `Unverified` to `Verified`.
- Unverified organizations are allowed to exist and publish permitted non-paid offerings, but their monetization capabilities are restricted.
- Verified status is granted only after manual or policy-based review of organization credentials.
- Admin manual override is allowed when the platform decides an organization should become verified without a business license.
- Admins may request, review, or require business license or equivalent documentation to identify universities, colleges, companies, NGOs, and similar entities.
- A Verified Organization that wants to monetize must configure the required financial account before paid enrollments are allowed.
- If business license or equivalent verification evidence is missing, paid-course creation and paid-course editing must remain blocked.

# 4. Scope by Release

This section keeps the full feature vision intact while removing uncertainty about when each feature belongs.

## 4.1 V1 / P0: Core Platform Release

The first release focuses on the product's central loop and minimum platform trust:

- account registration, login, logout, and profile management,
- role-aware access for Guest, Regular User, Organization, and Admin,
- organization registration, verification-state management, and review workflow,
- skill profiles with offered skills and requested skills,
- skill discovery and matching,
- swap request lifecycle,
- skill-swap chat, resource sharing, and session coordination,
- session scheduling plus either in-platform video conferencing or easy external meeting-link sharing for demo delivery,
- participation-based rating and review across skill swaps, courses, and events,
- organization-created courses or programs with modules, lessons, checklists, resources, videos, and progression-gated assessments,
- pricing and enrollment gating based on verification and financial account readiness,
- financial account setup for verified organization paid offerings,
- currency-aware pricing and Chapa-oriented payment support for paid courses,
- learner enrollment and progress tracking,
- event publishing plus regular-user RSVP or registration,
- in-platform job and internship application pipeline with shortlist, interview, and hire tracking,
- basic dashboards,
- admin moderation and oversight,
- email verification and essential notifications,
- responsive web experience across desktop and mobile.

## 4.2 V2 / P1: Platform Expansion

The second release expands structured learning and verification:

- Regular User course creation,
- richer content management for videos, PDFs, assignments, quizzes, and advanced learning controls,
- AI-assisted recommendations for skills, courses, and peers,
- AI assignment feedback,
- discussion forums, community groups, and events,
- verified digital certificates,
- organization-side verification workflows,
- service-credit logging and community participation records,
- field-aware discovery feeds connecting courses, swaps, communities, events, and opportunities,
- stronger analytics and reporting.

## 4.3 V3 / P2: Advanced Intelligence and Ecosystem Features

The third release includes advanced adaptive and ecosystem-wide features:

- focus drift detection,
- learning mood mirror,
- deeper skill-gap analysis,
- advanced career matching,
- social impact heatmaps,
- paid community-service courses,
- advanced payment workflows for community-service offerings and broader monetization automation,
- active video-session analytics,
- global knowledge analytics,
- system health and matching-quality monitoring,
- broader automation and predictive insights.

## 4.4 Out of Scope for V1

These are not removed from the product; they are explicitly not required for the first release:

- biometric or camera-heavy mood/focus inference,
- ML-heavy matching as a release blocker,
- full in-app video-conferencing if a lighter coordination path is sufficient,
- advanced career pipelines,
- NGO-specific impact dashboards,
- sophisticated certification trust frameworks,
- complex public portfolio scoring.

# 5. Core User Journeys

## 5.1 Guest to Registered User

1. A Guest discovers SkillVerse and browses public content.
2. The Guest creates an account and verifies email.
3. The new user sets up a profile and adds skills they can offer and want to learn.

## 5.2 Skill Exchange Journey

1. A Regular User adds at least one offered skill and one requested skill.
2. The system surfaces compatible users.
3. The user reviews profiles and sends a swap request.
4. The receiving user accepts, declines, or ignores the request.
5. Both users use in-platform chat to share resources, coordinate timing, and optionally exchange an external meeting link if needed.
6. If available, the users join an in-platform video session; otherwise they proceed using the coordinated external meeting method.
7. After the session, each user leaves feedback and the exchange is recorded.

## 5.3 Organization Program Journey

1. A public applicant registers an organization profile with organization details and selects an organization type.
2. The organization account is created as `Unverified`.
3. The Organization completes its profile and can publish permitted free offerings such as free courses, opportunities, or events.
4. The platform may later review the organization's license or documentation for verification.
5. If the Organization becomes `Verified`, it may add a financial account and prepare paid courses.
6. Paid courses may be publicly visible before financial setup is complete, but they must clearly display `Enrollment Unavailable` until financial setup is finished.
7. Learners enroll into courses that contain lessons, resources, checklists, and assessments with controlled progression.
8. The Organization tracks participation, progress, applications, or completion.

## 5.4 Admin Oversight Journey

1. An Admin monitors platform usage and reported issues.
2. The Admin reviews users, organizations, content, and moderation queues.
3. The Admin manages permissions, platform settings, and system reports.

## 5.5 Integrated Learning-to-Career Journey

1. A Regular User declares a field such as computer science and adds relevant skills and interests.
2. The platform recommends related courses or programs from the Course Module.
3. The same user uses the Skill Swap Module to teach one skill and learn another complementary skill.
4. The platform recommends relevant events or collaborative activities tied to the user's field.
5. As the user builds a stronger profile through learning, teaching, and participation, the platform surfaces related jobs, internships, or opportunities.
6. In later stages, the user joins communities connected to their field to exchange ideas, build visibility, and deepen their network.

# 6. Functional Requirements

Each requirement area includes a primary release target so an implementation agent can prioritize correctly.

## 6.1 Identity, Authentication, and Access Control

### Requirements

- Users shall be able to create accounts, sign in, sign out, and reset passwords.
- The platform shall support actor-aware permissions for Guest, Regular User, Organization, and Admin.
- The platform shall support a dedicated onboarding path for organizations that is separate from Regular User registration.
- The platform shall support organization trust states including `Unverified` and `Verified`.
- Organization accounts shall be managed by a single primary login in V1.
- Organizations may invite Regular Users to manage them on their behalf, with customizable permissions planned for later versions.
- Users shall verify email before accessing protected workflows that require trust.
- Admin accounts shall support stronger security controls than ordinary accounts.
- MFA shall be supported at least for Admin accounts and designed to expand to broader roles.

### Release Target

- V1: registration, login, email verification, password reset, RBAC, admin security baseline.
- V2: broader MFA rollout and expanded verification policies.

### Acceptance Criteria

- A Guest cannot access protected user or admin pages.
- A Regular User cannot access admin-only features.
- An Organization cannot impersonate or access another organization's data.
- A Regular User registration flow does not create or convert into an Organization account in V1.
- The initial Organization account is controlled by a single primary login in V1.
- Access rules are enforced server-side, not only in the UI.

## 6.2 Profile and Skill Graph

### Requirements

- Regular Users shall maintain profiles containing bio, interests, experience indicators, and skill lists.
- Regular Users shall be able to declare one or more academic, professional, or domain-interest fields that can be used across discovery modules.
- Skills shall be classified as `Offering`, `Requesting`, or both.
- Regular User profiles shall not be publicly viewable to unauthenticated visitors.
- Organizations shall maintain public profiles describing who they are, what they provide, and which trust state they are in.
- Organizations shall have a `type` field to distinguish company, NGO, institution, training center, or similar categories without changing the actor model.
- Organization registration shall require at minimum: organization name, organization type, email, description, country or location, and optional business license upload.
- The system shall store enough structured profile, field, and skill data to support matching, recommendations, module-to-module discovery, and reporting.

### Release Target

- V1: core profile and skill modeling.
- V2: richer profile depth, evidence, and verification fields.

### Acceptance Criteria

- A Regular User can add, edit, and remove offered or requested skills.
- A Regular User can add or update field and interest signals used across multiple modules.
- The system can query users by skill overlap.
- Organization trust state is visible anywhere a user evaluates a trust-sensitive offering.
- Unverified organizations shall display a visible `Unverified` badge on all public trust-sensitive listings and profile surfaces.
- Regular User profiles are not exposed on public pages.
- Profile data can be displayed consistently in search, match, and dashboard views.

## 6.3 Skill Matching and Swap Lifecycle

### Requirements

- The platform shall identify compatible users based on skill overlap and swap potential.
- Users shall be able to initiate, accept, reject, or cancel swap requests.
- The system shall support a recorded lifecycle for each swap request.
- Skill swaps shall remain permanently free and shall not introduce paid participation flows.
- The matching model shall support future improvement from heuristic scoring to ML-enhanced scoring without requiring a product rewrite.

### Release Target

- V1: deterministic or rules-based matching.
- V2: AI-assisted recommendations.
- V3: advanced matching intelligence and quality analytics.

### Acceptance Criteria

- A user with offered skill `A` and requested skill `B` can be matched to a user offering `B` and requesting `A` or otherwise relevant overlap.
- Each swap request has a status history.
- Matched users can move from discovery to request to session coordination without leaving the platform flow.
- No paid checkout or monetization step exists in the skill-swap flow.

## 6.3.1 Ratings and Reviews

### Requirements

- Participants shall be able to rate and review one another or the offering after meaningful participation.
- Rating and review workflows shall support at minimum skill swaps, course participation, and event participation.

### Release Target

- V1: post-participation ratings and reviews for swaps, courses, and events.

### Acceptance Criteria

- A completed skill swap can produce mutual ratings or reviews.
- A completed course participation can produce a learner rating or review flow.
- An attended event can produce a participation-based rating or review flow where applicable.

## 6.4 Messaging, Coordination, and Sessions

### Requirements

- Users shall be able to coordinate after a successful match.
- The system shall support in-platform chat for resource sharing, scheduling, and meeting coordination.
- The system shall support video conferencing directly in the platform when a feasible free implementation is available for demo use; otherwise it shall make external meeting-link sharing easy.
- The system shall support scheduling or session planning.
- The product shall preserve a record of planned or completed learning sessions.
- Live chat, realtime features, or video may be introduced progressively depending on release phase.

### Release Target

- V1: chat, resource sharing, scheduling, and demo-ready session delivery.
- V2: richer messaging and asynchronous collaboration.
- V3: advanced realtime and session intelligence.

### Acceptance Criteria

- Two matched users can agree on a time or session plan.
- Matched users can exchange messages and resource links inside the platform.
- The session record stores participants, time, status, and basic metadata.
- The system can show upcoming and completed sessions in the user dashboard.

## 6.5 Courses, Programs, and Learning Content

### Requirements

- Organizations shall be able to create, update, publish, and manage courses or programs.
- Courses shall support modules or lessons, videos, resources, checklists, and assessments.
- Assessments or progression checks may be used to control whether a learner proceeds to the next step.
- Regular Users shall be able to browse and enroll in eligible programs.
- The system shall track participation and progress.
- Unverified Organizations shall be limited to free courses or programs.
- Verified Organizations may publish paid courses or programs only after configuring the required financial account.
- If a Verified Organization publishes a paid course before financial setup is complete, the course may be publicly visible but learner enrollment must remain disabled and clearly labeled `Enrollment Unavailable` until setup is finished.
- Paid courses shall support currency-aware pricing and Chapa as the primary payment method in the initial payment flow.
- When Regular User course creation is introduced in V2, those courses shall be free-only unless a later policy explicitly expands monetization rules.
- Regular User course creation shall be supported in V2.

### Release Target

- V1: organization-managed courses with structured learning progression, verification-aware pricing rules, and enrollment gating.
- V2: individual creator course workflows, assessments, quizzes, and richer content operations.

### Acceptance Criteria

- An Organization can create and publish a course or program.
- A Regular User can enroll in a published program.
- A course can contain multiple modules or lessons with visible completion structure.
- A course can contain resources, checklists, and assessments tied to progression.
- An Unverified Organization cannot create a paid course.
- An Organization without required license verification cannot create or edit a paid course.
- A Verified Organization with no financial setup can publish a paid course, but users cannot complete enrollment until setup is complete and the UI must show `Enrollment Unavailable`.
- A Verified Organization with completed financial setup can publish an enrollable paid course.
- Paid-course checkout supports money-aware pricing fields and Chapa-oriented payment flow.
- Pricing and enrollment restrictions are enforced server-side.
- The platform records enrollment status and progress states.

## 6.6 AI Assistance and Recommendation Layer

### Requirements

- The platform shall recommend relevant skills, people, or learning paths based on structured user data.
- The platform shall progressively connect discovery across modules using signals such as field, skills, course enrollments, skill swaps, community participation, and opportunity relevance.
- The recommendation layer shall support field-aware feeds so users can discover relevant courses, events, and opportunities based on their profile and participation history unless they explicitly broaden filters.
- The recommendation layer shall support future skill-gap analysis and assignment feedback.
- AI features shall be explainable enough that users and admins can understand why a suggestion was made.
- AI should enhance core workflows rather than block them.

### Release Target

- V1: simple recommendation logic is acceptable.
- V2: AI-assisted peer/course recommendations, assignment feedback, and cross-module discovery feeds.
- V3: deeper adaptive learning and predictive intelligence.

### Acceptance Criteria

- The system can generate at least one rationale for a match or recommendation using available user data.
- The system design allows a user activity in one module to influence recommendations in another module.
- Course participation, event participation, and profile field data can influence opportunity recommendations.
- Core workflows remain usable even if AI services are unavailable.

## 6.7 Cognitive Monitoring Suite

### Requirements

- The product vision includes focus drift detection and a learning mood mirror.
- These features shall be treated as advanced adaptive capabilities, not as assumptions that every session uses camera analysis.
- Privacy-preserving implementations are preferred.

### Release Target

- V3: primary target.

### Acceptance Criteria

- If implemented, the system must disclose what signals are used.
- Users must be able to understand when adaptive behavior is active.
- Sensitive data handling must comply with the platform's privacy rules.

## 6.8 Community, Service, and Collaboration

### Requirements

- The platform shall support community interaction beyond one-to-one swaps.
- Organizations may run volunteer, social-impact, or community-service initiatives.
- The platform shall support field-based communities and events so users can gather around shared disciplines or interests.
- Only Verified Organizations may create communities in the initial product scope.
- Events may be created by Organizations regardless of verification state.
- Regular Users shall not be able to create communities or events in V1.
- Community discovery should be introduced in later product stages rather than treated as a core V1 discovery surface.
- Regular Users shall be able to register or RSVP for events in V1.
- The system shall support service-credit tracking and evidence-based verification in later releases.
- Forums, projects, and collaboration spaces shall be supported progressively.

### Release Target

- V1: organization-created events plus user RSVP or registration, with communities deferred.
- V2: discussion forums, community groups, events, projects, and service-credit foundations.
- V3: verified social-impact analytics and advanced community-service workflows.

### Acceptance Criteria

- The data model supports linking users to community activities or programs.
- Community creation permissions are restricted to Verified Organizations.
- The platform can relate users, fields, communities, and events.
- A Regular User can RSVP or register for an event in V1.
- Organization workflows can be extended to track verified participation.

## 6.9 Career and Opportunity Hub

### Requirements

- Organizations shall be able to publish opportunities such as jobs, internships, or programs.
- Jobs and internships may be created by Organizations regardless of verification state, but not by Regular User profiles.
- Regular Users shall be able to apply for jobs and internships inside the platform.
- Organizations shall be able to manage applicant pipelines including applied, shortlisted, interview, and hired states.
- The platform shall support matching users to opportunities using profile, field, skill, course, and verified activity data.
- Employers are represented as a subtype of Organization, not as a separate actor model.

### Release Target

- V1: opportunity posting, in-platform application, and candidate pipeline tracking.
- V3: advanced career recommendation and recruitment pipeline tooling.

### Acceptance Criteria

- An Organization can create an opportunity listing.
- A Regular User can view relevant opportunities.
- A Regular User can submit an application inside the platform.
- An Organization can track applicants through applied, shortlisted, interview, and hired stages.
- The system can relate a user's field, skills, courses, and participation history to opportunity relevance.

## 6.10 Certificates, Verification, and Trust Signals

### Requirements

- The platform shall support verified digital certificates for course completion, approved activities, or successful skill exchanges.
- Only Verified Organizations may issue certificates in the initial product scope.
- Certificates shall include a unique certificate ID and platform or admin signature for trust and lookup.
- Verification workflows for organizations, participation, and skill evidence shall be extensible.

### Release Target

- V2: certificates and basic verification lookup.
- V3: broader trust and compliance workflows.

### Acceptance Criteria

- A completion record issued by a Verified Organization can generate a unique verifiable certificate ID.
- Verification results can be checked without exposing unnecessary user data.

## 6.11 Analytics and Dashboards

### Requirements

- Regular Users shall have dashboards showing activity, progress, sessions, and recommendations.
- Organizations shall have dashboards for enrollments, participants, and managed offerings.
- Organization dashboards shall include applicant pipeline visibility for jobs and internships.
- Admins shall have dashboards for oversight, moderation, and platform reporting.
- Advanced analytics such as matching accuracy, social impact heatmaps, server health, and global skill trends remain part of the long-term product vision.

### Release Target

- V1: basic dashboards for each actor.
- V2: expanded reporting.
- V3: system health, impact analytics, and global intelligence.

### Acceptance Criteria

- Each primary actor sees a relevant dashboard after login.
- Dashboard data comes from live system records, not static placeholder content.

## 6.12 Administration and Moderation

### Requirements

- Admins shall manage users, organizations, content, roles, reports, and moderation actions.
- Admins shall manage the fixed category lists used across fields, skills, and other controlled classifications.
- Users and Organizations may suggest new categories, subject to admin approval before becoming active in the system.
- Admins shall view audit-friendly records of important platform actions.
- The platform shall support future identity and compliance workflows.

### Release Target

- V1: core admin management and moderation.
- V2: expanded identity/compliance processes.

### Acceptance Criteria

- Admins can disable or review problematic accounts or content.
- Admins can approve or reject suggested categories before they become selectable.
- Key administrative actions are logged.

# 7. Non-Functional Requirements

## 7.1 Performance

- Standard page loads should feel responsive on typical mobile and desktop networks.
- Most ordinary read operations should complete quickly enough for interactive use.
- The system should degrade gracefully when optional AI services are slow or unavailable.

## 7.2 Security

- Authentication, authorization, and session management must be implemented securely.
- Sensitive data must be encrypted in transit.
- Role checks must be enforced consistently.
- Admin operations require stronger protection than ordinary user actions.

## 7.3 Privacy

- The platform should collect only the user and behavioral data needed for product functionality.
- Adaptive or AI-driven features must disclose their data usage.
- Biometric or highly sensitive signals should not be stored unnecessarily.

## 7.4 Reliability

- Core data such as users, skills, swap requests, enrollments, and certificates must remain consistent.
- Failure in an optional service should not corrupt core platform records.

## 7.5 Usability

- The interface must be understandable to first-time users.
- Mobile responsiveness is required.
- Core actions should require minimal steps.

## 7.6 Maintainability

- The platform should be modular enough to let V2 and V3 features be added without rewriting V1 foundations.
- Product modules should map cleanly to domain concepts such as users, skills, swaps, programs, opportunities, and certificates.

## 7.7 Accessibility

- Core user flows should be usable with accessible navigation and readable layout.
- Accessibility should be considered from V1 rather than deferred entirely.

# 8. Domain Model

The following entities form the core domain language of the system:

| Entity | Purpose |
| --- | --- |
| User | Base account for Regular Users and Admins. |
| Organization | Account or profile representing a company, NGO, institution, training center, or similar entity, including type and trust state. |
| OrganizationVerification | Review record for organization verification, license, admin override, or documentation status. |
| Skill | Structured skill taxonomy used across profiles, matching, and recommendations. |
| UserSkill | Junction between user and skill, including direction such as offering or requesting. |
| FieldInterest | User-declared academic, professional, or domain focus used across modules. |
| MatchSuggestion | System-generated compatibility or recommendation record. |
| SkillSwapRequest | Request to initiate a skill exchange between users. |
| LearningSession | Scheduled or completed session tied to a swap, course, or program. |
| CourseProgram | Organization-created or later user-created course, program, or structured offering, including pricing, enrollment state, and progression structure. |
| CourseModule | Module, lesson group, or course segment inside a course. |
| LessonItem | Individual lesson, video, resource, checklist, or assessment unit. |
| Enrollment | User participation in a course or program. |
| FinancialAccount | Monetization or payout configuration required for paid organization offerings. |
| AssignmentResource | Learning content or assessment artifact. |
| MessageThread | Coordination or communication channel between participants. |
| RatingReview | Mutual or directional feedback after exchanges or programs. |
| Opportunity | Job, internship, volunteer role, or similar listing created by an Organization. |
| JobApplication | In-platform application record and pipeline state for an opportunity. |
| CommunityGroup | Field-based or interest-based user community. |
| Event | Scheduled event, meetup, workshop, or community activity. |
| EventRSVP | Registration or RSVP record for an event. |
| CommunityActivity | Community-service or collaborative initiative record. |
| ServiceCredit | Verified record of volunteer or impact contribution. |
| Certificate | Completion or verification artifact with lookup reference. |
| CategorySuggestion | User- or organization-submitted request for a new controlled category. |
| Notification | System alert, reminder, or status update. |
| AuditLog | Important admin or security-sensitive event record. |

# 9. Release Success Criteria

## 9.1 V1 Success Criteria

V1 is considered successful if:

- a user can register, verify email, and build a profile,
- a user can add offered and requested skills,
- the system can produce viable matches,
- users can initiate and manage swap requests,
- users can coordinate and record sessions,
- organizations can publish programs,
- organizations can move through unverified and verified states,
- free versus paid course rules are enforced correctly,
- paid course enrollment is blocked until required financial setup is complete,
- unverified organizations visibly display their trust state,
- skill swaps remain fully free,
- learners can progress through structured courses with lessons, resources, checklists, and assessments,
- organizations can publish events and users can RSVP,
- organizations can post jobs and manage in-platform applications,
- users can enroll in programs,
- ratings and core dashboards work,
- admins can moderate the system,
- the platform is coherent enough to demonstrate the core SkillVerse loop end to end.

## 9.2 V2 Success Criteria

V2 is considered successful if SkillVerse expands from a skill-swap platform into a stronger learning and verification platform with user-created free courses, better recommendations, community groups, certificates, richer analytics, and a more connected cross-module discovery experience.

## 9.3 V3 Success Criteria

V3 is considered successful if SkillVerse evolves into a more intelligent ecosystem with adaptive learning signals, career intelligence, advanced social-impact tracking, and operational analytics.

# 10. Risks and Product Constraints

- AI recommendation quality depends on the completeness and quality of platform data.
- Advanced matching and adaptive learning may be resource-intensive.
- Organization verification introduces manual review and trust-policy overhead.
- Paid offerings introduce financial compliance, payout, and enrollment-state complexity.
- Privacy expectations increase sharply when behavioral or biometric inference is introduced.
- Verification and certification credibility depend on operational policies, not only software.
- The product may become confusing if too many actor-specific workflows are exposed too early.
- Early versions must avoid pretending to have AI certainty that the data cannot actually support.

# 11. Open Product Decisions

These items are intentionally visible so future work does not hide unresolved choices:

- The exact implementation stack may be chosen in technical design, but the product structure assumes a modular web application.
- The initial matching engine may be heuristic rather than ML-heavy.
- Realtime chat and video may be implemented progressively depending on delivery constraints.
- Community-service payment workflows and paid-course finance flows depend on payment-provider readiness and compliance decisions.
- Focus and mood features require explicit privacy and consent rules before release.

# 12. Reference Architecture Notes

This section is informative, not the primary source of product truth.

The current concept aligns well with:

- a modular web application,
- a relational database for core product entities,
- optional AI services layered behind stable product workflows,
- external integrations for notifications, payments, and realtime communication.

If a technical implementation document is created later, it should map directly to the product structure in this PRD rather than redefining the product itself.
