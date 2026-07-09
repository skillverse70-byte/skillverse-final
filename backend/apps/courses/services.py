from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.common.enums import EnrollmentStatus
from apps.courses.models import Enrollment, EnrollmentLessonProgress


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
