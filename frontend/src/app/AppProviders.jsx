import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClientInstance } from "@/lib/query-client";
import { AuthProvider } from "@/contexts/AuthContext";
import NotificationBootstrap from "@/app/bootstrap/NotificationBootstrap";

export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <NotificationBootstrap />
        {children}
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}
