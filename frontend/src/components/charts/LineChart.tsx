import React, { useEffect, useRef, useState } from 'react';
import type { ColumnSeries } from './ColumnChart';

interface LineChartProps<T extends { label: string }> {
  data: T[];
  series: ColumnSeries[];
  height?: number;
  /** Optional heading for the tooltip, e.g. "Week of 1 Sept". */
  tooltipTitle?: (label: string) => string;
}

const GRID = '#e2e8f0';
const AXIS_TEXT = '#64748b';
const SURFACE = '#ffffff';
const LABEL_GAP = 15;

const niceMax = (max: number) => {
  if (max <= 5) return 5;
  const step = max <= 20 ? 5 : max <= 100 ? 20 : Math.pow(10, Math.floor(Math.log10(max)));
  return Math.ceil(max / step) * step;
};

/** Multi-series line chart: crosshair + tooltip on hover/keyboard, direct end labels, recessive grid. */
export const LineChart = <T extends { label: string }>({ data, series, height = 300, tooltipTitle = l => l }: LineChartProps<T>) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const narrow = width < 520;
  // Room on the right for direct end labels ("73 Units ordered"); on phones only the value
  const margin = { top: 14, right: narrow ? 34 : 150, bottom: 28, left: 30 };
  const plotW = Math.max(0, width - margin.left - margin.right);
  const plotH = height - margin.top - margin.bottom;
  const value = (d: T, key: string) => Number((d as Record<string, unknown>)[key]) || 0;
  const max = niceMax(Math.max(1, ...data.flatMap(d => series.map(s => value(d, s.key)))));
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const x = (i: number) => margin.left + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2);
  const y = (v: number) => margin.top + plotH - (v / max) * plotH;

  // Show about one x label per 90px, always including the last
  const every = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(plotW / 90))));
  const xLabels = data.map((d, i) => ({ i, label: d.label })).filter(({ i }) => i % every === 0 || i === data.length - 1)
    .filter(({ i }, k, arr) => !(k === arr.length - 2 && arr[arr.length - 1].i - i < every / 2));

  // Direct end labels, nudged apart when they'd collide, with a leader line back to the line end
  const last = data[data.length - 1];
  const endLabels = (last ? series.map(s => ({ s, v: value(last, s.key), y: y(value(last, s.key)) })) : [])
    .sort((a, b) => a.y - b.y)
    .reduce<{ s: ColumnSeries; v: number; y: number; ly: number }[]>((acc, l) => {
      const prev = acc[acc.length - 1];
      acc.push({ ...l, ly: prev ? Math.max(l.y, prev.ly + LABEL_GAP) : l.y });
      return acc;
    }, []);

  const handlePointer = (e: React.PointerEvent<SVGRectElement>) => {
    if (data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / Math.max(1, rect.width);
    setActive(Math.round(rel * (data.length - 1)));
  };

  const handleKey = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    setActive(a => {
      const cur = a ?? data.length - 1;
      return Math.min(data.length - 1, Math.max(0, cur + (e.key === 'ArrowRight' ? 1 : -1)));
    });
  };

  const path = (key: string) => data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(value(d, key))}`).join('');
  const activeRow = active !== null ? data[active] : null;
  const tipLeft = active !== null ? x(active) : 0;
  const tipOnLeft = tipLeft > width / 2;

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height }}>
      {width > 0 && data.length > 0 && (
        <svg
          width={width}
          height={height}
          tabIndex={0}
          role="img"
          aria-label={`${series.map(s => `${s.label}: ${value(last, s.key)}`).join(', ')} as of ${last.label}. Use left and right arrow keys to step through weeks.`}
          onKeyDown={handleKey}
          onFocus={() => setActive(a => a ?? data.length - 1)}
          onBlur={() => setActive(null)}
          className="outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded-md"
        >
          {ticks.map(t => (
            <g key={t}>
              <line x1={margin.left} x2={margin.left + plotW} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={margin.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={AXIS_TEXT}>{t}</text>
            </g>
          ))}
          {xLabels.map(({ i, label }) => (
            <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} fontSize={11} fill={AXIS_TEXT}>{label}</text>
          ))}

          {active !== null && <line x1={x(active)} x2={x(active)} y1={margin.top} y2={margin.top + plotH} stroke="#94a3b8" strokeWidth={1} />}

          {series.map(s => (
            <path key={s.key} d={path(s.key)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ))}

          {/* End markers + direct labels */}
          {endLabels.map(({ ly, ...l }) => {
            const ex = x(data.length - 1);
            return (
              <g key={l.s.key}>
                {Math.abs(ly - l.y) > 1 && <line x1={ex + 6} y1={l.y} x2={ex + 12} y2={ly} stroke="#cbd5e1" strokeWidth={1} />}
                <circle cx={ex} cy={l.y} r={4} fill={l.s.color} stroke={SURFACE} strokeWidth={2} />
                <text x={ex + 14} y={ly} dy="0.32em" fontSize={11} fill="#0f172a">
                  <tspan fontWeight={700}>{l.v}</tspan>
                  {!narrow && <tspan fill={AXIS_TEXT}> {l.s.label}</tspan>}
                </text>
              </g>
            );
          })}

          {/* Hover markers at the crosshair */}
          {activeRow && series.map(s => (
            <circle key={s.key} cx={x(active!)} cy={y(value(activeRow, s.key))} r={4} fill={s.color} stroke={SURFACE} strokeWidth={2} />
          ))}

          {/* Hit layer: the whole plot, so the pointer only has to find the week */}
          <rect
            x={margin.left - 6}
            y={margin.top}
            width={plotW + 12}
            height={plotH}
            fill="transparent"
            onPointerMove={handlePointer}
            onPointerDown={handlePointer}
            onPointerLeave={() => setActive(null)}
          />
        </svg>
      )}

      {activeRow && (
        <div
          className="pointer-events-none absolute z-10 bg-white border border-slate-200 shadow-lg rounded-lg px-3 py-2 text-xs whitespace-nowrap"
          style={{ top: margin.top, ...(tipOnLeft ? { right: width - tipLeft + 12 } : { left: tipLeft + 12 }) }}
        >
          <div className="font-semibold text-slate-500 mb-1">{tooltipTitle(String(activeRow.label))}</div>
          {series.map(s => (
            <div key={s.key} className="flex items-center gap-2">
              <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />
              <strong className="text-slate-900 tabular-nums w-6 text-right">{value(activeRow, s.key)}</strong>
              <span className="text-slate-500">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
