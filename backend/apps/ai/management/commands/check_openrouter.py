import json

from django.core.management.base import BaseCommand, CommandError

from apps.ai.services import (
    AIProviderConfigurationError,
    AIProviderError,
    OpenRouterProvider,
)


class Command(BaseCommand):
    help = "Check local OpenRouter configuration and optionally run a live provider verification."

    def add_arguments(self, parser):
        parser.add_argument(
            "--mode",
            choices=("config", "live", "completion"),
            default="config",
            help="Verification depth to run against OpenRouter.",
        )

    def handle(self, *args, **options):
        provider = OpenRouterProvider()
        try:
            result = provider.verify(mode=options["mode"])
        except (AIProviderConfigurationError, AIProviderError) as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(json.dumps(result, indent=2))
