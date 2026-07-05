import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";

export default function AuthLayout({
  icon: Icon,
  title,
  subtitle,
  footer,
  children,
  maxWidthClass = "max-w-md",
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.12),_transparent_28%),linear-gradient(180deg,_#fbfffe_0%,_#ffffff_46%,_#f6f3ea_100%)] px-4 py-8">
      <div className={`mx-auto flex min-h-[calc(100vh-4rem)] w-full flex-col items-center justify-center ${maxWidthClass}`}>
        <div className="mb-8 flex w-full items-center justify-between text-sm">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
          <Link to="/courses" className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
            <Compass className="w-4 h-4" />
            Browse public content
          </Link>
        </div>
        <div className="w-full">
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
              <Icon
                className="w-7 h-7 text-primary-foreground"
                aria-hidden="true"
              />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            {children}
          </div>
          {footer && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {footer}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
