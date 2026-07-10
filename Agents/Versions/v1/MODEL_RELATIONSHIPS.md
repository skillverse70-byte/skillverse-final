# SkillVerse V1 Model Relationships

Source of truth:
- This record is based on the current Django models under `backend/apps/*/models.py` as of `2026-07-09`.
- Actor boundaries come from the `User.role` enum in `backend/apps/common/enums.py`.
- Guests are an actor in the product, but they do not have a persistent database model.
- Companion seeded test-record manifest: `Agents/Versions/v1/V1_TEST_RECORDS.md`

## 1. Core actor model

### User
- `User` is the root identity model for every authenticated actor.
- `User.role` separates runtime actor behavior into `regular_user`, `organization`, and `admin`.
- `User` is the parent for most user-owned records across the platform.

### Actor-specific extensions
- `RegularUserProfile.user -> User` is `OneToOne`.
- `Organization.owner -> User` is `OneToOne`.
- Admin has no separate profile model; admin capability is carried directly by `User`.

Important note:
- Role separation is primarily enforced at the application layer.
- The database shape allows one `User` to be referenced broadly, but the product logic treats regular users, organizations, and admins as distinct actors.

## 2. Relationship map by domain

### Identity and auth
- `RegularUserProfile -> User`
- `AccountActionToken -> User`

Purpose:
- `AccountActionToken` handles verification and password-reset flows.
- `RegularUserProfile` carries learner-facing personal metadata.

### Organizations and trust
- `Organization -> User(owner)`
- `Organization.moderated_by -> User(admin/moderator actor)`
- `OrganizationVerificationRequest -> Organization`
- `OrganizationVerificationRequest.requested_by -> User`
- `OrganizationVerificationRequest.reviewed_by -> User`
- `FinancialAccount -> Organization` as `OneToOne`
- `FinancialAccount.reviewed_by -> User`

Purpose:
- `Organization` is the publisher/issuer root for most supply-side content.
- Verification and finance readiness hang off the organization, not off a generic user profile.

### Skills and learner graph
- `UserFieldInterest -> User`
- `UserFieldInterest -> FieldInterest`
- `UserSkill -> User`
- `UserSkill -> Skill`

Purpose:
- These bridge models build the recommendation and matching graph for regular users.

### Skill swap and peer learning
- `MatchSuggestion.source_user -> User`
- `MatchSuggestion.target_user -> User`
- `SkillSwapRequest.requester -> User`
- `SkillSwapRequest.recipient -> User`
- `SkillSwapRequest.match_suggestion -> MatchSuggestion`
- `SkillSwapStatusHistory.swap_request -> SkillSwapRequest`
- `SkillSwapStatusHistory.changed_by -> User`

Purpose:
- Matching is directional (`source_user` to `target_user`).
- A swap request operationalizes a match into a real workflow.
- Status history is a child log of the swap lifecycle.

### Messaging and realtime coordination
- `MessageThread.swap_request -> SkillSwapRequest` as `OneToOne`
- `MessageThread.created_by -> User`
- `ThreadMessage.thread -> MessageThread`
- `ThreadMessage.sender -> User`
- `MessageThreadReadState.thread -> MessageThread`
- `MessageThreadReadState.user -> User`
- `MessageThreadReadState.last_read_message -> ThreadMessage`

Purpose:
- Every active chat thread is anchored to exactly one swap request.
- Read state is tracked per user per thread.

### Learning sessions
- `LearningSession.swap_request -> SkillSwapRequest`
- `LearningSession.created_by -> User`

Purpose:
- Session planning is downstream of peer learning, not standalone.
- Sessions inherit participants implicitly from the swap request.

### Courses and structured learning
- `CourseProgram.organization -> Organization`
- `CourseProgram.admin_reviewed_by -> User`
- `CourseInstructorInvitation.course_program -> CourseProgram`
- `CourseInstructorInvitation.user -> User(nullable)`
- `CourseInstructorInvitation.invited_by -> User`
- `CourseModule.course_program -> CourseProgram`
- `LessonItem.module -> CourseModule`
- `Enrollment.user -> User`
- `Enrollment.course_program -> CourseProgram`
- `EnrollmentLessonProgress.enrollment -> Enrollment`
- `EnrollmentLessonProgress.lesson_item -> LessonItem`

Purpose:
- Organization owns the course.
- Course content is hierarchical: `CourseProgram -> CourseModule -> LessonItem`.
- Learner progression is separate from content definition: `Enrollment -> EnrollmentLessonProgress`.
- Instructor assignment is invitation-driven and may begin before a target user account exists.

### Events
- `Event.organization -> Organization`
- `Event.admin_reviewed_by -> User`
- `EventRSVP.user -> User`
- `EventRSVP.event -> Event`

Purpose:
- Events are organization-published.
- Attendance/interest is represented through RSVP records.

### Opportunities and applications
- `Opportunity.organization -> Organization`
- `Opportunity.admin_reviewed_by -> User`
- `JobApplication.user -> User`
- `JobApplication.opportunity -> Opportunity`

Purpose:
- Opportunity publishing belongs to organizations.
- Application workflow belongs to regular users interacting with organization-owned opportunities.

### Reviews and ratings
- `RatingReview.reviewer -> User`
- `RatingReview.reviewee_user -> User(nullable)`
- `RatingReview.swap_request -> SkillSwapRequest(nullable)`
- `RatingReview.enrollment -> Enrollment(nullable)`
- `RatingReview.course_program -> CourseProgram(nullable)`
- `RatingReview.event_rsvp -> EventRSVP(nullable)`
- `RatingReview.event -> Event(nullable)`

Purpose:
- Reviews are polymorphic by context.
- Review eligibility is tied to participation records rather than to free-floating public reviews.

### Payments and monetization
- `PaymentTransaction.user -> User`
- `PaymentTransaction.course_program -> CourseProgram`
- `PaymentTransaction.organization -> Organization`
- `PaymentTransaction.service_credit_record -> ServiceCreditRecord(nullable)`
- `PaymentWebhookEvent` is standalone and keyed by provider event metadata.

Purpose:
- Payment rows bind learner, course, and organization in one place.
- This supports direct enrollment activation and future payment-linked service-credit handling.

### Communities
- `CommunityGroup.organization -> Organization`
- `CommunityGroup.created_by -> User`
- `CommunityGroup.related_course -> CourseProgram(nullable)`
- `CommunityGroup.related_event -> Event(nullable)`
- `CommunityMembership.community -> CommunityGroup`
- `CommunityMembership.user -> User`
- `CommunityPost.community -> CommunityGroup`
- `CommunityPost.author -> User`

Purpose:
- Communities are organization-rooted, optionally attached to a course or event.
- Membership and posts are user participation records under that community.

### Certificates and service credit
- `ServiceCreditRecord.organization -> Organization`
- `ServiceCreditRecord.user -> User`
- `ServiceCreditRecord.community_group -> CommunityGroup(nullable)`
- `ServiceCreditRecord.event -> Event(nullable)`
- `ServiceCreditRecord.course_program -> CourseProgram(nullable)`
- `ServiceCreditRecord.issued_by -> User(nullable)`
- `Certificate.organization -> Organization`
- `Certificate.user -> User`
- `Certificate.service_credit -> ServiceCreditRecord(nullable)`
- `Certificate.course_program -> CourseProgram(nullable)`
- `Certificate.event -> Event(nullable)`
- `Certificate.issued_by -> User(nullable)`

Purpose:
- Service credit is the participation-evidence layer.
- Certificates are the stronger trust artifact and can be backed by course, event, or service-credit evidence.

### Notifications
- `Notification.user -> User`

Purpose:
- Notifications are actor-specific inbox records.
- The actionable context lives in `metadata` and `action_url`.

### Taxonomy governance
- `ManagedCategory.approved_by -> User`
- `CategorySuggestion.suggested_by -> User`
- `CategorySuggestion.organization -> Organization(nullable)`
- `CategorySuggestion.reviewed_by -> User`

Purpose:
- Taxonomy is centrally governed but suggestions can originate from users or organizations.

### Audit and governance
- `AuditLog.actor -> User(nullable)`

Purpose:
- Audit rows capture security-sensitive and moderation-sensitive actions across domains.
- `actor` is nullable so link-only or system-triggered actions can still be recorded.

### AI and adaptive monitoring
- `CognitiveMonitoringConsentRecord.user -> User`
- `AdaptiveMonitoringCheckIn.user -> User`
- `AdaptiveMonitoringCheckIn.course_program -> CourseProgram(nullable)`

Purpose:
- AI monitoring is tied to a user first, and optionally to a learning context.
- Consent and check-in data are intentionally modeled separately.

## 3. Actor-to-model relationship view

### Guest
- No persistent guest model.
- Reads public-facing records such as:
  - `Organization`
  - `CourseProgram`
  - `Event`
  - `Opportunity`
  - `Certificate` lookup surfaces
- Can interact with tokenized flows without a user row being required first:
  - `CourseInstructorInvitation`

### Regular User
- Root: `User`
- Personal extension:
  - `RegularUserProfile`
  - `UserFieldInterest`
  - `UserSkill`
- Peer learning:
  - `MatchSuggestion`
  - `SkillSwapRequest`
  - `SkillSwapStatusHistory`
  - `MessageThreadReadState`
  - `ThreadMessage`
  - `LearningSession`
- Learning consumption:
  - `Enrollment`
  - `EnrollmentLessonProgress`
  - `CourseInstructorInvitation` as invited/accepted instructor
- Marketplace and participation:
  - `EventRSVP`
  - `JobApplication`
  - `RatingReview`
  - `CommunityMembership`
  - `CommunityPost`
  - `Notification`
  - `Certificate`
  - `ServiceCreditRecord`
  - `PaymentTransaction`
  - `CognitiveMonitoringConsentRecord`
  - `AdaptiveMonitoringCheckIn`

### Organization actor
- Root auth row: `User(role=organization)`
- Business extension:
  - `Organization`
- Trust and finance:
  - `OrganizationVerificationRequest`
  - `FinancialAccount`
- Published assets:
  - `CourseProgram`
  - `Event`
  - `Opportunity`
  - `CommunityGroup`
- Issuance and operations:
  - `CourseInstructorInvitation`
  - `PaymentTransaction`
  - `ServiceCreditRecord`
  - `Certificate`
  - `CategorySuggestion`

### Admin actor
- Root auth row: `User(role=admin)`
- Oversight touchpoints across domains:
  - `Organization.moderated_by`
  - `OrganizationVerificationRequest.reviewed_by`
  - `FinancialAccount.reviewed_by`
  - `CourseProgram.admin_reviewed_by`
  - `Event.admin_reviewed_by`
  - `Opportunity.admin_reviewed_by`
  - `ManagedCategory.approved_by`
  - `CategorySuggestion.reviewed_by`
  - `AuditLog.actor`

## 4. Most important end-to-end chains

### Learner identity to peer learning
- `User -> RegularUserProfile`
- `User -> UserFieldInterest -> FieldInterest`
- `User -> UserSkill -> Skill`
- `User -> MatchSuggestion`
- `User -> SkillSwapRequest -> MessageThread -> ThreadMessage`
- `SkillSwapRequest -> LearningSession`

### Organization to paid learning delivery
- `User(role=organization) -> Organization`
- `Organization -> OrganizationVerificationRequest`
- `Organization -> FinancialAccount`
- `Organization -> CourseProgram -> CourseModule -> LessonItem`
- `CourseProgram -> CourseInstructorInvitation`
- `User(role=regular_user) -> Enrollment -> EnrollmentLessonProgress`
- `User + CourseProgram + Organization -> PaymentTransaction`

### Organization to event and opportunity ecosystem
- `Organization -> Event -> EventRSVP -> RatingReview`
- `Organization -> Opportunity -> JobApplication`
- `Organization -> CommunityGroup -> CommunityMembership -> CommunityPost`

### Trust artifacts
- `Organization/User participation -> ServiceCreditRecord`
- `ServiceCreditRecord/CourseProgram/Event -> Certificate`
- `Certificate -> public lookup/use as trust evidence`

## 5. Structural observations for V1

- The platform is centered on `User`, but almost every supply-side workflow roots itself in `Organization`.
- `CourseProgram`, `Event`, and `Opportunity` are the three main publishable content aggregates.
- `SkillSwapRequest` is the root aggregate for peer-learning coordination; messaging and sessions hang off it.
- `Enrollment` is the root aggregate for learner progress inside courses.
- Trust is layered:
  - organization trust: `OrganizationVerificationRequest`, `FinancialAccount`
  - participation trust: `EventRSVP`, `Enrollment`, `LearningSession`
  - artifact trust: `ServiceCreditRecord`, `Certificate`
- Governance is intentionally cross-cutting rather than isolated in one domain:
  - `AuditLog`
  - review fields on publishable content
  - taxonomy moderation
  - notification traces

## 6. Suggested use of this record

- Use this file as the V1 relationship snapshot when adding new domain apps or new actor workflows.
- If a new feature introduces a new root aggregate, it should be added here under both:
  - domain relationship map
  - actor-to-model relationship view
