import React, { useEffect, useRef, useState } from 'react';

export interface ColumnSeries {
  key: string;
  label: string;
  color: string;
}

interface ColumnChartProps {
  data: ({ label: string } & Record<string, number | string>)[];
  series: ColumnSeries[];
  height?: number;
  /** Value on each column cap; only for sparse single-series charts. */
  labelValues?: boolean;
  unit?: string;
}

const MARGIN = { top: 18, right: 4, bottom: 26, left: 30 };
const GRID = '#e2e8f0';
const AXIS_TEXT = '#64748b';

const niceMax = (max: number) => {
  if (max <= 5) return 5;
  const step = max <= 20 ? 5 : max <= 50 ? 10 : Math.pow(10, Math.floor(Math.log10(max)));
  return Math.ceil(max / step) * step;
};

/** Rounded 4px data-end, square at the baseline. */
const columnPath = (x: number, y: number, w: number, h: number) => {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
};

export const ColumnChart: React.FC<ColumnChartProps> = ({ data, series, height = 220, labelValues = false, unit = '' }) => {
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

  const max = niceMax(Math.max(1, ...data.flatMap(d => series.map(s => Number(d[s.key]) || 0))));
  const ticks = [0, max / 2, max];
  const plotW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotH = height - MARGIN.top - MARGIN.bottom;
  const band = data.length ? plotW / data.length : 0;
  const gap = 2;
  const barW = Math.max(4, Math.min(24, (band * 0.7 - gap * (series.length - 1)) / series.length));
  const groupW = barW * series.length + gap * (series.length - 1);
  const y = (v: number) => MARGIN.top + plotH - (v / max) * plotH;

  const fmt = (v: number) => `${v}${unit}`;
  const activeRow = active !== null ? data[active] : null;
  const tipX = active !== null ? MARGIN.left + band * active + band / 2 : 0;

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={data.map(d => `${d.label}: ${series.map(s => `${s.label} ${d[s.key]}`).join(', ')}`).join('; ')}>
          {ticks.map(t => (
            <g key={t}>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={MARGIN.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={AXIS_TEXT}>{t}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const x0 = MARGIN.left + band * i + (band - groupW) / 2;
            return (
              <g key={d.label}>
                {active === i && <rect x={MARGIN.left + band * i + 2} y={MARGIN.top} width={band - 4} height={plotH} fill="#f1f5f9" rx={4} />}
                {series.map((s, si) => {
                  const v = Number(d[s.key]) || 0;
                  const h = (v / max) * plotH;
                  const x = x0 + si * (barW + gap);
                  return (
                    <g key={s.key}>
                      {v > 0 && <path d={columnPath(x, y(v), barW, h)} fill={s.color} />}
                      {labelValues && v > 0 && (
                        <text x={x + barW / 2} y={y(v) - 5} textAnchor="middle" fontSize={11} fontWeight={600} fill="#0f172a">{fmt(v)}</text>
                      )}
                    </g>
                  );
                })}
                <text x={MARGIN.left + band * i + band / 2} y={height - 8} textAnchor="middle" fontSize={11} fill={AXIS_TEXT}>{d.label}</text>
                {/* Hit target: the whole band, bigger than the marks */}
                <rect
                  x={MARGIN.left + band * i}
                  y={MARGIN.top}
                  width={band}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  role="img"
                  aria-label={`${d.label}: ${series.map(s => `${s.label} ${fmt(Number(d[s.key]) || 0)}`).join(', ')}`}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  style={{ outline: 'none' }}
                />
              </g>
            );
          })}
        </svg>
      )}

      {activeRow && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full bg-white border border-slate-200 shadow-lg rounded-lg px-3 py-2 text-xs whitespace-nowrap"
          style={{ left: Math.min(Math.max(tipX, 70), width - 70), top: MARGIN.top + 4 }}
        >
          <div className="font-semibold text-slate-500 mb-1">{activeRow.label}</div>
          {series.map(s => (
            <div key={s.key} className="flex items-center gap-2">
              <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />
              <strong className="text-slate-900 tabular-nums">{fmt(Number(activeRow[s.key]) || 0)}</strong>
              <span className="text-slate-500">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** Legend for multi-series charts; the key mirrors the mark (rect for bars, short line for lines). */
export const ChartLegend: React.FC<{ series: ColumnSeries[]; mark?: 'bar' | 'line' }> = ({ series, mark = 'bar' }) => (
  <div className="flex items-center gap-4 flex-wrap text-xs text-slate-600">
    {series.map(s => (
      <span key={s.key} className="inline-flex items-center gap-1.5">
        <span className={mark === 'line' ? 'w-3.5 h-0.5 rounded-full' : 'w-2.5 h-2.5 rounded-sm'} style={{ backgroundColor: s.color }} />
        {s.label}
      </span>
    ))}
  </div>
);
