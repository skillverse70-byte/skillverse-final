import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import {
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  ShieldCheck,
  Upload,
} from "lucide-react";
import AuthLayout from "@/features/auth/components/AuthLayout";
import { organizationTypes } from "@/lib/domain-enums";
import { authService } from "@/services/auth/auth.service";
import { registerOrganization } from "@/services/organizations/organization.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "@/components/ui/use-toast";

const organizationTypeOptions = [
  { value: organizationTypes.company, label: "Company" },
  { value: organizationTypes.ngo, label: "NGO" },
  { value: organizationTypes.institution, label: "Institution" },
  { value: organizationTypes.trainingCenter, label: "Training Center" },
  { value: organizationTypes.community, label: "Community" },
  { value: organizationTypes.other, label: "Other" },
];

export default function OrganizationOnboardingPage() {
  const [form, setForm] = useState({
    organizationName: "",
    organizationType: organizationTypes.company,
    email: "",
    password: "",
    confirmPassword: "",
    description: "",
    country: "",
    location: "",
  });
  const [businessLicense, setBusinessLicense] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const onDrop = (acceptedFiles) => {
    setBusinessLicense(acceptedFiles[0] || null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxFiles: 1,
    onDrop,
  });

  const selectedFileLabel = useMemo(() => {
    if (!businessLicense) {
      return "Optional business license upload";
    }
    const sizeMb = (businessLicense.size / (1024 * 1024)).toFixed(2);
    return `${businessLicense.name} (${sizeMb} MB)`;
  }, [businessLicense]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await registerOrganization({
        organizationName: form.organizationName,
        organizationType: form.organizationType,
        email: form.email,
        password: form.password,
        description: form.description,
        country: form.country,
        location: form.location,
        businessLicense,
      });
      setShowVerification(true);
    } catch (requestError) {
      setError(requestError.message || "Organization registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      await authService.verifyEmail({ email: form.email, code: otpCode });
      window.location.href = "/org";
    } catch (requestError) {
      setError(requestError.message || "Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await authService.resendVerification(form.email);
      toast({
        title: "Verification code sent",
        description: "Check your inbox for the latest organization verification code.",
      });
    } catch (requestError) {
      setError(requestError.message || "Failed to resend verification code.");
    }
  };

  if (showVerification) {
    return (
      <AuthLayout
        icon={ShieldCheck}
        title="Verify your organization email"
        subtitle={`We sent a six-digit code to ${form.email}.`}
      >
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 text-sm text-teal-900">
          Your organization account is created in an unverified trust state. Email verification confirms the primary login before you continue to organization setup.
        </div>
        <div className="my-6 flex justify-center">
          <InputOTP
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            autoFocus
            autoComplete="one-time-code"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          className="h-12 w-full font-medium"
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify and continue"
          )}
        </Button>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Need a fresh code?{" "}
          <button
            type="button"
            onClick={handleResend}
            className="font-medium text-primary hover:underline"
          >
            Resend verification
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={Building2}
      title="Create an organization account"
      subtitle="Start a separate organization-controlled path for courses, opportunities, events, and future verification workflows."
      maxWidthClass="max-w-3xl"
      footer={(
        <>
          Already have a primary organization login?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
          {" · "}
          Looking for a personal account instead?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Register as a regular user
          </Link>
        </>
      )}
    >
      {error && (
        <div className="mb-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700 md:grid-cols-3">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-teal-700" />
          <span>Dedicated onboarding path for organizations only</span>
        </div>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 text-teal-700" />
          <span>Starts unverified until later trust review workflows</span>
        </div>
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-4 w-4 text-teal-700" />
          <span>Uses the same Resend-backed verification email flow</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="organization-name">Organization name</Label>
            <Input
              id="organization-name"
              autoFocus
              placeholder="Bright Skills Hub"
              value={form.organizationName}
              onChange={(event) => updateField("organizationName", event.target.value)}
              className="h-12"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization-type">Organization type</Label>
            <select
              id="organization-type"
              value={form.organizationType}
              onChange={(event) => updateField("organizationType", event.target.value)}
              className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              required
            >
              {organizationTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization-email">Primary organization email</Label>
            <Input
              id="organization-email"
              type="email"
              autoComplete="email"
              placeholder="team@organization.org"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              className="h-12"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="organization-password">Password</Label>
              <Input
                id="organization-password"
                type="password"
                autoComplete="new-password"
                placeholder="Create a strong password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                className="h-12"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization-confirm-password">Confirm password</Label>
              <Input
                id="organization-confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={form.confirmPassword}
                onChange={(event) => updateField("confirmPassword", event.target.value)}
                className="h-12"
                required
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="organization-description">Description</Label>
            <Textarea
              id="organization-description"
              placeholder="Describe what your organization offers, supports, or teaches."
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              className="min-h-[132px] resize-none"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="organization-country">Country</Label>
              <Input
                id="organization-country"
                placeholder="Ethiopia"
                value={form.country}
                onChange={(event) => updateField("country", event.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization-location">Location</Label>
              <Input
                id="organization-location"
                placeholder="Addis Ababa"
                value={form.location}
                onChange={(event) => updateField("location", event.target.value)}
                className="h-12"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-border p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <MapPin className="h-4 w-4 text-teal-700" />
              Optional business license
            </div>
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-2xl border border-dashed p-5 text-center transition ${
                isDragActive
                  ? "border-teal-500 bg-teal-50"
                  : "border-slate-200 bg-slate-50/70 hover:border-teal-300 hover:bg-teal-50/60"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto mb-3 h-5 w-5 text-teal-700" />
              <p className="text-sm font-medium text-foreground">
                {isDragActive ? "Drop the file here" : "Drag a file here or click to upload"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                PDF, JPG, or PNG. This prepares the later verification workflow but does not make the organization verified at signup.
              </p>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{selectedFileLabel}</p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <Button type="submit" className="h-12 w-full font-medium" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating organization account...
              </>
            ) : (
              "Create organization account"
            )}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
