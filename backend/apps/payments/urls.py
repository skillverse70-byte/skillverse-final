from django.urls import path

from apps.payments.views import (
    ChapaCallbackView,
    CourseCheckoutDetailView,
    CourseCheckoutListCreateView,
    CourseCheckoutVerifyView,
    CurrentFinancialAccountView,
)

urlpatterns = [
    path(
        "financial-account/me/",
        CurrentFinancialAccountView.as_view(),
        name="financial-account-me",
    ),
    path(
        "course-checkouts/",
        CourseCheckoutListCreateView.as_view(),
        name="course-checkout-list-create",
    ),
    path(
        "course-checkouts/<str:tx_ref>/",
        CourseCheckoutDetailView.as_view(),
        name="course-checkout-detail",
    ),
    path(
        "course-checkouts/<str:tx_ref>/verify/",
        CourseCheckoutVerifyView.as_view(),
        name="course-checkout-verify",
    ),
    path(
        "chapa/callback/",
        ChapaCallbackView.as_view(),
        name="chapa-callback",
    ),
]
