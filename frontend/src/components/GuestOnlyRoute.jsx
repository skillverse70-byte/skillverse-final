import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getActorHomePath } from "@/lib/access-control";

export default function GuestOnlyRoute({
  redirectTo,
  children,
}) {
  const { isAuthenticated, isLoadingAuth, authChecked, actorRole } = useAuth();

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo || getActorHomePath(actorRole)} replace />;
  }

  return children || <Outlet />;
}
