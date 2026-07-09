import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ModuleDetailShell({
  backHref = "",
  backLabel = "Back",
  eyebrow = "",
  title,
  description = "",
  actions = null,
  value,
  onValueChange,
  tabs,
  children,
}) {
  return (
    <Tabs
      value={value}
      onValueChange={onValueChange}
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6"
    >
      {backHref ? (
        <Link
          to={backHref}
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>
      ) : null}

      <div className="overflow-hidden rounded-[28px] border border-border/60 bg-[linear-gradient(135deg,rgba(240,253,250,0.9),rgba(255,255,255,1),rgba(239,246,255,0.9))] shadow-sm shadow-black/5">
        <div className="flex flex-col gap-5 px-5 py-6 sm:px-8 sm:py-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            {eyebrow ? (
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>

        <div className="border-t border-border/60 bg-white/75 px-3 py-3 backdrop-blur sm:px-5">
          <div className="overflow-x-auto">
            <TabsList className="flex h-auto min-w-max gap-2 bg-transparent p-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const badgeValue =
                  typeof tab.badge === "number" || typeof tab.badge === "string"
                    ? tab.badge
                    : null;

                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="min-w-[180px] flex-1 justify-start rounded-2xl border border-transparent px-4 py-3 text-left data-[state=active]:border-teal-200 data-[state=active]:bg-white data-[state=active]:text-teal-900 data-[state=active]:shadow-sm sm:min-w-[220px]"
                  >
                    <div className="flex w-full items-start gap-3">
                      {Icon ? (
                        <div className="mt-0.5 rounded-xl bg-secondary/40 p-2 text-teal-700">
                          <Icon className="h-4 w-4" />
                        </div>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{tab.label}</span>
                          {badgeValue !== null ? (
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                              {badgeValue}
                            </span>
                          ) : null}
                        </div>
                        {tab.description ? (
                          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {tab.description}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </div>
      </div>

      <div className="mt-6 min-w-0">{children}</div>
    </Tabs>
  );
}
