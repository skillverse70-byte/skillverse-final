import React, { Suspense } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import AppLayout from "@/components/layout/AppLayout";
import PageNotFound from "@/lib/PageNotFound";
import AuthGate from "@/app/bootstrap/AuthGate";
import { appRoutes, publicRoutes } from "@/app/routes";
import PageLoader from "@/components/shared/PageLoader";

export default function AppRouter() {
  return (
    <Router>
      <ScrollToTop />
      <AuthGate>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {publicRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
            <Route element={<AppLayout />}>
              {appRoutes.map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
            </Route>
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Suspense>
      </AuthGate>
    </Router>
  );
}
