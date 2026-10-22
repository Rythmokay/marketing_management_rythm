import type { CampaignRecord } from '../types/crm';

/**
 * Where an influencer is with one product, following the order of the tracking sheets:
 * order placed -> unit received -> review video posted.
 */
export type Stage = 'not_ordered' | 'paused' | 'ordered' | 'received' | 'reviewed';

/** Return flow, only relevant when the unit has to be sent back. */
export type ReturnState = 'none' | 'due' | 'picked_up' | 'returned';

const yes = (v?: string) => (v || '').toLowerCase().includes('yes');

export const getStage = (c?: CampaignRecord): Stage => {
  if (!c) return 'not_ordered';
  if ((c.orderMade || '').toLowerCase().includes('pause')) return 'paused';
  if (yes(c.received)) return c.reviewVideoLink ? 'reviewed' : 'received';
  if (yes(c.orderMade)) return 'ordered';
  return 'not_ordered';
};

export const getReturnState = (c?: CampaignRecord): ReturnState => {
  if (!c) return 'none';
  if (yes(c.returnReceived)) return 'returned';
  if (yes(c.pickedUp)) return 'picked_up';
  if (yes(c.toBeReturned)) return 'due';
  return 'none';
};

export const STAGE_INFO: Record<Stage, { label: string; hint: string; className: string }> = {
  not_ordered: { label: 'Not ordered', hint: 'No order placed yet', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  paused: { label: 'Paused', hint: 'Order on hold', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  ordered: { label: 'Awaiting delivery', hint: 'Ordered, not received yet', className: 'bg-sky-50 text-sky-800 border-sky-200' },
  received: { label: 'Awaiting review', hint: 'Received, no review video yet', className: 'bg-blue-50 text-blue-800 border-blue-200' },
  reviewed: { label: 'Review posted', hint: 'Review video is live', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
};

export const RETURN_INFO: Record<Exclude<ReturnState, 'none'>, { label: string; className: string }> = {
  due: { label: 'Return due', className: 'bg-orange-50 text-orange-800 border-orange-200' },
  picked_up: { label: 'Return picked up', className: 'bg-violet-50 text-violet-800 border-violet-200' },
  returned: { label: 'Returned', className: 'bg-slate-100 text-slate-700 border-slate-200' },
};

/** Ordinal blue ramp for the pipeline bar (validated: one hue, light -> dark). */
export const PIPELINE_STAGES: { stage: Stage; label: string; color: string }[] = [
  { stage: 'ordered', label: 'Awaiting delivery', color: '#86b6ef' },
  { stage: 'received', label: 'Awaiting review', color: '#3987e5' },
  { stage: 'reviewed', label: 'Review posted', color: '#184f95' },
];

export const isActive = (c?: CampaignRecord) => ['ordered', 'received', 'reviewed'].includes(getStage(c));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

/** Today's date in the sheet's style, e.g. "14 Oct". */
export const todayLabel = () => {
  const d = new Date();
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/** Sheet links are sometimes saved without a scheme (e.g. "instagram.com/x"). */
export const toHref = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);
