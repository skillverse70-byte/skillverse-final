import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { authService } from "@/services/auth/auth.service";
import AuthLayout from "@/features/auth/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { appRuntime } from "@/lib/runtime-config";
import {
  getVerificationResendCooldown,
  startVerificationResendCooldown,
} from "@/lib/auth/verification-resend";

function readStoredPendingEmail() {
  if (typeof window === "undefined") {
    return "";
  }
  return (
    window.localStorage.getItem(
      `${appRuntime.storagePrefix}:${appRuntime.storageKeys.pendingVerificationEmail}`,
    ) || ""
  );
}

function storePendingEmail(email) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    `${appRuntime.storagePrefix}:${appRuntime.storageKeys.pendingVerificationEmail}`,
    email,
  );
}

function clearPendingEmail() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(
    `${appRuntime.storagePrefix}:${appRuntime.storageKeys.pendingVerificationEmail}`,
  );
}

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(
    searchParams.get("email") || readStoredPendingEmail() || "",
  );
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(
    getVerificationResendCooldown(
      searchParams.get("email") || readStoredPendingEmail() || "",
    ),
  );
  const redirectTarget = searchParams.get("from") || "/login";

  const subtitle = useMemo(() => {
    if (!email) {
      return "Enter the email address tied to your account so you can verify it and continue.";
    }
    return `Finish verification for ${email} so you can continue into protected SkillVerse flows.`;
  }, [email]);

  useEffect(() => {
    setResendCooldown(getVerificationResendCooldown(email));
  }, [email]);

  useEffect(() => {
    if (!resendCooldown) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setResendCooldown(getVerificationResendCooldown(email));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [email, resendCooldown]);

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      await authService.verifyEmail({ email, code: otpCode });
      clearPendingEmail();
      window.location.href = redirectTarget;
    } catch (requestError) {
      setError(requestError.message || "Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await authService.resendVerification(email);
      storePendingEmail(email);
      startVerificationResendCooldown(email);
      setResendCooldown(getVerificationResendCooldown(email));
      toast({
        title: "Verification code sent",
        description: "Check your inbox for the latest email verification code.",
      });
    } catch (requestError) {
      const waitSeconds = requestError?.data?.retry_after_seconds;
      if (waitSeconds) {
        startVerificationResendCooldown(email, waitSeconds);
        setResendCooldown(getVerificationResendCooldown(email));
      }
      setError(requestError.message || "Failed to resend verification code.");
    }
  };

  return (
    <AuthLayout
      icon={ShieldCheck}
      title="Verify your email"
      subtitle={subtitle}
      footer={(
        <>
          Need to try logging in again?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Back to login
          </Link>
        </>
      )}
    >
      {error ? (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="mb-4 rounded-2xl border border-teal-200 bg-teal-50/70 p-4 text-sm text-teal-900">
        You can come back to this page anytime if you left signup before finishing email verification.
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="verification-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="verification-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Verification code</Label>
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otpCode}
              onChange={setOtpCode}
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
        </div>

        <Button
          className="h-12 w-full font-medium"
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6 || !email.trim()}
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

        <Button
          type="button"
          variant="outline"
          className="h-12 w-full"
          onClick={handleResend}
          disabled={loading || !email.trim() || resendCooldown > 0}
        >
          {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : "Resend code"}
        </Button>
      </div>
    </AuthLayout>
  );
}
