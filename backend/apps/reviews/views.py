from drf_spectacular.utils import extend_schema
from rest_framework import permissions, serializers, status
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response

from apps.common.permissions import IsRegularUser
from apps.reviews.serializers import (
    RatingReviewCreateSerializer,
    RatingReviewSerializer,
    ReviewEligibilitySerializer,
)
from apps.reviews.services import create_rating_review, get_review_eligibility


@extend_schema(
    tags=["reviews"],
    responses={200: ReviewEligibilitySerializer},
)
class ReviewEligibilityView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]

    def get(self, request):
        context = request.query_params.get("context", "")
        source_id = request.query_params.get("source_id")
        if source_id in (None, ""):
            raise serializers.ValidationError({"source_id": "This query parameter is required."})

        try:
            source_id = int(source_id)
        except (TypeError, ValueError):
            raise serializers.ValidationError({"source_id": "A valid integer is required."})

        eligibility = get_review_eligibility(
            user=request.user,
            context=context,
            source_id=source_id,
        )
        serializer = ReviewEligibilitySerializer(eligibility)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["reviews"],
    request=RatingReviewCreateSerializer,
    responses={201: RatingReviewSerializer},
)
class RatingReviewCreateView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]
    serializer_class = RatingReviewCreateSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"create_rating_review": create_rating_review})
        return context

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        response_serializer = RatingReviewSerializer(review)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
