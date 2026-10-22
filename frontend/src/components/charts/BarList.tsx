import React from 'react';
import { Link } from 'react-router-dom';

export interface BarListItem {
  label: string;
  value: number;
  /** Text at the bar tip; defaults to the value. */
  display?: string;
  /** Secondary text under the label, e.g. "12 of 13". */
  detail?: string;
  href?: string;
  /** Small icon before the label, e.g. a platform logo */
  icon?: React.ReactNode;
}

interface BarListProps {
  items: BarListItem[];
  /** Scale maximum; defaults to the largest value. Use 1 for shares. */
  max?: number;
  color?: string;
  /** Show the unfilled track (a lighter step of the same hue), for shares of a whole. */
  meter?: boolean;
}

const TRACK = '#e6effc';

/** Horizontal single-series bars with the value at the tip. */
export const BarList: React.FC<BarListProps> = ({ items, max, color = '#2a78d6', meter = false }) => {
  const scale = max ?? Math.max(1, ...items.map(i => i.value));
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map(item => {
        const pct = Math.max(0, Math.min(1, item.value / scale)) * 100;
        const label = item.href
          ? <Link to={item.href} className="hover:text-blue-700 hover:underline">{item.label}</Link>
          : item.label;
        return (
          <li key={item.label} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] items-center gap-3">
            <div className="min-w-0">
              <div className="text-sm text-slate-800 truncate flex items-center gap-1.5" title={item.label}>{item.icon}<span className="truncate">{label}</span></div>
              {item.detail && <div className="text-[11px] text-slate-500 truncate">{item.detail}</div>}
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex-1 h-3 rounded-r-[4px] relative" style={{ backgroundColor: meter ? TRACK : 'transparent' }}>
                <div className="absolute inset-y-0 left-0 rounded-r-[4px]" style={{ width: `${pct}%`, minWidth: item.value > 0 ? 3 : 0, backgroundColor: color }} />
              </div>
              <span className="text-xs font-semibold text-slate-900 tabular-nums w-12 text-right shrink-0">{item.display ?? item.value}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
};
