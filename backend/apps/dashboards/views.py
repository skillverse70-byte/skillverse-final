from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Prefetch, Q
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response

from apps.common.enums import (
    CourseProgramStatus,
    EventStatus,
    FinancialAccountStatus,
    JobApplicationStatus,
    LearningSessionStatus,
    OpportunityStatus,
    OrganizationVerificationReviewStatus,
    OrganizationVerificationStatus,
    Role,
    RSVPStatus,
    SkillDirection,
    SkillSwapStatus,
)
from apps.common.permissions import IsAdminActor, IsOrganizationActor, IsRegularUser
from apps.courses.models import CourseModule, CourseProgram, Enrollment
from apps.dashboards.serializers import (
    AdminDashboardSerializer,
    OrganizationDashboardSerializer,
    RegularUserDashboardSerializer,
)
from apps.events.models import Event, EventRSVP
from apps.events.serializers import annotate_event_queryset
from apps.opportunities.models import JobApplication, Opportunity
from apps.opportunities.serializers import annotate_opportunity_queryset
from apps.organizations.models import Organization, OrganizationVerificationRequest
from apps.payments.models import FinancialAccount
from apps.sessions.models import LearningSession
from apps.skills.models import UserFieldInterest, UserSkill
from apps.swaps.models import SkillSwapRequest

User = get_user_model()


def learner_dashboard_enrollment_queryset(user):
    return (
        Enrollment.objects.filter(user=user)
        .select_related("course_program", "course_program__organization")
        .prefetch_related(
            "lesson_progresses",
            Prefetch(
                "course_program__modules",
                queryset=CourseModule.objects.prefetch_related("lesson_items"),
            ),
        )
        .order_by("-updated_at", "-id")
    )


def organization_dashboard_enrollment_queryset(organization):
    return (
        Enrollment.objects.filter(course_program__organization=organization)
        .select_related("user", "course_program", "course_program__organization")
        .prefetch_related(
            "lesson_progresses",
            Prefetch(
                "course_program__modules",
                queryset=CourseModule.objects.prefetch_related("lesson_items"),
            ),
        )
        .order_by("-updated_at", "-id")
    )


def regular_user_swap_queryset(user):
    return (
        SkillSwapRequest.objects.filter(Q(requester=user) | Q(recipient=user))
        .select_related(
            "requester",
            "requester__regular_profile",
            "recipient",
            "recipient__regular_profile",
            "match_suggestion",
        )
        .prefetch_related("status_history", "status_history__changed_by", "status_history__changed_by__regular_profile")
        .order_by("-updated_at", "-id")
    )


def regular_user_session_queryset(user):
    return (
        LearningSession.objects.filter(
            Q(swap_request__requester=user) | Q(swap_request__recipient=user)
        )
        .select_related(
            "swap_request",
            "swap_request__requester",
            "swap_request__recipient",
        )
        .order_by("scheduled_start_at", "id")
    )


def regular_user_application_queryset(user):
    return (
        JobApplication.objects.filter(user=user)
        .select_related("opportunity", "opportunity__organization")
        .order_by("-updated_at", "-id")
    )


def regular_user_rsvp_queryset(user):
    return (
        EventRSVP.objects.filter(user=user)
        .select_related("event", "event__organization")
        .order_by("-updated_at", "-id")
    )


def organization_course_queryset(organization):
    return (
        CourseProgram.objects.filter(organization=organization)
        .select_related("organization")
        .annotate(
            total_lessons=Count("modules__lesson_items", distinct=True),
            enrolled_count=Count("enrollments", distinct=True),
            enrollment_count=Count("enrollments", distinct=True),
            active_enrollment_count=Count(
                "enrollments",
                filter=Q(enrollments__status="active"),
                distinct=True,
            ),
            completed_enrollment_count=Count(
                "enrollments",
                filter=Q(enrollments__status="completed"),
                distinct=True,
            ),
            average_progress=Avg("enrollments__progress_percent"),
        )
        .order_by("-updated_at", "-id")
    )


def organization_event_queryset(organization):
    return annotate_event_queryset(
        Event.objects.filter(organization=organization).select_related("organization")
    ).order_by("-starts_at", "-id")


def organization_opportunity_queryset(organization):
    return annotate_opportunity_queryset(
        Opportunity.objects.filter(organization=organization).select_related("organization")
    ).order_by("-updated_at", "-id")


def organization_application_queryset(organization):
    return (
        JobApplication.objects.filter(opportunity__organization=organization)
        .select_related("user", "opportunity", "opportunity__organization")
        .order_by("-updated_at", "-id")
    )


def admin_event_queryset():
    return annotate_event_queryset(
        Event.objects.select_related("organization", "organization__owner", "admin_reviewed_by")
    ).order_by("-updated_at", "-id")


def unique_strings(values):
    seen = set()
    result = []
    for value in values:
        text = str(value or "").strip()
        if not text:
            continue
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(text)
    return result


def build_recommendation_signals(*, user, enrollments, applications, rsvps, sessions):
    profile_fields = list(
        UserFieldInterest.objects.filter(user=user)
        .select_related("field_interest")
        .values_list("field_interest__name", flat=True)
    )
    offered_skills = list(
        UserSkill.objects.filter(user=user, direction__in=[SkillDirection.OFFERING, SkillDirection.BOTH])
        .select_related("skill")
        .values_list("skill__name", flat=True)
    )
    learning_skills = list(
        UserSkill.objects.filter(user=user, direction__in=[SkillDirection.REQUESTING, SkillDirection.BOTH])
        .select_related("skill")
        .values_list("skill__name", flat=True)
    )

    course_categories = unique_strings(
        enrollment.course_program.category for enrollment in enrollments if enrollment.course_program.category
    )
    event_fields = unique_strings(
        field_name
        for rsvp in rsvps
        for field_name in (rsvp.event.field_signals or [])
    )
    application_fields = unique_strings(
        field_name
        for application in applications
        for field_name in (application.opportunity.field_signals or [])
    )

    activity_signals = []
    if any(enrollment.status == "completed" for enrollment in enrollments):
        activity_signals.append("course_completion")
    if any(session.status == LearningSessionStatus.COMPLETED for session in sessions):
        activity_signals.append("session_completion")
    if any(rsvp.attended_at is not None for rsvp in rsvps):
        activity_signals.append("event_attendance")
    if any(application.status == JobApplicationStatus.HIRED for application in applications):
        activity_signals.append("opportunity_success")

    return {
        "profile_fields": unique_strings(profile_fields),
        "offered_skills": unique_strings(offered_skills),
        "learning_skills": unique_strings(learning_skills),
        "course_categories": course_categories,
        "event_fields": event_fields,
        "application_fields": application_fields,
        "activity_signals": activity_signals,
    }


@extend_schema_view(
    get=extend_schema(
        tags=["dashboards"],
        operation_id="dashboard_regular_overview",
        responses={200: RegularUserDashboardSerializer},
    )
)
class RegularUserDashboardView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]

    def get(self, request):
        enrollments = list(learner_dashboard_enrollment_queryset(request.user))
        sessions = list(regular_user_session_queryset(request.user))
        swap_requests = list(regular_user_swap_queryset(request.user))
        applications = list(regular_user_application_queryset(request.user))
        rsvps = list(regular_user_rsvp_queryset(request.user))

        payload = {
            "user": request.user,
            "stats": {
                "active_courses": sum(1 for item in enrollments if item.status == "active"),
                "completed_courses": sum(1 for item in enrollments if item.status == "completed"),
                "pending_swap_requests": sum(
                    1 for item in swap_requests if item.status == SkillSwapStatus.PENDING
                ),
                "active_swaps": sum(
                    1 for item in swap_requests if item.status == SkillSwapStatus.ACCEPTED
                ),
                "upcoming_sessions": sum(
                    1
                    for item in sessions
                    if item.status in [LearningSessionStatus.PLANNED, LearningSessionStatus.CONFIRMED]
                ),
                "applications": len(applications),
                "active_rsvps": sum(
                    1 for item in rsvps if item.status in [RSVPStatus.GOING, RSVPStatus.INTERESTED]
                ),
            },
            "recommendation_signals": build_recommendation_signals(
                user=request.user,
                enrollments=enrollments,
                applications=applications,
                rsvps=rsvps,
                sessions=sessions,
            ),
            "enrollments": enrollments,
            "sessions": sessions,
            "swap_requests": swap_requests,
            "applications": applications,
            "rsvps": rsvps,
        }
        serializer = RegularUserDashboardSerializer(payload, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        tags=["dashboards"],
        operation_id="dashboard_organization_overview",
        responses={200: OrganizationDashboardSerializer},
    )
)
class OrganizationDashboardView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActor]

    def get(self, request):
        organization = Organization.objects.select_related("owner", "financial_account").get(
            owner=request.user
        )
        verification_queryset = organization.verification_requests.select_related(
            "organization",
            "requested_by",
            "reviewed_by",
        )

        courses = list(organization_course_queryset(organization))
        enrollments = list(organization_dashboard_enrollment_queryset(organization))
        events = list(organization_event_queryset(organization))
        opportunities = list(organization_opportunity_queryset(organization))
        applications = list(organization_application_queryset(organization))

        total_event_rsvps = sum(int(getattr(event, "total_rsvp_count", 0) or 0) for event in events)
        course_performance = [
            {
                "id": course.id,
                "title": course.title,
                "status": course.status,
                "is_free": course.is_free,
                "enrollment_count": int(getattr(course, "enrollment_count", 0) or 0),
                "active_enrollment_count": int(getattr(course, "active_enrollment_count", 0) or 0),
                "completed_enrollment_count": int(getattr(course, "completed_enrollment_count", 0) or 0),
                "average_progress_percent": int(round(float(getattr(course, "average_progress", 0) or 0))),
            }
            for course in sorted(
                courses,
                key=lambda item: (
                    int(getattr(item, "enrollment_count", 0) or 0),
                    float(getattr(item, "average_progress", 0) or 0),
                ),
                reverse=True,
            )[:5]
        ]

        payload = {
            "organization": organization,
            "verification": {
                "organization": organization,
                "latest_request": verification_queryset.first(),
                "pending_request": verification_queryset.filter(
                    status=OrganizationVerificationReviewStatus.PENDING
                ).first(),
                "history": verification_queryset,
            },
            "financial_account": getattr(organization, "financial_account", None),
            "stats": {
                "total_courses": len(courses),
                "published_courses": sum(
                    1 for item in courses if item.status == CourseProgramStatus.PUBLISHED
                ),
                "active_enrollments": sum(1 for item in enrollments if item.status == "active"),
                "completed_enrollments": sum(
                    1 for item in enrollments if item.status == "completed"
                ),
                "open_opportunities": sum(
                    1 for item in opportunities if item.status == OpportunityStatus.OPEN
                ),
                "total_applications": len(applications),
                "hired_applicants": sum(
                    1 for item in applications if item.status == JobApplicationStatus.HIRED
                ),
                "active_events": sum(
                    1 for item in events if item.status in [EventStatus.UPCOMING, EventStatus.LIVE]
                ),
                "total_event_rsvps": total_event_rsvps,
            },
            "course_performance": course_performance,
            "courses": courses,
            "enrollments": enrollments,
            "events": events,
            "opportunities": opportunities,
            "applications": applications,
        }
        serializer = OrganizationDashboardSerializer(payload, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        tags=["dashboards", "admin"],
        operation_id="dashboard_admin_overview",
        responses={200: AdminDashboardSerializer},
    )
)
class AdminDashboardView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]

    def get(self, request):
        verification_requests = list(
            OrganizationVerificationRequest.objects.select_related(
                "organization",
                "organization__owner",
                "requested_by",
                "reviewed_by",
            ).order_by("-submitted_at", "-id")
        )
        financial_accounts = list(
            FinancialAccount.objects.select_related(
                "organization",
                "organization__owner",
                "reviewed_by",
            ).order_by("-updated_at", "-id")
        )
        events = list(admin_event_queryset())

        payload = {
            "summary": {
                "total_users": User.objects.count(),
                "regular_users": User.objects.filter(role=Role.REGULAR_USER).count(),
                "organizations": Organization.objects.count(),
                "verified_organizations": Organization.objects.filter(
                    verification_status=OrganizationVerificationStatus.VERIFIED
                ).count(),
                "published_courses": CourseProgram.objects.filter(
                    status=CourseProgramStatus.PUBLISHED
                ).count(),
                "active_enrollments": Enrollment.objects.filter(status="active").count(),
                "open_opportunities": Opportunity.objects.filter(
                    status=OpportunityStatus.OPEN
                ).count(),
                "active_events": Event.objects.filter(
                    status__in=[EventStatus.UPCOMING, EventStatus.LIVE]
                ).count(),
            },
            "oversight": {
                "pending_verification_requests": sum(
                    1
                    for item in verification_requests
                    if item.status == OrganizationVerificationReviewStatus.PENDING
                ),
                "pending_financial_accounts": sum(
                    1 for item in financial_accounts if item.status == FinancialAccountStatus.PENDING
                ),
                "restricted_financial_accounts": sum(
                    1
                    for item in financial_accounts
                    if item.status == FinancialAccountStatus.RESTRICTED
                ),
                "events_from_unverified_organizations": sum(
                    1
                    for item in events
                    if item.organization.verification_status == OrganizationVerificationStatus.UNVERIFIED
                ),
                "reviewed_events": sum(1 for item in events if item.admin_reviewed_at is not None),
            },
            "organization_verification_requests": verification_requests,
            "financial_accounts": financial_accounts,
            "events": events,
        }
        serializer = AdminDashboardSerializer(payload, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

