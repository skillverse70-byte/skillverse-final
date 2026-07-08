from rest_framework import serializers


class AIProviderHealthQuerySerializer(serializers.Serializer):
    mode = serializers.ChoiceField(
        choices=("config", "live", "completion"),
        required=False,
        default="config",
    )


class AIProviderHealthResponseSerializer(serializers.Serializer):
    provider = serializers.CharField()
    configured = serializers.BooleanField()
    healthy = serializers.BooleanField()
    mode = serializers.CharField()
    default_model = serializers.CharField(allow_blank=True)
    base_url = serializers.CharField()
    timeout_seconds = serializers.IntegerField()
    has_api_key = serializers.BooleanField()
    using_legacy_env_key = serializers.BooleanField()
    feature_flags = serializers.JSONField()
    details = serializers.JSONField()
