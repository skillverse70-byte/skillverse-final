import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings


class AIProviderError(Exception):
    pass


class AIProviderConfigurationError(AIProviderError):
    pass


class OpenRouterProvider:
    provider_name = "openrouter"

    @staticmethod
    def configuration():
        api_key = settings.OPENROUTER_API_KEY
        return {
            "provider": OpenRouterProvider.provider_name,
            "configured": bool(api_key),
            "healthy": bool(api_key),
            "default_model": settings.OPENROUTER_DEFAULT_MODEL,
            "base_url": settings.OPENROUTER_BASE_URL,
            "timeout_seconds": settings.OPENROUTER_HTTP_TIMEOUT_SECONDS,
            "has_api_key": bool(api_key),
            "using_legacy_env_key": bool(
                getattr(settings, "OPENROUTER_API_KEY_SOURCE", "") == "legacy"
            ),
            "feature_flags": {
                "ai_features_enabled": settings.AI_FEATURES_ENABLED,
                "ai_recommendations_enabled": settings.AI_RECOMMENDATIONS_ENABLED,
                "ai_assignment_feedback_enabled": settings.AI_ASSIGNMENT_FEEDBACK_ENABLED,
                "ai_cognitive_monitoring_enabled": settings.AI_COGNITIVE_MONITORING_ENABLED,
            },
        }

    def verify(self, mode="config"):
        configuration = self.configuration()
        result = {
            **configuration,
            "mode": mode,
            "details": {},
        }
        if mode == "config":
            result["healthy"] = configuration["configured"]
            result["details"] = {
                "status": "ready" if configuration["configured"] else "missing_api_key",
            }
            return result

        if not configuration["configured"]:
            raise AIProviderConfigurationError("OpenRouter is not configured.")

        if mode == "live":
            models_payload = self.list_models()
            data = models_payload.get("data") or []
            result["healthy"] = True
            result["details"] = {
                "models_returned": len(data),
                "sample_model": data[0].get("id") if data else "",
            }
            return result

        if mode == "completion":
            completion_payload = self.create_chat_completion(
                model=settings.OPENROUTER_DEFAULT_MODEL,
                messages=[{"role": "user", "content": "Reply with exactly ok"}],
                max_tokens=8,
            )
            choice = ((completion_payload.get("choices") or [{}])[0]).get("message") or {}
            result["healthy"] = True
            result["details"] = {
                "response_id": completion_payload.get("id", ""),
                "response_model": completion_payload.get("model", ""),
                "reply_preview": str(choice.get("content") or "")[:120],
            }
            return result

        raise AIProviderError(f"Unsupported OpenRouter verification mode: {mode}")

    def list_models(self):
        return self._request_json("GET", "/api/v1/models")

    def create_chat_completion(self, *, model, messages, max_tokens=256):
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
        }
        return self._request_json("POST", "/api/v1/chat/completions", payload=payload)

    def _request_json(self, method, path, *, payload=None):
        if not settings.OPENROUTER_API_KEY:
            raise AIProviderConfigurationError("OpenRouter API key is not configured.")

        body = None
        if payload is not None:
            body = json.dumps(payload, separators=(",", ":")).encode("utf-8")

        request = Request(
            f"{settings.OPENROUTER_BASE_URL.rstrip('/')}{path}",
            data=body,
            method=method,
            headers={
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": settings.OPENROUTER_APP_REFERER,
                "X-OpenRouter-Title": settings.OPENROUTER_APP_TITLE,
            },
        )
        try:
            with urlopen(request, timeout=settings.OPENROUTER_HTTP_TIMEOUT_SECONDS) as response:
                response_body = response.read().decode("utf-8")
        except HTTPError as exc:
            response_body = exc.read().decode("utf-8", errors="replace")
            raise AIProviderError(
                self._extract_error_message(response_body) or "OpenRouter request failed."
            ) from exc
        except (URLError, TimeoutError) as exc:
            raise AIProviderError("OpenRouter is temporarily unavailable.") from exc

        try:
            return json.loads(response_body)
        except json.JSONDecodeError as exc:
            raise AIProviderError("OpenRouter returned an invalid response.") from exc

    @staticmethod
    def _extract_error_message(response_body):
        try:
            parsed = json.loads(response_body)
        except json.JSONDecodeError:
            return response_body[:255]

        error = parsed.get("error")
        if isinstance(error, dict):
            return str(error.get("message") or error.get("code") or "")[:255]
        return str(parsed.get("message") or "")[:255]


def get_default_ai_provider():
    provider_name = str(settings.AI_DEFAULT_PROVIDER or "").strip().lower()
    if provider_name == "openrouter":
        return OpenRouterProvider()
    raise AIProviderConfigurationError(f"Unsupported AI provider: {provider_name}")
