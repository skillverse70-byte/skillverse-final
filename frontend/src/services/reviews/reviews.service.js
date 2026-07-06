import { authenticatedApiRequest } from "@/services/auth/backend-auth-client";

export function fetchReviewEligibility({ context, sourceId }) {
  const searchParams = new URLSearchParams({
    context,
    source_id: String(sourceId),
  });

  return authenticatedApiRequest(`/reviews/eligibility/?${searchParams.toString()}`, {
    method: "GET",
  });
}

export function createRatingReview({ context, sourceId, rating, comment = "" }) {
  return authenticatedApiRequest("/reviews/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      context,
      source_id: sourceId,
      rating,
      comment,
    }),
  });
}
