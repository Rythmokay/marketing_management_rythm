import React, { useState, type ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  /** One-line takeaway shown under the title. */
  insight?: ReactNode;
  children: ReactNode;
  /** Optional table view of the same data, so values are reachable without hovering. */
  table?: { columns: string[]; rows: (string | number)[][] };
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, insight, children, table, className = '' }) => {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className={`card p-5 flex flex-col gap-4 min-w-0 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {insight && <p className="text-xs text-slate-500 mt-0.5">{insight}</p>}
        </div>
        {table && (
          <button
            type="button"
            className="text-xs font-semibold text-slate-500 hover:text-blue-700 whitespace-nowrap cursor-pointer"
            aria-pressed={showTable}
            onClick={() => setShowTable(v => !v)}
          >
            {showTable ? 'Show chart' : 'Show table'}
          </button>
        )}
      </div>
      {showTable && table ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500 border-b border-slate-200">
              <tr>{table.columns.map((c, i) => <th key={c} className={`py-1.5 font-semibold ${i ? 'text-right' : ''}`}>{c}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.rows.map(row => (
                <tr key={String(row[0])}>
                  {row.map((cell, i) => <td key={i} className={`py-1.5 ${i ? 'text-right tabular-nums' : 'text-slate-700'}`}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
};
