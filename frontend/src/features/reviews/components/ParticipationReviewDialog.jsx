import React, { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageSquareText, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import {
  createRatingReview,
  fetchReviewEligibility,
} from "@/services/reviews/reviews.service";

function StarRatingInput({ value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((ratingValue) => (
        <button
          key={ratingValue}
          type="button"
          className="rounded-full p-1 transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => onChange(ratingValue)}
          disabled={disabled}
          aria-label={`Rate ${ratingValue} star${ratingValue === 1 ? "" : "s"}`}
        >
          <Star
            className={`h-6 w-6 ${
              ratingValue <= value
                ? "fill-amber-400 text-amber-400"
                : "text-slate-300"
            }`}
          />
        </button>
      ))}
      <span className="text-sm text-muted-foreground">
        {value ? `${value}/5` : "Select a rating"}
      </span>
    </div>
  );
}

export default function ParticipationReviewDialog({
  context,
  sourceId,
  title,
  description,
  triggerLabel = "Leave review",
  triggerVariant = "outline",
  triggerClassName = "",
  triggerSize = "sm",
}) {
  const [open, setOpen] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittedReview, setSubmittedReview] = useState(null);

  useEffect(() => {
    if (!open || !context || !sourceId) {
      return;
    }

    let active = true;

    const loadEligibility = async () => {
      try {
        setLoading(true);
        setError("");
        const nextEligibility = await fetchReviewEligibility({ context, sourceId });
        if (!active) {
          return;
        }
        setEligibility(nextEligibility);
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Failed to check review eligibility.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadEligibility();

    return () => {
      active = false;
    };
  }, [context, open, sourceId]);

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError("");
      const review = await createRatingReview({
        context,
        sourceId,
        rating,
        comment: comment.trim(),
      });
      setSubmittedReview(review);
      setEligibility((current) =>
        current
          ? {
              ...current,
              eligible: false,
              existing_review_id: review.id,
              reason: "Your review has been submitted for this completed participation.",
            }
          : current,
      );
      toast({
        title: "Review submitted",
        description: "Your feedback is now saved on this exchange record.",
      });
    } catch (requestError) {
      setError(requestError.message || "Failed to submit your review.");
    } finally {
      setSaving(false);
    }
  };

  const showThankYouState = Boolean(submittedReview);
  const targetName =
    eligibility?.target?.full_name || eligibility?.target?.title || "this participation";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setError("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          size={triggerSize}
          variant={triggerVariant}
          className={triggerClassName}
          disabled={!sourceId}
        >
          <Star className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-secondary/10 px-4 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking whether this review is unlocked...
          </div>
        ) : showThankYouState ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
              <div className="space-y-2">
                <p className="font-medium text-emerald-900">
                  Review submitted for {submittedReview.target?.full_name || submittedReview.target?.title || targetName}.
                </p>
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: submittedReview.rating }).map((_, index) => (
                    <Star key={index} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                {submittedReview.comment ? (
                  <p className="text-sm text-emerald-900/80">{submittedReview.comment}</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : eligibility && !eligibility.eligible ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
            <div className="flex items-start gap-3">
              <MessageSquareText className="mt-0.5 h-5 w-5 text-amber-700" />
              <div className="space-y-1">
                <p className="font-medium text-amber-900">
                  {eligibility.existing_review_id
                    ? `You already reviewed ${targetName}.`
                    : "This review is not unlocked yet."}
                </p>
                <p className="text-sm text-amber-900/80">{eligibility.reason}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-border/60 bg-secondary/10 p-4">
              <p className="text-sm font-medium text-foreground">
                Reviewing {targetName}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Leave feedback only after meaningful participation. This review stays tied to the participation record that unlocked it.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Your rating</label>
              <StarRatingInput value={rating} onChange={setRating} disabled={saving} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Optional feedback
              </label>
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="What made this exchange useful?"
                rows={5}
                disabled={saving}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {showThankYouState ? "Close" : "Cancel"}
          </Button>
          {!loading && !showThankYouState && eligibility?.eligible ? (
            <Button
              type="button"
              className="bg-teal-600 hover:bg-teal-700"
              disabled={saving || rating < 1}
              onClick={handleSubmit}
            >
              {saving ? "Submitting..." : "Submit review"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
