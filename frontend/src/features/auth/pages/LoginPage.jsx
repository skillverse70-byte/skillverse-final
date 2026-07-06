import React, { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { LogIn, Lock, Loader2, Mail } from "lucide-react";
import { authService } from "@/services/auth/auth.service";
import { getActorHomePath } from "@/lib/access-control";
import { appRuntime } from "@/lib/runtime-config";
import { isBackendApiMode } from "@/lib/runtime-config";
import AuthLayout from "@/features/auth/components/AuthLayout";
import GoogleIcon from "@/features/auth/components/GoogleIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const requestedPath =
    location.state?.from?.pathname ||
    searchParams.get("from") ||
    null;
  const verificationReturnTarget = requestedPath || "/login";
  const showGoogleOption = !isBackendApiMode();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNeedsVerification(false);
    setLoading(true);
    try {
      await authService.login(email, password);
      if (requestedPath) {
        window.location.href = requestedPath;
        return;
      }
      const currentUser = await authService.me();
      window.location.href = getActorHomePath(currentUser);
    } catch (requestError) {
      setError(requestError.message || "Invalid email or password");
      const message = requestError.message || "";
      const isVerificationError =
        message.toLowerCase().includes("verification") ||
        requestError?.data?.code === "email_not_verified";
      setNeedsVerification(isVerificationError);
      if (isVerificationError && typeof window !== "undefined") {
        window.localStorage.setItem(
          `${appRuntime.storagePrefix}:${appRuntime.storageKeys.pendingVerificationEmail}`,
          email,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    authService.loginWithProvider("google", "/");
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to continue into protected SkillVerse workflows"
      footer={(
        <>
          Don&apos;t have an account?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create one
          </Link>
          {" · "}
          <Link
            to="/organizations/register"
            className="font-medium text-primary hover:underline"
          >
            Register an organization
          </Link>
          {" · "}
          <Link to="/get-started" className="font-medium text-primary hover:underline">
            Compare entry paths
          </Link>
        </>
      )}
    >
      {showGoogleOption && (
        <>
          <Button
            variant="outline"
            className="mb-6 h-12 w-full text-sm font-medium"
            onClick={handleGoogle}
          >
            <GoogleIcon className="mr-2 h-5 w-5" />
            Continue with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground">or</span>
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {needsVerification ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
          <p className="font-medium">This account still needs email verification.</p>
          <p className="mt-1">
            You can finish that now without starting over.
          </p>
          <Link
            to={`/verify-email?email=${encodeURIComponent(email)}&from=${encodeURIComponent(verificationReturnTarget)}`}
            className="mt-3 inline-flex font-medium text-teal-800 hover:underline"
          >
            Open verification page
          </Link>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 pl-10"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 pl-10"
              required
            />
          </div>
        </div>
        <Button type="submit" className="h-12 w-full font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
