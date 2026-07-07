import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function WorkspaceShell({
  title,
  description,
  eyebrow,
  value,
  onValueChange,
  tabs,
  actions = null,
  showTabDescriptions = true,
  children,
}) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-24">
          <div className="rounded-3xl border border-border/60 bg-white p-3 shadow-sm shadow-black/5">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 lg:grid-cols-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="justify-start rounded-2xl border border-transparent px-4 py-3 text-left data-[state=active]:border-teal-200 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-900"
                  >
                    <div className="flex w-full items-start gap-3">
                      {Icon ? (
                        <div className="mt-0.5 rounded-xl bg-white/80 p-2 text-teal-700 shadow-sm shadow-teal-100">
                          <Icon className="h-4 w-4" />
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        <div className="font-medium">{tab.label}</div>
                        {showTabDescriptions && tab.description ? (
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
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </Tabs>
  );
}
