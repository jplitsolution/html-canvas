import React from 'react';

export function TemplateVariablesLegend({ variables = [], showChainingNote = true }) {
  const defaultVars = [
    { key: '{{msisdn}}', highlight: 'primary' },
    { key: '{{phone}}', highlight: 'primary' },
    { key: '{{otp}}', highlight: 'primary' },
    { key: '{{transactionId}}', highlight: 'emerald' },
    { key: '{{requestId}}', highlight: 'emerald' },
    { key: '{{serviceId}}', highlight: 'muted' },
    { key: '{{subServiceId}}', highlight: 'muted' },
    { key: '{{cpId}}', highlight: 'muted' },
    { key: '{{channel}}', highlight: 'muted' },
    { key: '{{country}}', highlight: 'muted' },
  ];

  const list = variables.length ? variables : defaultVars;

  return (
    <div className="rounded-lg bg-bg-subtle/70 p-3 border border-border/60">
      <p className="text-[11px] font-semibold text-fg uppercase tracking-wider mb-1.5">
        Available Template Variables
      </p>
      <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
        {list.map((item) => {
          const isPrimary = item.highlight === 'primary';
          const isEmerald = item.highlight === 'emerald';
          return (
            <span
              key={item.key}
              className={`rounded px-2 py-0.5 border ${
                isPrimary
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : isEmerald
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-bg-base text-fg-muted border-border'
              }`}
            >
              {item.key}
            </span>
          );
        })}
      </div>
      {showChainingNote && (
        <p className="text-[10px] text-fg-subtle mt-1.5">
          Note: <code className="text-emerald-500">{'{{transactionId}}'}</code> &{' '}
          <code className="text-emerald-500">{'{{requestId}}'}</code> are automatically extracted from
          the Send OTP response and can be used in Verify OTP request body/URL.
        </p>
      )}
    </div>
  );
}
