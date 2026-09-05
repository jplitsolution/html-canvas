import React from 'react';

export function ApiField({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-sm font-medium text-fg">{label}</label>
        {hint ? <span className="text-[11px] text-fg-subtle">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}
