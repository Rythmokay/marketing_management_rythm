import React from 'react';
import type { CampaignRecord } from '../../types/crm';
import { getStage, PIPELINE_STAGES } from '../../utils/campaign';

/** Stacked bar of a product's active placements by stage (awaiting delivery -> awaiting review -> review posted). */
export const PipelineBar: React.FC<{ campaigns: CampaignRecord[]; showLegend?: boolean; scaleMax?: number }> = ({ campaigns, showLegend = false, scaleMax }) => {
  const counts = PIPELINE_STAGES.map(s => ({ ...s, count: campaigns.filter(c => getStage(c) === s.stage).length }));
  const total = counts.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="flex flex-col gap-2">
      {/* With scaleMax the bar length shows the count too, so bars compare across products */}
      <div className="flex h-2.5 gap-[2px] rounded-full bg-slate-100 overflow-hidden" role="img"
        style={{ width: scaleMax ? `${Math.max(total / scaleMax, 0.04) * 100}%` : '100%' }}
        aria-label={counts.map(c => `${c.label}: ${c.count}`).join(', ')}>
        {total > 0 && counts.filter(c => c.count > 0).map(c => (
          <div
            key={c.stage}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(c.count / total) * 100}%`, backgroundColor: c.color }}
            title={`${c.label}: ${c.count}`}
          />
        ))}
      </div>
      {showLegend && (
        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-slate-600">
          {counts.map(c => (
            <span key={c.stage} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c.color }} />
              {c.label} <strong className="text-slate-900">{c.count}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/** Stage colour key for a group of pipeline bars. */
export const PipelineLegend: React.FC = () => (
  <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-slate-600">
    {PIPELINE_STAGES.map(s => (
      <span key={s.stage} className="inline-flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
        {s.label}
      </span>
    ))}
  </div>
);
