import React from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export default function AccessDenied({
  title = "Access Denied",
  message = "You do not have permission to view this page.",
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-16">
      <div className="max-w-lg w-full rounded-3xl border border-border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <span className="text-xl font-bold">!</span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
        <div className="mt-6 flex justify-center">
          <Link to="/">
            <Button>Return Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
