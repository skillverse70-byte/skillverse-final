import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getActorHomePath } from "@/lib/access-control";
import DashboardPage from "@/features/dashboard/pages/DashboardPage";

export default function ActorDashboardPage() {
  const { actorRole } = useAuth();
  const homePath = getActorHomePath(actorRole);

  if (homePath !== "/dashboard") {
    return <Navigate to={homePath} replace />;
  }

  return <DashboardPage />;
}
