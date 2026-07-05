from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from apps.accounts.models import AccountActionToken, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ("email",)
    list_display = (
        "email",
        "full_name",
        "role",
        "is_staff",
        "is_active",
        "email_verified_at",
    )
    list_filter = ("role", "is_staff", "is_active", "is_superuser")
    search_fields = ("email", "full_name")
    readonly_fields = ("last_login", "date_joined", "email_verified_at")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Profile", {"fields": ("full_name", "role", "email_verified_at")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "full_name", "password1", "password2", "role"),
            },
        ),
    )


@admin.register(AccountActionToken)
class AccountActionTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "purpose", "token", "expires_at", "used_at", "created_at")
    list_filter = ("purpose", "used_at")
    search_fields = ("user__email", "token")
    readonly_fields = ("created_at",)

