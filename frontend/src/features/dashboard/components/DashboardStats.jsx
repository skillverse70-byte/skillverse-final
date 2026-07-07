import React from "react";
import { ArrowRight } from "lucide-react";

export default function DashboardStats({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const isInteractive = typeof stat.onClick === "function";
        const Wrapper = isInteractive ? "button" : "div";
        return (
          <Wrapper
            key={stat.label}
            type={isInteractive ? "button" : undefined}
            onClick={stat.onClick}
            className={`bg-white rounded-2xl border border-border/50 p-5 text-left ${
              isInteractive ? "transition hover:border-teal-200 hover:shadow-sm" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div
                className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}
              >
                <Icon className="w-5 h-5" />
              </div>
              {isInteractive ? (
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              ) : null}
            </div>
            <div className="font-heading font-bold text-2xl">{stat.count}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
            {stat.description ? (
              <div className="mt-2 text-xs text-muted-foreground">{stat.description}</div>
            ) : null}
          </Wrapper>
        );
      })}
    </div>
  );
}
