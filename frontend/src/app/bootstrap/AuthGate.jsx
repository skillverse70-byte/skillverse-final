import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import AppBootScreen from "@/app/bootstrap/AppBootScreen";

export default function AuthGate({ children }) {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } =
    useAuth();

  if (isLoadingAuth || isLoadingPublicSettings) {
    return <AppBootScreen />;
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    }

    if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

  return children;
}
