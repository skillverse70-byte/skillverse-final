# SkillVerse V1 Test Records

Source of truth:
- Seed command: `backend/apps/accounts/management/commands/seed_v1_records.py`
- Relationship snapshot: `Agents/Versions/v1/MODEL_RELATIONSHIPS.md`

This dataset is intended for manual system testing.
The seed command is idempotent for the named records below and resets the password for the documented seed users.

## 1. How to seed

Run from `backend/`:

```powershell
python manage.py seed_v1_records
```

Default seeded password for the documented users:

```text
StrongPass123!
```

## 2. Primary actor records

These are the three main accounts you asked for.

### Regular user
- Email: `hawibekele4913@gmail.com`
- Role: `regular_user`
- Password: `StrongPass123!`
- Status notes:
  - email verified
  - has profile, skills, field interests
  - has active enrollments
  - has pending instructor invitation
  - has swap, event, payment, community, notification, AI, and certificate-linked records

### Organization
- Email: `amanuel7245@gmail.com`
- Role: `organization`
- Password: `StrongPass123!`
- Organization record: `V1 Verified SkillVerse Org`
- Status notes:
  - organization verified
  - finance ready
  - owns published free, paid, and community-service courses
  - owns events, opportunities, communities, invitations, certificates, and service-credit issuance flows

### Admin
- Email: `skillverse07@gmail.com`
- Role: `admin`
- Password: `StrongPass123!`
- Status notes:
  - `is_staff=True`
  - `is_superuser=True`
  - attached to moderation, verification, finance review, taxonomy approval, and audit scenarios

## 3. Support actor records

These exist so every scenario and status can be tested without overloading the three primary accounts.

### Additional regular users
- `seed.peer.regular@example.com`
- `seed.reviewer.regular@example.com`
- `seed.candidate.regular@example.com`
- `seed.withdrawn.regular@example.com`
- `seed.rejected.regular@example.com`
- `seed.unverified.regular@example.com`

All use password `StrongPass123!`.

### Additional organization owners
- `seed.org.pending@example.com`
- `seed.org.restricted@example.com`
- `seed.org.notstarted@example.com`

All use password `StrongPass123!`.

## 4. Model-by-model seeded record coverage

## User

### Seeded records
- `hawibekele4913@gmail.com` -> primary regular user
- `amanuel7245@gmail.com` -> primary organization owner
- `skillverse07@gmail.com` -> admin
- 6 support regular users
- 3 support organization owners

### Scenario coverage
- verified user
- unverified user
- regular user actor
- organization actor
- admin actor

## RegularUserProfile

### Seeded records
- profiles exist for all regular-user accounts

### Scenario coverage
- beginner/student profile
- early-career profile
- mid-career profile
- experienced profile

## AccountActionToken

### Seeded records
- `V1VERIFY01` -> active email verification token
- `V1VERIFYUSED` -> used email verification token
- `v1-password-reset-active` -> active password reset token
- `v1-password-reset-expired` -> expired password reset token

### Scenario coverage
- email verification active
- email verification used
- password reset active
- password reset expired

## Organization

### Seeded records
- `V1 Verified SkillVerse Org`
- `V1 Pending SkillVerse Org`
- `V1 Restricted SkillVerse Org`
- `V1 Not Started SkillVerse Org`

### Scenario coverage
- verified organization
- unverified organization
- suspended organization
- moderated organization
- finance-ready org
- finance-pending org
- finance-restricted org
- finance-not-started org

## OrganizationVerificationRequest

### Seeded records
- `V1 approved verification path`
- `V1 pending verification path`
- `V1 rejected verification path`

### Status coverage
- `approved`
- `pending`
- `rejected`

## FinancialAccount

### Seeded records
- main org finance account
- pending org finance account
- restricted org finance account
- not-started org finance account

### Status coverage
- `ready`
- `pending`
- `restricted`
- `not_started`

## FieldInterest

### Seeded records
- `Crafts and Handmade Work`
- `Community and Volunteering`
- `Information Technology`
- `Music and Arts`

## UserFieldInterest

### Seeded records
- primary regular user linked to IT, music, and craft interests
- support users linked to craft, community, IT, and data scenarios

## Skill

### Seeded records
- `Python Programming`
- `React UI Development`
- `Community Facilitation`
- `Research and Analysis`
- `Django Web Development`
- `Handicraft`
- `IT Support`
- `Guitar`
- `Customer Service`
- `Tailoring`

## UserSkill

### Scenario coverage
- `offering`
- `requesting`
- `both`

### Seeded records
- primary regular has offering, requesting, and both examples
- support users cover additional skill combinations

## ManagedCategory

### Seeded records
- one approved managed category per taxonomy domain:
  - `field_interest`
  - `skill`
  - `course_category`
  - `event_category`
  - `opportunity_category`

## CourseProgram

### Seeded records
- `Practical IT Support Foundations`
- `Creative Web Design Bootcamp`
- `Community Facilitation and Outreach`
- `Handmade Business Starter Track`
- `Creative Studio Launchpad`

### Status coverage
- `published`
- `draft`
- `archived`

### Scenario coverage
- free course
- paid course
- community-service course
- admin-reviewed course
- restricted-org archived course

## CourseModule

### Seeded records
- multi-module structures under the IT support, web design, community service, draft, and archived courses

## LessonItem

### Lesson type coverage
- `video`
- `reading`
- `resource`
- `checklist`
- `assessment`
- `quiz`
- `assignment`

### Example seeded lesson titles
- `Welcome to IT Support`
- `Service Desk Reading Pack`
- `Workspace Readiness Checklist`
- `Troubleshooting Assessment`
- `Brand Design Overview`
- `Audience Planning Checklist`
- `Landing Page Assignment`
- `Community Brief`
- `Reflection Submission`

## CourseInstructorInvitation

### Seeded records
- `v1-invite-pending-main-regular`
- `v1-invite-accepted-peer`
- `v1-invite-declined-reviewer`
- `v1-invite-revoked-external`
- `v1-invite-expired-external`

### Status coverage
- `pending`
- `accepted`
- `declined`
- `revoked`
- `expired`

### Scenario coverage
- registered invite target
- external email invite target
- dashboard-visible pending invitation
- accepted instructor attachment

## MatchSuggestion

### Seeded records
- regular -> peer direct match
- peer -> regular partial-overlap match
- reviewer -> regular field-relevant match

### Type coverage
- `direct_swap`
- `partial_overlap`
- `field_relevant`

## SkillSwapRequest

### Seeded records
- `V1 pending swap request`
- `V1 accepted swap request`
- `V1 rejected swap request`
- `V1 cancelled swap request`
- `V1 completed swap request`

### Status coverage
- `pending`
- `accepted`
- `rejected`
- `cancelled`
- `completed`

## SkillSwapStatusHistory

### Scenario coverage
- pending creation
- accepted transition
- rejected transition
- cancelled transition
- completed lifecycle

## MessageThread

### Seeded records
- one thread for the accepted swap
- one thread for the completed swap

## ThreadMessage

### Scenario coverage
- text message
- resource message
- two-way conversation

## MessageThreadReadState

### Scenario coverage
- fully read thread state
- partially read thread state

## LearningSession

### Seeded records
- `IT Support Practice Session`
- `Guitar Coaching Session`
- `Handicraft Planning Session`
- `Community Wrap-Up Session`

### Status coverage
- `planned`
- `confirmed`
- `cancelled`
- `completed`

## Event

### Seeded records
- `Hands-On Tech Support Clinic`
- `Guitar Jam and Mentoring Night`
- `Local Makers Showcase`
- `Neighbourhood Repair and Support Drive`

### Status coverage
- `upcoming`
- `live`
- `completed`
- `cancelled`

## EventRSVP

### Seeded records
- primary regular -> upcoming event
- peer -> live event
- reviewer -> cancelled event
- primary regular -> completed event with attendance

### Status coverage
- `going`
- `interested`
- `cancelled`

### Scenario coverage
- attended RSVP
- non-attended RSVP

## Opportunity

### Seeded records
- `IT Support Assistant`
- `Craft Operations Intern`
- `Community Program Coordinator`
- `Guitar Workshop Volunteer`

### Type coverage
- `job`
- `internship`
- `program`
- `volunteer`

### Status coverage
- `open`
- `draft`
- `filled`
- `closed`

## JobApplication

### Status coverage
- `applied`
- `shortlisted`
- `interview`
- `hired`
- `rejected`
- `withdrawn`

### Example mapping
- primary regular -> applied
- peer -> shortlisted
- reviewer -> interview
- candidate -> hired
- rejected user -> rejected
- withdrawn user -> withdrawn

## Enrollment

### Seeded records
- primary regular free-course enrollment -> active
- primary regular paid-course enrollment -> active
- candidate community-course enrollment -> completed
- reviewer free-course enrollment -> cancelled
- withdrawn user paid-course enrollment -> pending

### Status coverage
- `pending`
- `active`
- `completed`
- `cancelled`

## EnrollmentLessonProgress

### Scenario coverage
- partial progress
- paid-course progress
- fully completed community-course progress

## ServiceCreditRecord

### Seeded records
- `Community Outreach Service Credit`
- `Makers Support Service Credit`

### Status coverage
- `issued`
- `revoked`

## Certificate

### Seeded records
- `SV-CERT-V1COURSE`
- `SV-CERT-V1EVENT`
- `SV-CERT-V1SERVICE`

### Source-type coverage
- `course_completion`
- `event_participation`
- `service_credit`

### Status coverage
- `active`
- `revoked`

## PaymentTransaction

### Seeded transaction refs
- `v1-tx-paid-success`
- `v1-tx-paid-pending`
- `v1-tx-paid-failed`
- `v1-tx-paid-cancelled`
- `v1-tx-paid-refunded`
- `v1-tx-paid-reversed`
- `v1-tx-community-success`

### Payment status coverage
- `pending`
- `succeeded`
- `failed`
- `cancelled`
- `refunded`
- `reversed`

### Purpose coverage
- `course_enrollment`
- `community_service_enrollment`

### Automation status coverage
- `none`
- `pending`
- `completed`
- `failed`

## PaymentWebhookEvent

### Seeded records
- `v1-webhook-processed`
- `v1-webhook-unprocessed`

### Scenario coverage
- processed webhook event
- pending/unprocessed webhook event

## RatingReview

### Scenario coverage
- skill swap review
- course review
- event review

### Context coverage
- `skill_swap`
- `course`
- `event`

## CommunityGroup

### Seeded records
- `V1 Public Community`
- `V1 Members Only Community`

### Visibility coverage
- `public`
- `members_only`

### Scenario coverage
- active community
- inactive community
- related course link
- related event link

## CommunityMembership

### Role coverage
- `member`
- `moderator`

## CommunityPost

### Seeded records
- learner post in public community
- moderator reply in public community

## Notification

### Notification type coverage
- `auth`
- `verification`
- `swap`
- `message`
- `session`
- `course`
- `enrollment`
- `event`
- `opportunity`
- `community`
- `certificate`
- `admin`

### Scenario coverage
- read notifications
- unread notifications
- emailed notifications
- non-emailed notifications

## CategorySuggestion

### Seeded records
- `V1 Pending Skill Suggestion`
- `V1 Approved Course Suggestion`
- `V1 Rejected Event Suggestion`

### Status coverage
- `pending`
- `approved`
- `rejected`

## AuditLog

### Seeded records
- admin approval log
- organization publish log
- regular-user swap acceptance log
- null-actor link-only invitation log

### Scenario coverage
- user actor log
- admin actor log
- nullable actor log

## CognitiveMonitoringConsentRecord

### Feature coverage
- `recommendations`
- `learning_guidance`
- `assignment_feedback`
- `cognitive_monitoring`

### Status coverage
- `active`
- `revoked`

## AdaptiveMonitoringCheckIn

### Mood coverage
- `energized`
- `steady`
- `tired`
- `distracted`
- `stuck`
- `overwhelmed`

### Scenario coverage
- dashboard-linked check-ins
- course-linked check-ins

## 5. Quick test pointers

### For regular-user dashboard testing
Use:
- `hawibekele4913@gmail.com`

Look for:
- active enrollments
- pending instructor invitation
- event RSVPs
- notifications
- AI/adaptive records

### For organization dashboard testing
Use:
- `amanuel7245@gmail.com`

Look for:
- published courses
- instructor invitations
- events
- job pipeline
- financial readiness
- service-credit and certificate issuance flows

### For admin dashboard testing
Use:
- `skillverse07@gmail.com`

Look for:
- verification history
- finance review states
- moderation-linked assets
- taxonomy governance
- audit visibility

## 6. Coverage note

This seed set is designed to touch every current Django model and all current status-driven record families in the codebase.
If a new model or enum status is added later, update both:
- `backend/apps/accounts/management/commands/seed_v1_records.py`
- `Agents/Versions/v1/V1_TEST_RECORDS.md`
