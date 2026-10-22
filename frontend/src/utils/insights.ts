import type { CampaignRecord, InfluencerRecord } from '../types/crm';
import type { Platform } from '../components/ui/SocialIcons';
import { getStage } from './campaign';

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
  sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};
export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

/**
 * Sheet dates are "6 May" style with no year (sometimes "1 July, 6 Aug" for a resend - the first wins).
 * They all fall in the current campaign year.
 */
export const parseSheetDate = (value?: string): Date | null => {
  const m = /(\d{1,2})\s+([A-Za-z]+)/.exec(value || '');
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (month === undefined) return null;
  return new Date(new Date().getFullYear(), month, Number(m[1]));
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days from order to receipt, for placements that have both dates. */
export const deliveryDays = (c: CampaignRecord): number | null => {
  const ordered = parseSheetDate(c.orderDate);
  const received = parseSheetDate(c.receivedDate);
  if (!ordered || !received) return null;
  const days = Math.round((received.getTime() - ordered.getTime()) / DAY_MS);
  return days >= 0 ? days : null;
};

export const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const average = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0);

/** Orders placed and units received per month, from the first to the last month with activity. */
export const monthlyActivity = (campaigns: CampaignRecord[]) => {
  const orders = new Map<number, number>();
  const received = new Map<number, number>();
  campaigns.forEach(c => {
    const o = parseSheetDate(c.orderDate);
    const r = parseSheetDate(c.receivedDate);
    if (o) orders.set(o.getMonth(), (orders.get(o.getMonth()) || 0) + 1);
    if (r) received.set(r.getMonth(), (received.get(r.getMonth()) || 0) + 1);
  });
  const months = [...orders.keys(), ...received.keys()];
  if (months.length === 0) return [];
  const rows = [];
  for (let m = Math.min(...months); m <= Math.max(...months); m++) {
    rows.push({ label: MONTH_LABELS[m], orders: orders.get(m) || 0, received: received.get(m) || 0 });
  }
  return rows;
};

export const DELIVERY_BINS = [
  { label: '1–2 days', min: 0, max: 2 },
  { label: '3–4 days', min: 3, max: 4 },
  { label: '5–6 days', min: 5, max: 6 },
  { label: '7–9 days', min: 7, max: 9 },
  { label: '10+ days', min: 10, max: Infinity },
];

export const reviewPlatform = (url: string) => {
  const u = url.toLowerCase();
  if (u.includes('/shorts/')) return 'YouTube Shorts';
  if (u.includes('youtu')) return 'YouTube video';
  if (u.includes('instagram')) return 'Instagram';
  if (u.includes('x.com') || u.includes('twitter')) return 'X / Twitter';
  return 'Other';
};

/** Logo to show next to a reviewPlatform() label. */
export const platformOfLabel = (label: string): Platform | null =>
  label === 'YouTube Shorts' ? 'youtubeShorts'
    : label.startsWith('YouTube') ? 'youtube'
      : label === 'Instagram' ? 'instagram'
        : label.startsWith('X') ? 'twitter'
          : null;

/** Share of received units that already have a review video, per product. */
export const reviewRateByProduct = (products: string[], campaigns: CampaignRecord[]) =>
  products
    .map(p => {
      const received = campaigns.filter(c => c.product === p && ['received', 'reviewed'].includes(getStage(c)));
      const reviewed = received.filter(c => getStage(c) === 'reviewed');
      return { product: p, received: received.length, reviewed: reviewed.length, rate: received.length ? reviewed.length / received.length : 0 };
    })
    .filter(r => r.received > 0);

export const countBy = <T,>(items: T[], key: (item: T) => string) => {
  const counts = new Map<string, number>();
  items.forEach(i => { const k = key(i); counts.set(k, (counts.get(k) || 0) + 1); });
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
};

export const PROFILE_FIELDS: { key: keyof InfluencerRecord; label: string }[] = [
  { key: 'phone', label: 'Phone number' },
  { key: 'language', label: 'Language' },
  { key: 'email', label: 'Email' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'address', label: 'Shipping address' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'barterStatus', label: 'Deal type' },
  { key: 'twitter', label: 'X / Twitter' },
];

const startOfWeek = (d: Date) => {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); // weeks start on Monday
  return s;
};

export interface TimelinePoint {
  /** Monday of the week. */
  week: Date;
  label: string;
  ordered: number;
  received: number;
  influencers: number;
  products: number;
  inTransit: number;
  ordersThisWeek: number;
}

/**
 * Running totals at the end of each week, from the week of the first order to the latest dated event:
 * units ordered and received, distinct influencers reached and distinct products in play.
 */
export const weeklyTimeline = (campaigns: CampaignRecord[]): TimelinePoint[] => {
  const events = campaigns.map(c => ({ c, ordered: parseSheetDate(c.orderDate), received: parseSheetDate(c.receivedDate) }));
  const dates = events.flatMap(e => [e.ordered, e.received]).filter((d): d is Date => d !== null);
  if (dates.length === 0) return [];
  const first = startOfWeek(new Date(Math.min(...dates.map(d => d.getTime()))));
  const last = new Date(Math.max(...dates.map(d => d.getTime())));

  const points: TimelinePoint[] = [];
  for (let week = first; week <= last; week = new Date(week.getFullYear(), week.getMonth(), week.getDate() + 7)) {
    const end = new Date(week.getFullYear(), week.getMonth(), week.getDate() + 6, 23, 59);
    const orderedBy = events.filter(e => e.ordered && e.ordered <= end);
    const received = events.filter(e => e.received && e.received <= end).length;
    points.push({
      week,
      label: `${week.getDate()} ${MONTH_LABELS[week.getMonth()]}`,
      ordered: orderedBy.length,
      received,
      influencers: new Set(orderedBy.map(e => e.c.influencerId)).size,
      products: new Set(orderedBy.map(e => e.c.product)).size,
      inTransit: orderedBy.filter(e => !(e.received && e.received <= end)).length,
      ordersThisWeek: orderedBy.filter(e => e.ordered! >= week).length,
    });
  }
  return points;
};
