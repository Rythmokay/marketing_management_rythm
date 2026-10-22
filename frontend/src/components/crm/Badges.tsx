import React from 'react';
import type { CampaignRecord } from '../../types/crm';
import { getReturnState, getStage, RETURN_INFO, STAGE_INFO, toHref } from '../../utils/campaign';
import { PlatformIcon } from '../ui/SocialIcons';

const badgeBase = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap';

export const StageBadge: React.FC<{ campaign?: CampaignRecord }> = ({ campaign }) => {
  const info = STAGE_INFO[getStage(campaign)];
  return <span className={`${badgeBase} ${info.className}`} title={info.hint}>{info.label}</span>;
};

export const ReturnBadge: React.FC<{ campaign?: CampaignRecord }> = ({ campaign }) => {
  const state = getReturnState(campaign);
  if (state === 'none') return null;
  const info = RETURN_INFO[state];
  return <span className={`${badgeBase} ${info.className}`}>↩ {info.label}</span>;
};

/** Barter = influencer keeps the unit; Returnable = it has to come back. */
export const DealBadge: React.FC<{ value?: string }> = ({ value }) => {
  if (!value) return <span className="text-slate-400 text-xs">Not set</span>;
  const v = value.toLowerCase();
  const cls = v.includes('both')
    ? 'bg-teal-50 text-teal-800 border-teal-200'
    : v.includes('barter')
      ? 'bg-purple-50 text-purple-800 border-purple-200'
      : 'bg-amber-50 text-amber-800 border-amber-200';
  return <span className={`${badgeBase} ${cls}`}>{value}</span>;
};

const SOCIALS: { key: 'youtube' | 'instagram' | 'twitter'; label: string; short: string; className: string }[] = [
  { key: 'youtube', label: 'YouTube', short: 'YT', className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
  { key: 'instagram', label: 'Instagram', short: 'IG', className: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100' },
  { key: 'twitter', label: 'X / Twitter', short: 'X', className: 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200' },
];

export const SocialLinks: React.FC<{ record: Record<string, any>; size?: 'sm' | 'md' }> = ({ record, size = 'sm' }) => {
  const present = SOCIALS.filter(s => record[s.key]);
  if (present.length === 0) return <span className="text-slate-400 text-xs">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      {present.map(s => (
        <a
          key={s.key}
          href={toHref(record[s.key])}
          target="_blank"
          rel="noopener noreferrer"
          title={`${s.label}: ${record[s.key]}`}
          onClick={e => e.stopPropagation()}
          className={`inline-flex items-center justify-center gap-1 rounded-md border font-bold transition-colors ${s.className} ${
            size === 'sm' ? 'text-[10px] h-6 min-w-6 px-1.5' : 'text-xs h-8 px-3 gap-1.5'
          }`}
        >
          <PlatformIcon platform={s.key} size={size === 'sm' ? 12 : 15} />
          {size === 'sm' ? s.short : s.label}
        </a>
      ))}
    </div>
  );
};
