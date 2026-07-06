from django.utils import timezone

from apps.common.enums import EnrollmentStatus
from apps.courses.models import EnrollmentLessonProgress


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
    return state


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
