import React from "react";

interface PageHeaderProps {
  left?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

export default function PageHeader({ left, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {left}
          <h1 className="text-3xl font-bold leading-none tracking-tight text-slate-800">{title}</h1>
        </div>
        {subtitle && <div className="mt-2 text-sm text-slate-400">{subtitle}</div>}
      </div>

      <div className="flex flex-wrap items-center gap-2 self-center">
        {actions}
      </div>
    </div>
  );
}
