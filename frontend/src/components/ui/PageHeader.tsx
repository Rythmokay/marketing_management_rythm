import React, { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  back?: { to: string; label: string };
  actions?: ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, back, actions }) => (
  <div className="flex flex-col gap-3 mb-6">
    {back && (
      <Link to={back.to} className="text-xs font-semibold text-slate-500 hover:text-blue-700 w-fit">
        ← {back.label}
      </Link>
    )}
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  </div>
);

export const EmptyState: React.FC<{ title: string; children?: ReactNode }> = ({ title, children }) => (
  <div className="py-12 px-6 text-center flex flex-col items-center gap-2">
    <p className="text-slate-900 font-semibold text-sm">{title}</p>
    {children && <div className="text-slate-500 text-sm max-w-md">{children}</div>}
  </div>
);
