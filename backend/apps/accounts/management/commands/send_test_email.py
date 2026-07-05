from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from apps.common.email import send_platform_email


class Command(BaseCommand):
    help = "Send a one-off test email using the configured Django email backend."

    def add_arguments(self, parser):
        parser.add_argument("--to", required=True, help="Recipient email address.")
        parser.add_argument(
            "--subject",
            default="SkillVerse Resend test email",
            help="Email subject.",
        )
        parser.add_argument(
            "--message",
            default=(
                "This is a test email from SkillVerse using the configured "
                "Resend email backend."
            ),
            help="Plain-text email body.",
        )

    def handle(self, *args, **options):
        recipient = options["to"]
        subject = options["subject"]
        message = options["message"]

        if not getattr(settings, "DEFAULT_FROM_EMAIL", ""):
            raise CommandError("DEFAULT_FROM_EMAIL is not configured.")

        send_platform_email(
            subject=subject,
            message=message,
            recipient_list=[recipient],
            fail_silently=False,
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Test email sent to {recipient} using {settings.EMAIL_BACKEND}."
            )
        )
