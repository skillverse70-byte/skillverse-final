from apps.common.enums import JobApplicationStatus, LearningSessionStatus, SkillDirection
from apps.skills.models import UserFieldInterest, UserSkill


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
