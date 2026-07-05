from django.urls import path

from apps.organizations.views import OrganizationRegisterView

urlpatterns = [
    path("register/", OrganizationRegisterView.as_view(), name="auth-organization-register"),
]
