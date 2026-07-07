from django.conf import settings
from django.db import transaction
from django.utils import timezone
from asgiref.sync import async_to_sync

from apps.common.email import render_email_html, send_platform_email
from apps.common.enums import (
    FinancialAccountStatus,
    JobApplicationStatus,
    NotificationType,
    OrganizationVerificationReviewStatus,
    SkillSwapStatus,
)
from apps.notifications.models import Notification

try:
    from channels.layers import get_channel_layer
except ModuleNotFoundError:
    def get_channel_layer():
        return None


def get_notification_group_name(user_id):
    return f"notifications.user.{user_id}"


def get_notification_summary_for_user(user):
    return {
        "unread_count": Notification.objects.filter(user=user, is_read=False).count(),
    }


def _frontend_app_url():
    frontend_url = getattr(settings, "FRONTEND_APP_URL", "") or ""
    if frontend_url:
        return frontend_url.rstrip("/")

    cors_origins = getattr(settings, "CORS_ALLOWED_ORIGINS", [])
    if cors_origins:
        return cors_origins[0].rstrip("/")

    return "http://localhost:5173"


def build_frontend_url(path):
    normalized_path = str(path or "").strip()
    if not normalized_path:
        return _frontend_app_url()
    if normalized_path.startswith("http://") or normalized_path.startswith("https://"):
        return normalized_path
    if not normalized_path.startswith("/"):
        normalized_path = f"/{normalized_path}"
    return f"{_frontend_app_url()}{normalized_path}"


def _build_plain_text_email_message(*, greeting_name, headline, body_lines, action_url, action_label):
    lines = [
        f"Hello {greeting_name},",
        "",
        headline,
    ]
    if body_lines:
        lines.extend(["", *body_lines])
    if action_url:
        lines.extend(["", f"{action_label}:", action_url])
    return "\n".join(lines)


def _send_notification_email(
    *,
    notification,
    subject,
    headline,
    body_lines,
    action_label,
):
    recipient = notification.user
    if not recipient.email:
        return

    greeting_name = recipient.full_name or recipient.email
    absolute_action_url = build_frontend_url(notification.action_url)
    html_context = {
        "subject": subject,
        "greeting_name": greeting_name,
        "headline": headline,
        "body_lines": body_lines or [],
        "action_url": absolute_action_url,
        "action_label": action_label,
    }
    send_platform_email(
        subject=subject,
        message=_build_plain_text_email_message(
            greeting_name=greeting_name,
            headline=headline,
            body_lines=body_lines or [],
            action_url=absolute_action_url,
            action_label=action_label,
        ),
        html_message=render_email_html("emails/notification_email.html", html_context),
        recipient_list=[recipient.email],
        fail_silently=False,
    )
    Notification.objects.filter(id=notification.id, emailed_at__isnull=True).update(
        emailed_at=timezone.now()
    )


def create_notification(
    *,
    user,
    notification_type,
    title,
    message="",
    action_url="",
    metadata=None,
    send_email=False,
    email_subject="",
    email_headline="",
    email_body_lines=None,
    email_action_label="Open SkillVerse",
):
    notification = Notification.objects.create(
        user=user,
        type=notification_type,
        title=title.strip(),
        message=message.strip(),
        action_url=(action_url or "").strip(),
        metadata=metadata or {},
    )
    transaction.on_commit(
        lambda: deliver_notification(
            notification.id,
            send_email=send_email,
            email_subject=email_subject or title,
            email_headline=email_headline or title,
            email_body_lines=email_body_lines or ([message.strip()] if message.strip() else []),
            email_action_label=email_action_label,
        )
    )
    return notification


def deliver_notification(
    notification_id,
    *,
    send_email=False,
    email_subject="",
    email_headline="",
    email_body_lines=None,
    email_action_label="Open SkillVerse",
):
    notification = Notification.objects.select_related("user").filter(id=notification_id).first()
    if notification is None:
        return

    if send_email and notification.emailed_at is None:
        _send_notification_email(
            notification=notification,
            subject=email_subject or notification.title,
            headline=email_headline or notification.title,
            body_lines=email_body_lines or [],
            action_label=email_action_label,
        )

    broadcast_notification_created(notification.id)


def broadcast_notification_created(notification_id):
    notification = Notification.objects.select_related("user").filter(id=notification_id).first()
    if notification is None:
        return

    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    from apps.notifications.serializers import NotificationSerializer

    async_to_sync(channel_layer.group_send)(
        get_notification_group_name(notification.user_id),
        {
            "type": "notification.created",
            "notification": NotificationSerializer(notification).data,
            "summary": get_notification_summary_for_user(notification.user),
        },
    )


def broadcast_notification_summary_for_user(user, *, channel_layer=None):
    active_channel_layer = channel_layer or get_channel_layer()
    if active_channel_layer is None:
        return

    async_to_sync(active_channel_layer.group_send)(
        get_notification_group_name(user.id),
        {
            "type": "notifications.unread.updated",
            "summary": get_notification_summary_for_user(user),
        },
    )


def mark_notification_as_read(notification):
    if notification.is_read:
        return notification

    notification.is_read = True
    notification.read_at = timezone.now()
    notification.save(update_fields=["is_read", "read_at", "updated_at"])
    transaction.on_commit(lambda: broadcast_notification_summary_for_user(notification.user))
    return notification


def mark_all_notifications_as_read(user):
    unread_ids = list(
        Notification.objects.filter(user=user, is_read=False).values_list("id", flat=True)
    )
    if not unread_ids:
        return 0

    Notification.objects.filter(id__in=unread_ids).update(
        is_read=True,
        read_at=timezone.now(),
    )
    transaction.on_commit(lambda: broadcast_notification_summary_for_user(user))
    return len(unread_ids)


def notify_email_verification_issued(user):
    return create_notification(
        user=user,
        notification_type=NotificationType.VERIFICATION,
        title="Verify your email",
        message="Use the latest verification code sent to your inbox to activate your account.",
        action_url="/verify-email",
        metadata={"purpose": "email_verification"},
    )


def notify_swap_request_created(swap_request):
    requester_name = swap_request.requester.full_name or swap_request.requester.email
    return create_notification(
        user=swap_request.recipient,
        notification_type=NotificationType.SWAP,
        title="New skill swap request",
        message=f"{requester_name} sent you a new skill swap request.",
        action_url="/skill-swap",
        metadata={
            "swap_request_id": swap_request.id,
            "requester_id": swap_request.requester_id,
            "recipient_id": swap_request.recipient_id,
            "status": swap_request.status,
        },
    )


def notify_swap_request_transition(swap_request):
    recipient_name = swap_request.recipient.full_name or swap_request.recipient.email
    if swap_request.status == SkillSwapStatus.ACCEPTED:
        title = "Skill swap request accepted"
        message = f"{recipient_name} accepted your swap request."
        target_user = swap_request.requester
    elif swap_request.status == SkillSwapStatus.REJECTED:
        title = "Skill swap request declined"
        message = f"{recipient_name} declined your swap request."
        target_user = swap_request.requester
    elif swap_request.status == SkillSwapStatus.CANCELLED:
        title = "Skill swap request cancelled"
        message = f"{swap_request.requester.full_name or swap_request.requester.email} cancelled the swap request."
        target_user = swap_request.recipient
    else:
        return None

    return create_notification(
        user=target_user,
        notification_type=NotificationType.SWAP,
        title=title,
        message=message,
        action_url="/skill-swap",
        metadata={
            "swap_request_id": swap_request.id,
            "status": swap_request.status,
        },
    )


def notify_thread_message_created(message):
    swap_request = message.thread.swap_request
    recipient = (
        swap_request.recipient
        if message.sender_id == swap_request.requester_id
        else swap_request.requester
    )
    sender_name = message.sender.full_name or message.sender.email
    if message.message_type == message.MessageType.RESOURCE:
        preview = message.resource_label or "Shared a resource."
    else:
        preview = (message.content or "").strip()[:160] or "Sent you a new message."
    return create_notification(
        user=recipient,
        notification_type=NotificationType.MESSAGE,
        title=f"New message from {sender_name}",
        message=preview,
        action_url=f"/messages?thread={message.thread_id}",
        metadata={
            "thread_id": message.thread_id,
            "message_id": message.id,
            "swap_request_id": swap_request.id,
        },
    )


def notify_learning_session_created(session):
    swap_request = session.swap_request
    recipient = (
        swap_request.recipient
        if session.created_by_id == swap_request.requester_id
        else swap_request.requester
    )
    creator_name = session.created_by.full_name or session.created_by.email
    thread_id = getattr(getattr(swap_request, "message_thread", None), "id", None)
    action_url = "/messages?panel=sessions"
    if thread_id:
        action_url = f"/messages?thread={thread_id}&panel=sessions"
    return create_notification(
        user=recipient,
        notification_type=NotificationType.SESSION,
        title="Learning session planned",
        message=f'{creator_name} planned "{session.title}".',
        action_url=action_url,
        metadata={
            "session_id": session.id,
            "swap_request_id": swap_request.id,
            "status": session.status,
        },
    )


def notify_learning_session_updated(session, *, updated_by):
    swap_request = session.swap_request
    recipient = (
        swap_request.recipient
        if updated_by.id == swap_request.requester_id
        else swap_request.requester
    )
    actor_name = updated_by.full_name or updated_by.email
    thread_id = getattr(getattr(swap_request, "message_thread", None), "id", None)
    action_url = "/messages?panel=sessions"
    if thread_id:
        action_url = f"/messages?thread={thread_id}&panel=sessions"
    if session.status == "cancelled":
        title = "Learning session cancelled"
        message = f'{actor_name} cancelled "{session.title}".'
    elif session.status == "completed":
        title = "Learning session completed"
        message = f'{actor_name} marked "{session.title}" as completed.'
    elif session.status == "confirmed":
        title = "Learning session confirmed"
        message = f'{actor_name} confirmed "{session.title}".'
    else:
        title = "Learning session updated"
        message = f'{actor_name} updated "{session.title}".'
    return create_notification(
        user=recipient,
        notification_type=NotificationType.SESSION,
        title=title,
        message=message,
        action_url=action_url,
        metadata={
            "session_id": session.id,
            "swap_request_id": swap_request.id,
            "status": session.status,
        },
    )


def notify_enrollment_activated(enrollment, *, payment_transaction=None):
    course_program = enrollment.course_program
    title = f"You're enrolled in {course_program.title}"
    message = (
        f"Your payment was verified for {course_program.title}."
        if payment_transaction is not None
        else f"You can now start learning in {course_program.title}."
    )
    notification = create_notification(
        user=enrollment.user,
        notification_type=NotificationType.ENROLLMENT,
        title=title,
        message=message,
        action_url=f"/courses/{course_program.id}",
        metadata={
            "course_program_id": course_program.id,
            "enrollment_id": enrollment.id,
            "payment_tx_ref": getattr(payment_transaction, "tx_ref", ""),
            "status": enrollment.status,
        },
        send_email=payment_transaction is not None,
        email_subject=title,
        email_headline=title,
        email_body_lines=[message],
        email_action_label="Open course",
    )
    create_notification(
        user=course_program.organization.owner,
        notification_type=NotificationType.COURSE,
        title="New course enrollment",
        message=f"{enrollment.user.full_name or enrollment.user.email} enrolled in {course_program.title}.",
        action_url=f"/org?tab=courses&course={course_program.id}",
        metadata={
            "course_program_id": course_program.id,
            "enrollment_id": enrollment.id,
            "learner_id": enrollment.user_id,
            "payment_tx_ref": getattr(payment_transaction, "tx_ref", ""),
            "status": enrollment.status,
        },
    )
    return notification


def notify_course_completed(enrollment):
    course_program = enrollment.course_program
    return create_notification(
        user=enrollment.user,
        notification_type=NotificationType.COURSE,
        title=f"{course_program.title} completed",
        message=f"You completed all required lessons in {course_program.title}.",
        action_url=f"/courses/{course_program.id}",
        metadata={
            "course_program_id": course_program.id,
            "enrollment_id": enrollment.id,
            "status": enrollment.status,
        },
    )


def notify_event_rsvp_changed(rsvp, *, created=False):
    event = rsvp.event
    learner_name = rsvp.user.full_name or rsvp.user.email
    action = "New RSVP" if created else "RSVP updated"
    return create_notification(
        user=event.organization.owner,
        notification_type=NotificationType.EVENT,
        title=f"{action} for {event.title}",
        message=f"{learner_name} marked this event as {rsvp.status}.",
        action_url=f"/org?tab=events&event={event.id}",
        metadata={
            "event_id": event.id,
            "rsvp_id": rsvp.id,
            "user_id": rsvp.user_id,
            "status": rsvp.status,
        },
    )


def notify_event_attendance_updated(attendee):
    event = attendee.event
    attended = bool(attendee.attended_at)
    status_label = "attended" if attended else attendee.status
    title = f"Your event status changed for {event.title}"
    message = f"Your RSVP status is now {status_label}."
    return create_notification(
        user=attendee.user,
        notification_type=NotificationType.EVENT,
        title=title,
        message=message,
        action_url=f"/events/{event.id}",
        metadata={
            "event_id": event.id,
            "rsvp_id": attendee.id,
            "status": attendee.status,
            "attended": attended,
        },
        send_email=True,
        email_subject=title,
        email_headline=title,
        email_body_lines=[message],
        email_action_label="View event",
    )


def notify_event_admin_review(event):
    review_notes = (event.admin_review_notes or "").strip()
    body_lines = [f"Your event now has status {event.status}."]
    if review_notes:
        body_lines.append(review_notes)
    return create_notification(
        user=event.organization.owner,
        notification_type=NotificationType.ADMIN,
        title=f"Admin updated {event.title}",
        message=body_lines[0],
        action_url=f"/org?tab=events&event={event.id}",
        metadata={
            "event_id": event.id,
            "status": event.status,
            "rsvp_open": event.rsvp_open,
        },
        send_email=True,
        email_subject=f"Event review updated for {event.title}",
        email_headline=f"Event review updated for {event.title}",
        email_body_lines=body_lines,
        email_action_label="Open organization workspace",
    )


def notify_job_application_created(application):
    return create_notification(
        user=application.opportunity.organization.owner,
        notification_type=NotificationType.OPPORTUNITY,
        title=f"New application for {application.opportunity.title}",
        message=f"{application.user.full_name or application.user.email} applied to this opportunity.",
        action_url=f"/org?tab=jobs&opportunity={application.opportunity_id}",
        metadata={
            "opportunity_id": application.opportunity_id,
            "application_id": application.id,
            "user_id": application.user_id,
            "status": application.status,
        },
    )


def _application_status_label(status_value):
    return {
        JobApplicationStatus.APPLIED: "applied",
        JobApplicationStatus.SHORTLISTED: "shortlisted",
        JobApplicationStatus.INTERVIEW: "moved to interview",
        JobApplicationStatus.HIRED: "marked as hired",
        JobApplicationStatus.REJECTED: "declined",
        JobApplicationStatus.WITHDRAWN: "withdrawn",
    }.get(status_value, status_value)


def notify_job_application_updated(application):
    label = _application_status_label(application.status)
    title = f"Application update for {application.opportunity.title}"
    body_lines = [f"Your application was {label}."]
    if application.reviewer_notes:
        body_lines.append(application.reviewer_notes)
    return create_notification(
        user=application.user,
        notification_type=NotificationType.OPPORTUNITY,
        title=title,
        message=body_lines[0],
        action_url=f"/jobs/{application.opportunity_id}",
        metadata={
            "opportunity_id": application.opportunity_id,
            "application_id": application.id,
            "status": application.status,
        },
        send_email=True,
        email_subject=title,
        email_headline=title,
        email_body_lines=body_lines,
        email_action_label="View opportunity",
    )


def notify_organization_verification_reviewed(verification_request):
    organization = verification_request.organization
    approved = verification_request.status == OrganizationVerificationReviewStatus.APPROVED
    title = "Organization verification approved" if approved else "Organization verification update"
    body_lines = [
        (
            f"{organization.name} is now verified on SkillVerse."
            if approved
            else f"{organization.name} remains unverified after review."
        )
    ]
    if verification_request.reviewer_notes:
        body_lines.append(verification_request.reviewer_notes)
    return create_notification(
        user=organization.owner,
        notification_type=NotificationType.ADMIN,
        title=title,
        message=body_lines[0],
        action_url="/org?tab=trust",
        metadata={
            "organization_id": organization.id,
            "verification_request_id": verification_request.id,
            "status": verification_request.status,
        },
        send_email=True,
        email_subject=title,
        email_headline=title,
        email_body_lines=body_lines,
        email_action_label="Open organization workspace",
    )


def notify_financial_account_reviewed(financial_account):
    organization = financial_account.organization
    if financial_account.status == FinancialAccountStatus.READY:
        title = "Financial account approved"
        first_line = "Your payout setup is ready for paid course operations."
    else:
        title = "Financial account review updated"
        first_line = "Your payout setup requires attention before it can be used."
    body_lines = [first_line]
    if financial_account.review_notes:
        body_lines.append(financial_account.review_notes)
    if financial_account.restricted_reason:
        body_lines.append(financial_account.restricted_reason)
    return create_notification(
        user=organization.owner,
        notification_type=NotificationType.ADMIN,
        title=title,
        message=first_line,
        action_url="/org?tab=finance",
        metadata={
            "organization_id": organization.id,
            "financial_account_id": financial_account.id,
            "status": financial_account.status,
        },
        send_email=True,
        email_subject=title,
        email_headline=title,
        email_body_lines=body_lines,
        email_action_label="Review financial account",
    )
