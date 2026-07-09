from apps.common.enums import AIFeatureKey, AIRolloutState, Role


AI_FEATURE_CATALOG = {
    AIFeatureKey.RECOMMENDATIONS: {
        "label": "AI Recommendations",
        "setting": "AI_RECOMMENDATIONS_ENABLED",
        "surfaces": [
            "/dashboard",
            "/discover",
            "/skill-swap",
            "/courses/:id",
            "/org",
            "/admin",
        ],
        "actor_roles": [Role.REGULAR_USER, Role.ORGANIZATION, Role.ADMIN],
        "fallback_behavior": (
            "Use deterministic matching, curated discovery, and non-AI recommendation logic."
        ),
        "explainability_required": True,
    },
    AIFeatureKey.LEARNING_GUIDANCE: {
        "label": "AI Learning Guidance",
        "setting": "AI_LEARNING_GUIDANCE_ENABLED",
        "surfaces": [
            "/dashboard",
            "/courses/:id",
            "/org",
            "/admin",
        ],
        "actor_roles": [Role.REGULAR_USER, Role.ORGANIZATION, Role.ADMIN],
        "fallback_behavior": (
            "Keep existing course progress, dashboard progress, and manual guidance flows usable."
        ),
        "explainability_required": True,
    },
    AIFeatureKey.ASSIGNMENT_FEEDBACK: {
        "label": "AI Assignment Feedback",
        "setting": "AI_ASSIGNMENT_FEEDBACK_ENABLED",
        "surfaces": [
            "/courses/:id",
            "/dashboard",
            "/org",
            "/admin",
        ],
        "actor_roles": [Role.REGULAR_USER, Role.ORGANIZATION, Role.ADMIN],
        "fallback_behavior": (
            "Use instructor, organization, rubric, or non-AI assessment feedback paths."
        ),
        "explainability_required": True,
    },
    AIFeatureKey.COGNITIVE_MONITORING: {
        "label": "Adaptive Monitoring",
        "setting": "AI_COGNITIVE_MONITORING_ENABLED",
        "surfaces": [
            "/dashboard",
            "/courses/:id",
            "/messages",
            "/admin",
        ],
        "actor_roles": [Role.REGULAR_USER, Role.ADMIN],
        "fallback_behavior": (
            "Keep learning and messaging workflows available without adaptive monitoring."
        ),
        "explainability_required": True,
    },
}


AI_FALLBACK_CONTRACT = {
    "core_workflows_blocked": False,
    "provider_outage_behavior": (
        "Return a fallback-only capability state and continue non-AI product flows."
    ),
    "traceability_requirement": (
        "AI outputs should be explainable enough for users and admins to inspect rationale."
    ),
}


AI_INTEGRATION_RULES = {
    "server_side_provider_only": True,
    "client_must_not_store_provider_secret": True,
    "frontend_consumes_capability_snapshot": True,
}
