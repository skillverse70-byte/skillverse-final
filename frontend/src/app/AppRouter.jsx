import React, { Suspense } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import AppLayout from "@/components/layout/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import GuestOnlyRoute from "@/components/GuestOnlyRoute";
import PageNotFound from "@/lib/PageNotFound";
import AuthGate from "@/app/bootstrap/AuthGate";
import { appRoutes, guestRoutes, publicBrowseRoutes } from "@/app/routes";
import PageLoader from "@/components/shared/PageLoader";

export default function AppRouter() {
  return (
    <Router>
      <ScrollToTop />
      <AuthGate>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<GuestOnlyRoute />}>
              {guestRoutes.map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
            </Route>
            <Route element={<AppLayout />}>
              {publicBrowseRoutes.map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                {appRoutes.map((route) => (
                  <Route
                    key={route.path}
                    path={route.path}
                    element={
                      <ProtectedRoute allowedRoles={route.allowedRoles}>
                        {route.element}
                      </ProtectedRoute>
                    }
                  />
                ))}
              </Route>
            </Route>
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Suspense>
      </AuthGate>
    </Router>
  );
}
