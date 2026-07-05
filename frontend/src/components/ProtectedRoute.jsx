import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AccessDenied from "@/components/AccessDenied";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({
  fallback = <DefaultFallback />,
  unauthenticatedElement,
  unauthorizedElement,
  allowedRoles = [],
  children,
}) {
  const {
    user,
    isAuthenticated,
    isLoadingAuth,
    authChecked,
    authError,
    checkUserAuth,
    hasAnyRole,
  } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement || <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement || <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!hasAnyRole(allowedRoles)) {
    return (
      unauthorizedElement || (
        <AccessDenied
          message={`Your current actor role does not have access to this route.`}
        />
      )
    );
  }

  return children || <Outlet context={{ user }} />;
}
