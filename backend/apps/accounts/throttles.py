from rest_framework.throttling import ScopedRateThrottle


class AuthEndpointThrottle(ScopedRateThrottle):
    scope = "auth"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = str(request.user.pk)
        else:
            email = ""
            if hasattr(request, "data") and isinstance(request.data, dict):
                email = str(request.data.get("email", "")).strip().lower()
            ident = email or self.get_ident(request) or "anonymous"

        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }
