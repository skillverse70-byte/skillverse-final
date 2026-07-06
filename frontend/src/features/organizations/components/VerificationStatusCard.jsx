import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { CheckCircle2, Clock3, FileText, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getUploadPreset } from "@/lib/uploads/upload-presets";

function getVerificationSummary(overview) {
  const latestRequest = overview?.latest_request;
  const pendingRequest = overview?.pending_request;

  if (overview?.organization?.verification_status === "verified") {
    return {
      title: "Verified organization",
      tone: "emerald",
      description:
        "Your organization has passed trust review and now carries a verified trust state.",
    };
  }

  if (pendingRequest) {
    return {
      title: "Verification review pending",
      tone: "amber",
      description:
        "Your request is in the admin review queue. You can keep updating your public profile while you wait.",
    };
  }

  if (latestRequest?.status === "rejected") {
    return {
      title: "Verification needs attention",
      tone: "red",
      description:
        latestRequest.reviewer_notes ||
        "Your last verification request was rejected. Review the notes and resubmit when ready.",
    };
  }

  return {
    title: "Unverified organization",
    tone: "slate",
    description:
      "You can publish permitted free offerings, but trust-sensitive and monetized flows remain gated until verification is approved.",
  };
}

const toneClasses = {
  emerald: "border-emerald-200 bg-emerald-50/70 text-emerald-950",
  amber: "border-amber-200 bg-amber-50/80 text-amber-950",
  red: "border-red-200 bg-red-50/80 text-red-950",
  slate: "border-slate-200 bg-slate-50/90 text-slate-900",
};

export default function VerificationStatusCard({
  organization,
  overview,
  submitting,
  onSubmitRequest,
}) {
  const [requestNotes, setRequestNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const summary = getVerificationSummary(overview);
  const pendingRequest = overview?.pending_request;
  const latestRequest = overview?.latest_request;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    ...getUploadPreset("organizationVerification"),
    onDrop: (acceptedFiles) => {
      setSelectedFile(acceptedFiles[0] || null);
    },
  });

  return (
    <div className="space-y-4 rounded-3xl border border-border/50 bg-white p-6 sm:p-8">
      <div className={`rounded-2xl border p-4 ${toneClasses[summary.tone]}`}>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5" />
          <div>
            <p className="font-medium">{summary.title}</p>
            <p className="mt-1 text-sm opacity-90">{summary.description}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">Verification request notes</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Give admins context about your organization, documents, or why an override may be justified.
            </p>
          </div>
          <Textarea
            value={requestNotes}
            onChange={(event) => setRequestNotes(event.target.value)}
            rows={5}
            placeholder="Describe your organization and the verification evidence on file."
            disabled={Boolean(pendingRequest) || submitting}
          />
          <div className="rounded-2xl border border-dashed border-border/70 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Supporting document status</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Upload evidence from the profile form if needed. This panel shows verification-readiness context and reuses the same accepted file types.
                </p>
              </div>
              {organization?.has_business_license ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  On file
                </span>
              ) : null}
            </div>
            <div
              {...getRootProps()}
              className={`rounded-2xl border border-dashed p-4 text-center text-sm transition ${
                isDragActive
                  ? "border-teal-500 bg-teal-50"
                  : "border-slate-200 bg-slate-50/70"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto mb-2 h-4 w-4 text-teal-700" />
              <p className="font-medium text-foreground">
                {isDragActive ? "Drop the file here" : "Drag here to preview allowed verification file types"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use the profile form below to actually attach or replace the saved document.
              </p>
            </div>
            {selectedFile ? (
              <p className="mt-2 text-xs text-muted-foreground">Selected locally: {selectedFile.name}</p>
            ) : null}
          </div>
          <Button
            type="button"
            className="w-full gap-2 bg-teal-600 hover:bg-teal-700"
            disabled={Boolean(pendingRequest) || submitting}
            onClick={() => onSubmitRequest(requestNotes.trim())}
          >
            <Clock3 className="h-4 w-4" />
            {submitting ? "Submitting..." : pendingRequest ? "Already pending review" : "Submit verification request"}
          </Button>
        </div>

        <div className="space-y-4 rounded-2xl bg-slate-50 p-5">
          <div>
            <p className="text-sm font-medium text-foreground">Latest trust workflow activity</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This is the admin-facing verification state, separate from email verification.
            </p>
          </div>
          {latestRequest ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-2xl border border-border/60 bg-white p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-teal-700" />
                  <span className="font-medium capitalize">{latestRequest.status}</span>
                </div>
                <p className="mt-2 text-muted-foreground">
                  Submitted {new Date(latestRequest.submitted_at).toLocaleString()}
                </p>
                {latestRequest.request_notes ? (
                  <p className="mt-3 text-foreground">{latestRequest.request_notes}</p>
                ) : null}
                {latestRequest.reviewer_notes ? (
                  <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-foreground">
                    <div className="mb-1 font-medium text-teal-800">Reviewer notes</div>
                    <p>{latestRequest.reviewer_notes}</p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No verification request has been submitted yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
