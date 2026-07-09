from django.urls import path

from apps.certificates.views import (
    AdminCertificateRevokeView,
    AdminServiceCreditRevokeView,
    AdminTrustOverviewView,
    CertificateDetailView,
    CertificatePortfolioView,
    OrganizationCertificateRevokeView,
    OrganizationCertificateIssueView,
    OrganizationServiceCreditRevokeView,
    OrganizationServiceCreditIssueView,
    OrganizationTrustOverviewView,
)

urlpatterns = [
    path("certificates/portfolio/", CertificatePortfolioView.as_view(), name="certificate-portfolio"),
    path("certificates/<str:certificate_id>/", CertificateDetailView.as_view(), name="certificate-detail"),
    path("organizations/trust/overview/", OrganizationTrustOverviewView.as_view(), name="organization-trust-overview"),
    path("organizations/trust/service-credits/", OrganizationServiceCreditIssueView.as_view(), name="organization-service-credit-issue"),
    path(
        "organizations/trust/service-credits/<int:pk>/revoke/",
        OrganizationServiceCreditRevokeView.as_view(),
        name="organization-service-credit-revoke",
    ),
    path("organizations/trust/certificates/", OrganizationCertificateIssueView.as_view(), name="organization-certificate-issue"),
    path(
        "organizations/trust/certificates/<int:pk>/revoke/",
        OrganizationCertificateRevokeView.as_view(),
        name="organization-certificate-revoke",
    ),
    path("admin/trust/overview/", AdminTrustOverviewView.as_view(), name="admin-trust-overview"),
    path(
        "admin/trust/service-credits/<int:pk>/revoke/",
        AdminServiceCreditRevokeView.as_view(),
        name="admin-service-credit-revoke",
    ),
    path(
        "admin/trust/certificates/<int:pk>/revoke/",
        AdminCertificateRevokeView.as_view(),
        name="admin-certificate-revoke",
    ),
]
