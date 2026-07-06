from django.core.exceptions import ValidationError
from django.db import transaction

from apps.common.enums import EnrollmentStatus, ReviewContext, SkillSwapStatus
from apps.courses.models import Enrollment
from apps.events.models import EventRSVP
from apps.reviews.models import RatingReview
from apps.sessions.models import LearningSession
from apps.swaps.models import SkillSwapRequest


def _swap_eligibility(user, source_id):
    swap_request = (
        SkillSwapRequest.objects.select_related("requester", "recipient")
        .filter(id=source_id)
        .first()
    )
    if swap_request is None:
        return {
            "context": ReviewContext.SKILL_SWAP,
            "source_id": source_id,
            "eligible": False,
            "reason": "Skill swap was not found.",
            "existing_review_id": None,
            "target": None,
        }

    if user not in (swap_request.requester, swap_request.recipient):
        return {
            "context": ReviewContext.SKILL_SWAP,
            "source_id": source_id,
            "eligible": False,
            "reason": "Only swap participants can review this exchange.",
            "existing_review_id": None,
            "target": None,
        }

    has_completed_session = LearningSession.objects.filter(
        swap_request=swap_request,
        status="completed",
    ).exists()
    if swap_request.status != SkillSwapStatus.COMPLETED and not has_completed_session:
        return {
            "context": ReviewContext.SKILL_SWAP,
            "source_id": source_id,
            "eligible": False,
            "reason": "A completed swap session is required before leaving a review.",
            "existing_review_id": None,
            "target": None,
        }

    existing_review = RatingReview.objects.filter(
        reviewer=user,
        context=ReviewContext.SKILL_SWAP,
        swap_request=swap_request,
    ).first()
    target_user = (
        swap_request.recipient if user == swap_request.requester else swap_request.requester
    )
    return {
        "context": ReviewContext.SKILL_SWAP,
        "source_id": source_id,
        "eligible": existing_review is None,
        "reason": (
            "You have already reviewed this completed swap."
            if existing_review is not None
            else "Eligible to review this completed skill swap."
        ),
        "existing_review_id": existing_review.id if existing_review else None,
        "target": {"id": target_user.id, "full_name": target_user.full_name},
        "swap_request": swap_request,
        "reviewee_user": target_user,
    }


def _course_eligibility(user, source_id):
    enrollment = (
        Enrollment.objects.select_related("course_program", "course_program__organization")
        .filter(id=source_id)
        .first()
    )
    if enrollment is None:
        return {
            "context": ReviewContext.COURSE,
            "source_id": source_id,
            "eligible": False,
            "reason": "Course participation record was not found.",
            "existing_review_id": None,
            "target": None,
        }
    if enrollment.user != user:
        return {
            "context": ReviewContext.COURSE,
            "source_id": source_id,
            "eligible": False,
            "reason": "Only the enrolled learner can review this course.",
            "existing_review_id": None,
            "target": None,
        }
    if enrollment.status != EnrollmentStatus.COMPLETED:
        return {
            "context": ReviewContext.COURSE,
            "source_id": source_id,
            "eligible": False,
            "reason": "Course reviews unlock only after completed participation.",
            "existing_review_id": None,
            "target": {"id": enrollment.course_program.id, "title": enrollment.course_program.title},
        }

    existing_review = RatingReview.objects.filter(
        reviewer=user,
        context=ReviewContext.COURSE,
        enrollment=enrollment,
    ).first()
    return {
        "context": ReviewContext.COURSE,
        "source_id": source_id,
        "eligible": existing_review is None,
        "reason": (
            "You have already reviewed this completed course."
            if existing_review is not None
            else "Eligible to review this completed course."
        ),
        "existing_review_id": existing_review.id if existing_review else None,
        "target": {"id": enrollment.course_program.id, "title": enrollment.course_program.title},
        "enrollment": enrollment,
        "course_program": enrollment.course_program,
    }


def _event_eligibility(user, source_id):
    event_rsvp = (
        EventRSVP.objects.select_related("event", "event__organization")
        .filter(id=source_id)
        .first()
    )
    if event_rsvp is None:
        return {
            "context": ReviewContext.EVENT,
            "source_id": source_id,
            "eligible": False,
            "reason": "Event participation record was not found.",
            "existing_review_id": None,
            "target": None,
        }
    if event_rsvp.user != user:
        return {
            "context": ReviewContext.EVENT,
            "source_id": source_id,
            "eligible": False,
            "reason": "Only the attendee can review this event.",
            "existing_review_id": None,
            "target": None,
        }
    if event_rsvp.attended_at is None:
        return {
            "context": ReviewContext.EVENT,
            "source_id": source_id,
            "eligible": False,
            "reason": "Event reviews unlock only after attendance is recorded.",
            "existing_review_id": None,
            "target": {"id": event_rsvp.event.id, "title": event_rsvp.event.title},
        }

    existing_review = RatingReview.objects.filter(
        reviewer=user,
        context=ReviewContext.EVENT,
        event_rsvp=event_rsvp,
    ).first()
    return {
        "context": ReviewContext.EVENT,
        "source_id": source_id,
        "eligible": existing_review is None,
        "reason": (
            "You have already reviewed this event."
            if existing_review is not None
            else "Eligible to review this attended event."
        ),
        "existing_review_id": existing_review.id if existing_review else None,
        "target": {"id": event_rsvp.event.id, "title": event_rsvp.event.title},
        "event_rsvp": event_rsvp,
        "event": event_rsvp.event,
    }


def get_review_eligibility(*, user, context, source_id):
    if context == ReviewContext.SKILL_SWAP:
        return _swap_eligibility(user, source_id)
    if context == ReviewContext.COURSE:
        return _course_eligibility(user, source_id)
    if context == ReviewContext.EVENT:
        return _event_eligibility(user, source_id)
    raise ValidationError("Unsupported review context.")


@transaction.atomic
def create_rating_review(*, reviewer, context, source_id, rating, comment=""):
    eligibility = get_review_eligibility(user=reviewer, context=context, source_id=source_id)
    if not eligibility["eligible"]:
        raise ValidationError(eligibility["reason"])

    if context == ReviewContext.SKILL_SWAP:
        return RatingReview.objects.create(
            reviewer=reviewer,
            reviewee_user=eligibility["reviewee_user"],
            context=context,
            rating=rating,
            comment=comment,
            swap_request=eligibility["swap_request"],
        )
    if context == ReviewContext.COURSE:
        return RatingReview.objects.create(
            reviewer=reviewer,
            context=context,
            rating=rating,
            comment=comment,
            enrollment=eligibility["enrollment"],
            course_program=eligibility["course_program"],
        )
    if context == ReviewContext.EVENT:
        return RatingReview.objects.create(
            reviewer=reviewer,
            context=context,
            rating=rating,
            comment=comment,
            event_rsvp=eligibility["event_rsvp"],
            event=eligibility["event"],
        )
    raise ValidationError("Unsupported review context.")
