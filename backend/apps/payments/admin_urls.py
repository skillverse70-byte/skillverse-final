from django.urls import path

from apps.payments.views import (
    AdminFinancialAccountDecisionView,
    AdminFinancialAccountListView,
)

urlpatterns = [
    path(
        "financial-accounts/",
        AdminFinancialAccountListView.as_view(),
        name="admin-financial-account-list",
    ),
    path(
        "financial-accounts/<int:pk>/decision/",
        AdminFinancialAccountDecisionView.as_view(),
        name="admin-financial-account-decision",
    ),
]
