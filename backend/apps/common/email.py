from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


def render_email_html(template_name, context=None):
    return render_to_string(template_name, context or {})


def send_platform_email(
    *,
    subject,
    message,
    recipient_list,
    html_message=None,
    from_email=None,
    fail_silently=False,
):
    resolved_from_email = from_email or settings.DEFAULT_FROM_EMAIL
    email_message = EmailMultiAlternatives(
        subject=subject,
        body=message,
        from_email=resolved_from_email,
        to=recipient_list,
    )
    if html_message:
        email_message.attach_alternative(html_message, "text/html")

    return email_message.send(fail_silently=fail_silently)
