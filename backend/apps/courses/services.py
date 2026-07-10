from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.common.email import render_email_html, send_platform_email
from apps.common.enums import CourseInstructorInvitationStatus, EnrollmentStatus, Role
from apps.courses.models import (
    CourseInstructorInvitation,
    Enrollment,
    EnrollmentLessonProgress,
)

User = get_user_model()


def ordered_modules(course_program):
    return sorted(
        course_program.modules.all(),
        key=lambda module: (module.sort_order, module.id),
    )


def ordered_lessons(module):
    return sorted(
        module.lesson_items.all(),
        key=lambda lesson: (lesson.sort_order, lesson.id),
    )


def enrollment_completion_map(enrollment):
    return {
        progress.lesson_item_id: progress
        for progress in enrollment.lesson_progresses.filter(is_completed=True)
    }


def calculate_progression_state(enrollment):
    completed_progress = enrollment_completion_map(enrollment)
    modules_payload = []
    total_lessons = 0
    completed_lessons = 0
    next_lesson_id = None
    progression_blocked = False

    for module in ordered_modules(enrollment.course_program):
        lessons_payload = []
        for lesson in ordered_lessons(module):
            total_lessons += 1
            completed = lesson.id in completed_progress
            unlocked = not progression_blocked

            if completed:
                completed_lessons += 1

            if next_lesson_id is None and unlocked and not completed:
                next_lesson_id = lesson.id

            lessons_payload.append(
                {
                    "id": lesson.id,
                    "title": lesson.title,
                    "type": lesson.item_type,
                    "description": lesson.description,
                    "content_url": lesson.content_url,
                    "content_file_url": lesson.content_file.url if lesson.content_file else "",
                    "has_content_file": bool(lesson.content_file),
                    "checklist_items": list(lesson.checklist_items or []),
                    "duration_minutes": lesson.duration_minutes,
                    "sort_order": lesson.sort_order,
                    "is_required": lesson.is_required,
                    "progression_gate": lesson.progression_gate,
                    "is_completed": completed,
                    "is_unlocked": unlocked,
                }
            )

            if lesson.progression_gate and not completed:
                progression_blocked = True

        modules_payload.append(
            {
                "id": module.id,
                "title": module.title,
                "description": module.description,
                "sort_order": module.sort_order,
                "lessons": lessons_payload,
            }
        )

    progress_percent = 0
    if total_lessons:
        progress_percent = round((completed_lessons / total_lessons) * 100)

    return {
        "modules": modules_payload,
        "total_lessons": total_lessons,
        "completed_lessons": completed_lessons,
        "progress_percent": progress_percent,
        "next_lesson_id": next_lesson_id,
    }


def sync_enrollment_state(enrollment):
    previous_status = enrollment.status
    state = calculate_progression_state(enrollment)
    enrollment.progress_percent = state["progress_percent"]

    if state["total_lessons"] > 0 and state["completed_lessons"] >= state["total_lessons"]:
        enrollment.status = EnrollmentStatus.COMPLETED
        if enrollment.completed_at is None:
            enrollment.completed_at = timezone.now()
    else:
        enrollment.status = EnrollmentStatus.ACTIVE
        enrollment.completed_at = None

    enrollment.save(update_fields=["progress_percent", "status", "completed_at", "updated_at"])
    if (
        previous_status != EnrollmentStatus.COMPLETED
        and enrollment.status == EnrollmentStatus.COMPLETED
    ):
        transaction.on_commit(lambda: handle_completed_enrollment(enrollment.id))
    return state


def activate_paid_enrollment(payment_transaction):
    if payment_transaction.status != "succeeded":
        raise ValueError("A payment must be verified before enrollment activation.")
    assert_user_can_enroll_as_learner(
        payment_transaction.user,
        payment_transaction.course_program,
    )

    try:
        with transaction.atomic():
            enrollment, _ = Enrollment.objects.get_or_create(
                user=payment_transaction.user,
                course_program=payment_transaction.course_program,
                defaults={"status": EnrollmentStatus.ACTIVE},
            )
    except IntegrityError:
        enrollment = Enrollment.objects.get(
            user=payment_transaction.user,
            course_program=payment_transaction.course_program,
        )

    sync_enrollment_state(enrollment)
    transaction.on_commit(
        lambda: notify_paid_enrollment_activated(enrollment.id, payment_transaction.id)
    )
    return enrollment


def complete_lesson_for_enrollment(enrollment, lesson_item):
    state = calculate_progression_state(enrollment)

    lesson_state = None
    for module in state["modules"]:
        for lesson in module["lessons"]:
            if lesson["id"] == lesson_item.id:
                lesson_state = lesson
                break
        if lesson_state:
            break

    if lesson_state is None:
        raise ValueError("This lesson does not belong to the selected course.")

    if not lesson_state["is_unlocked"]:
        raise PermissionError("Complete the required gated lesson before accessing this content.")

    EnrollmentLessonProgress.objects.update_or_create(
        enrollment=enrollment,
        lesson_item=lesson_item,
        defaults={
            "is_completed": True,
            "completed_at": timezone.now(),
        },
    )

    return sync_enrollment_state(enrollment)


def sync_course_instructor_invitation(invitation):
    invitation.sync_expired_status()
    return invitation


def sync_course_instructor_invitations_for_course(course_program):
    invitations = list(course_program.instructor_invitations.all())
    for invitation in invitations:
        sync_course_instructor_invitation(invitation)
    return invitations


def accepted_course_instructors(course_program):
    invitations = getattr(course_program, "_prefetched_objects_cache", {}).get(
        "instructor_invitations"
    )
    if invitations is None:
        invitations = list(
            course_program.instructor_invitations.select_related("user").all()
        )

    accepted = []
    for invitation in invitations:
        if invitation.status != CourseInstructorInvitationStatus.ACCEPTED:
            continue
        if invitation.user is None:
            continue
        accepted.append(invitation.user)
    return accepted


def regular_user_instructor_invitations_queryset(user):
    normalized_email = _normalize_invited_email(getattr(user, "email", ""))
    if not normalized_email:
        return CourseInstructorInvitation.objects.none()

    return (
        CourseInstructorInvitation.objects.select_related(
            "user",
            "invited_by",
            "course_program",
            "course_program__organization",
        )
        .filter(user=user)
        .order_by("-last_sent_at", "-created_at", "-id")
    )


def _normalize_invited_email(invited_email):
    return str(invited_email or "").strip().lower()


def get_course_instructor_invitation_by_token(token):
    normalized_token = str(token or "").strip()
    if not normalized_token:
        return None

    invitation = (
        CourseInstructorInvitation.objects.select_related(
            "user",
            "invited_by",
            "course_program",
            "course_program__organization",
            "course_program__organization__owner",
        )
        .filter(token=normalized_token)
        .first()
    )
    if invitation is None:
        return None
    return sync_course_instructor_invitation(invitation)


def is_user_assigned_course_instructor(user, course_program):
    if not getattr(user, "is_authenticated", False):
        return False

    return CourseInstructorInvitation.objects.filter(
        course_program=course_program,
        user=user,
        status=CourseInstructorInvitationStatus.ACCEPTED,
    ).exists()


def assert_user_can_enroll_as_learner(user, course_program):
    if is_user_assigned_course_instructor(user, course_program):
        raise PermissionError(
            "Assigned instructors cannot enroll in or track progress for their own course as learners."
        )


def _validate_invitation_actor(invitation, user):
    if user is None:
        return

    if user.role != Role.REGULAR_USER:
        raise PermissionError("Only regular-user accounts can respond to instructor invitations.")

    if not user.email or _normalize_invited_email(user.email) != invitation.invited_email:
        raise PermissionError("This invitation was sent to a different email address.")

    if invitation.user_id and invitation.user_id != user.id:
        raise PermissionError("This invitation is already tied to a different account.")


def respond_to_course_instructor_invitation(invitation, *, user, action):
    invitation = sync_course_instructor_invitation(invitation)
    _validate_invitation_actor(invitation, user)

    if invitation.status == CourseInstructorInvitationStatus.REVOKED:
        raise ValueError("This instructor invitation was revoked.")
    if invitation.status == CourseInstructorInvitationStatus.EXPIRED:
        raise ValueError("This instructor invitation has expired.")
    if invitation.status == CourseInstructorInvitationStatus.ACCEPTED:
        raise ValueError("This instructor invitation has already been accepted.")
    if invitation.status == CourseInstructorInvitationStatus.DECLINED:
        raise ValueError("This instructor invitation has already been declined.")

    update_fields = ["status", "updated_at"]
    if user is not None and invitation.user_id != user.id:
        invitation.user = user
        update_fields.append("user")

    if action == "accept":
        invitation.status = CourseInstructorInvitationStatus.ACCEPTED
        invitation.accepted_at = timezone.now()
        invitation.declined_at = None
        invitation.revoked_at = None
        update_fields.extend(["accepted_at", "declined_at", "revoked_at"])
    elif action == "decline":
        invitation.status = CourseInstructorInvitationStatus.DECLINED
        invitation.declined_at = timezone.now()
        invitation.accepted_at = None
        update_fields.extend(["declined_at", "accepted_at"])
    else:
        raise ValueError("Unsupported instructor invitation action.")

    invitation.save(update_fields=update_fields)
    transaction.on_commit(
        lambda: notify_course_instructor_response(invitation.id, action=action)
    )
    return invitation


def attach_course_invitations_to_user(user):
    if getattr(user, "role", None) != Role.REGULAR_USER:
        return []

    normalized_email = _normalize_invited_email(getattr(user, "email", ""))
    if not normalized_email:
        return []

    invitations = list(
        CourseInstructorInvitation.objects.select_related(
            "course_program",
            "course_program__organization",
        )
        .filter(
            invited_email__iexact=normalized_email,
            user__isnull=True,
        )
        .order_by("-last_sent_at", "-created_at", "-id")
    )
    if not invitations:
        return []

    linked_invitations = []
    pending_notification_ids = []
    for invitation in invitations:
        sync_course_instructor_invitation(invitation)
        invitation.user = user
        invitation.save(update_fields=["user", "updated_at"])
        linked_invitations.append(invitation)
        if invitation.status == CourseInstructorInvitationStatus.PENDING and not invitation.is_expired:
            pending_notification_ids.append(invitation.id)

    if pending_notification_ids:
        def notify_linked_pending_invitations():
            from apps.notifications.services import notify_course_instructor_invited

            for invitation_id in pending_notification_ids:
                invitation = (
                    CourseInstructorInvitation.objects.select_related(
                        "user",
                        "course_program",
                        "course_program__organization",
                    )
                    .filter(id=invitation_id)
                    .first()
                )
                if invitation is not None:
                    notify_course_instructor_invited(invitation)

        transaction.on_commit(notify_linked_pending_invitations)

    return linked_invitations


def _resolve_invited_user(invited_email):
    user = User.objects.filter(email__iexact=invited_email).first()
    if user is None:
        return None
    if user.role != Role.REGULAR_USER:
        raise ValueError(
            "Instructor invitations can only be sent to regular-user accounts."
        )
    return user


def build_course_instructor_invitation_action_url(invitation):
    from apps.notifications.services import build_frontend_url

    return build_frontend_url(
        f"/instructor-invitations/accept?token={invitation.token}"
    )


def send_course_instructor_invitation_email(invitation):
    greeting_name = (
        invitation.user.full_name
        if invitation.user and invitation.user.full_name
        else invitation.invited_email
    )
    course_program = invitation.course_program
    organization_name = course_program.organization.name
    accept_url = build_course_instructor_invitation_action_url(invitation)
    expiry_text = "This invitation expires in 24 hours."
    html_context = {
        "subject": f"You were invited to instruct {course_program.title}",
        "greeting_name": greeting_name,
        "organization_name": organization_name,
        "course_title": course_program.title,
        "accept_url": accept_url,
        "expiry_text": expiry_text,
        "invitation_token": invitation.token,
    }
    send_platform_email(
        subject=html_context["subject"],
        message=(
            f"Hello {greeting_name},\n\n"
            f"{organization_name} invited you to be an instructor for "
            f"{course_program.title} on SkillVerse.\n\n"
            f"Use this link to accept the invitation:\n{accept_url}\n\n"
            f"{expiry_text}"
        ),
        html_message=render_email_html(
            "emails/course_instructor_invitation_email.html",
            html_context,
        ),
        recipient_list=[invitation.invited_email],
        fail_silently=False,
    )


def dispatch_course_instructor_invitation(invitation_id):
    invitation = (
        CourseInstructorInvitation.objects.select_related(
            "user",
            "course_program",
            "course_program__organization",
        )
        .filter(id=invitation_id)
        .first()
    )
    if invitation is None:
        return

    send_course_instructor_invitation_email(invitation)

    if invitation.user_id:
        from apps.notifications.services import notify_course_instructor_invited

        notify_course_instructor_invited(invitation)


def create_course_instructor_invitation(
    *,
    course_program,
    invited_by,
    invited_email,
):
    normalized_email = _normalize_invited_email(invited_email)
    if not normalized_email:
        raise ValueError("Instructor email is required.")

    invited_user = _resolve_invited_user(normalized_email)

    existing_invitations = CourseInstructorInvitation.objects.filter(
        course_program=course_program,
        invited_email__iexact=normalized_email,
    ).order_by("-created_at", "-id")
    for invitation in existing_invitations:
        sync_course_instructor_invitation(invitation)

    if existing_invitations.filter(
        status=CourseInstructorInvitationStatus.ACCEPTED
    ).exists():
        raise ValueError("This instructor is already assigned to the course.")

    if existing_invitations.filter(
        status=CourseInstructorInvitationStatus.PENDING,
        expires_at__gt=timezone.now(),
    ).exists():
        raise ValueError(
            "An active instructor invitation already exists for this email."
        )

    invitation = CourseInstructorInvitation.objects.create(
        course_program=course_program,
        user=invited_user,
        invited_by=invited_by,
        invited_email=normalized_email,
        token=CourseInstructorInvitation.issue_token(),
        expires_at=CourseInstructorInvitation.default_expiry(),
    )
    transaction.on_commit(
        lambda: dispatch_course_instructor_invitation(invitation.id)
    )
    return invitation


def resend_course_instructor_invitation(invitation, *, resent_by):
    invitation = sync_course_instructor_invitation(invitation)
    if invitation.status == CourseInstructorInvitationStatus.ACCEPTED:
        raise ValueError("Accepted instructors do not need a new invitation.")
    if invitation.status == CourseInstructorInvitationStatus.REVOKED:
        raise ValueError("Revoked invitations cannot be resent.")

    invitation.user = _resolve_invited_user(invitation.invited_email)
    invitation.invited_by = resent_by
    invitation.status = CourseInstructorInvitationStatus.PENDING
    invitation.token = CourseInstructorInvitation.issue_token()
    invitation.expires_at = CourseInstructorInvitation.default_expiry()
    invitation.last_sent_at = timezone.now()
    invitation.sent_count += 1
    invitation.declined_at = None
    invitation.revoked_at = None
    invitation.save(
        update_fields=[
            "user",
            "invited_by",
            "status",
            "token",
            "expires_at",
            "last_sent_at",
            "sent_count",
            "declined_at",
            "revoked_at",
            "updated_at",
        ]
    )
    transaction.on_commit(
        lambda: dispatch_course_instructor_invitation(invitation.id)
    )
    return invitation


def revoke_course_instructor_invitation(invitation):
    invitation = sync_course_instructor_invitation(invitation)
    if invitation.status == CourseInstructorInvitationStatus.ACCEPTED:
        raise ValueError("Accepted instructors must be managed through assignment controls.")
    if invitation.status == CourseInstructorInvitationStatus.REVOKED:
        return invitation

    invitation.status = CourseInstructorInvitationStatus.REVOKED
    invitation.revoked_at = timezone.now()
    invitation.save(update_fields=["status", "revoked_at", "updated_at"])
    return invitation


def notify_paid_enrollment_activated(enrollment_id, payment_transaction_id):
    enrollment = (
        Enrollment.objects.select_related(
            "user",
            "course_program",
            "course_program__organization",
            "course_program__organization__owner",
        )
        .filter(id=enrollment_id)
        .first()
    )
    if enrollment is None:
        return

    from apps.notifications.services import notify_enrollment_activated
    from apps.payments.models import PaymentTransaction

    payment_transaction = PaymentTransaction.objects.filter(id=payment_transaction_id).first()
    notify_enrollment_activated(enrollment, payment_transaction=payment_transaction)


def notify_course_instructor_response(invitation_id, *, action):
    invitation = (
        CourseInstructorInvitation.objects.select_related(
            "user",
            "course_program",
            "course_program__organization",
            "course_program__organization__owner",
        )
        .filter(id=invitation_id)
        .first()
    )
    if invitation is None:
        return

    from apps.notifications.services import notify_course_instructor_response

    notify_course_instructor_response(invitation, action=action)


def notify_course_completed(enrollment_id):
    enrollment = (
        Enrollment.objects.select_related("user", "course_program")
        .filter(id=enrollment_id)
        .first()
    )
    if enrollment is None:
        return

    from apps.notifications.services import notify_course_completed as create_completion_notification

    create_completion_notification(enrollment)


def handle_completed_enrollment(enrollment_id):
    enrollment = (
        Enrollment.objects.select_related(
            "user",
            "course_program",
            "course_program__organization",
        )
        .filter(id=enrollment_id)
        .first()
    )
    if enrollment is None:
        return

    notify_course_completed(enrollment.id)

    from apps.payments.services.automation import process_community_service_completion

    try:
        process_community_service_completion(
            enrollment,
            source="course_completion",
        )
    except Exception:
        # Completion notifications should not be blocked by automation failures.
        pass
