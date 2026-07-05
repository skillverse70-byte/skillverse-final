from .base import *

DEBUG = env.bool("DEBUG", default=True)

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": env(
            "CHANNEL_LAYER_BACKEND",
            default="channels.layers.InMemoryChannelLayer",
        ),
        "CONFIG": (
            {"hosts": [REDIS_URL]}
            if env(
                "CHANNEL_LAYER_BACKEND",
                default="channels.layers.InMemoryChannelLayer",
            )
            == "channels_redis.core.RedisChannelLayer"
            else {}
        ),
    }
}
