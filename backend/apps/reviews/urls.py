from django.urls import path

from apps.reviews.views import RatingReviewCreateView, ReviewEligibilityView

urlpatterns = [
    path("eligibility/", ReviewEligibilityView.as_view(), name="review-eligibility"),
    path("", RatingReviewCreateView.as_view(), name="rating-review-create"),
]

