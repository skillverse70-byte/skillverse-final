import React from "react";

export default function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-8 flex items-center justify-between gap-4">
      <div>
        <h1 className="font-heading font-bold text-3xl text-foreground mb-1">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>
      {actions || null}
    </div>
  );
}
