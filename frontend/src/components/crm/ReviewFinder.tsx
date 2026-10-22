import React, { useEffect, useState } from 'react';
import { CircleAlert, CircleCheck, CircleX, ExternalLink, LoaderCircle, Play, RotateCw, Sparkles, TriangleAlert } from 'lucide-react';
import { canSearchReview, reviewKey, useReviewSearchConfigured, useReviewSearchStore, type ReviewSearchEntry } from '../../store/reviewSearchStore';
import type { InfluencerRecord, ReviewSearchResult } from '../../types/crm';
import { PlatformIcon } from '../ui/SocialIcons';

const STATUS: Record<ReviewSearchResult['status'], { label: string; icon: React.ElementType; pill: string; box: string }> = {
  FOUND: { label: 'Review found', icon: CircleCheck, pill: 'bg-emerald-50 text-emerald-800 border-emerald-200', box: 'border-emerald-200 bg-emerald-50/40' },
  NEEDS_REVIEW: { label: 'Possible match', icon: TriangleAlert, pill: 'bg-amber-50 text-amber-800 border-amber-200', box: 'border-amber-200 bg-amber-50/40' },
  NOT_FOUND: { label: 'No review yet', icon: CircleX, pill: 'bg-slate-100 text-slate-700 border-slate-200', box: 'border-slate-200 bg-slate-50' },
};

const pillBase = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap';

const timeAgo = (at: number) => {
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
};

/** Seconds since a search started, ticking while it runs. */
const Elapsed: React.FC<{ since: number }> = ({ since }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return <span className="tabular-nums">{Math.max(0, Math.round((now - since) / 1000))}s</span>;
};

export const ReviewStatusPill: React.FC<{ status: ReviewSearchResult['status'] }> = ({ status }) => {
  const s = STATUS[status];
  const Icon = s.icon;
  return <span className={`${pillBase} ${s.pill}`}><Icon size={12} aria-hidden />{s.label}</span>;
};

interface ResultCardProps {
  result: ReviewSearchResult;
  at: number;
  /** The link already saved for this placement, so "Use" isn't offered twice. */
  currentLink?: string;
  useLabel: string;
  onUse?: (url: string) => void | Promise<void>;
  onRetry: () => void;
}

/** What the AI search found: the video (thumbnail, title, uploader, date), why, and what was searched. */
export const ReviewResultCard: React.FC<ResultCardProps> = ({ result, at, currentLink, useLabel, onUse, onRetry }) => {
  const [using, setUsing] = useState(false);
  const s = STATUS[result.status];
  const alreadyUsed = !!result.videoUrl && result.videoUrl === currentLink;

  const handleUse = async () => {
    if (!onUse || !result.videoUrl) return;
    setUsing(true);
    try { await onUse(result.videoUrl); } finally { setUsing(false); }
  };

  return (
    <div className={`rounded-lg border p-3 ${s.box}`}>
      <div className="flex flex-col sm:flex-row gap-3">
        {result.videoUrl && (
          <a href={result.videoUrl} target="_blank" rel="noopener noreferrer"
            className="relative shrink-0 w-full sm:w-40 aspect-video rounded-md overflow-hidden bg-slate-200 group"
            aria-label={`Watch ${result.videoTitle || 'video'} on YouTube`}>
            {result.thumbnailUrl && <img src={result.thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />}
            <span className="absolute inset-0 flex items-center justify-center bg-slate-900/10 group-hover:bg-slate-900/30 transition-colors">
              <span className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center shadow">
                <Play size={16} fill="currentColor" aria-hidden />
              </span>
            </span>
          </a>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <ReviewStatusPill status={result.status} />
            {result.confidence && (result.status !== 'NOT_FOUND' || result.confidence === 'low') && (
              <span className={`${pillBase} bg-white text-slate-600 border-slate-200`}>{result.confidence} confidence</span>
            )}
            <span className="text-[11px] text-slate-500">Checked {timeAgo(at)}</span>
          </div>
          {result.videoUrl && (
            <a href={result.videoUrl} target="_blank" rel="noopener noreferrer"
              className="mt-1.5 block text-sm font-semibold text-slate-900 hover:text-blue-700 line-clamp-2">
              {result.videoTitle || result.videoUrl}
            </a>
          )}
          {(result.videoChannel || result.publishedDate) && (
            <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5">
              <PlatformIcon platform={result.videoUrl?.includes('/shorts/') ? 'youtubeShorts' : 'youtube'} size={12} />
              {[result.videoChannel, result.publishedDate].filter(Boolean).join(' · ')}
            </div>
          )}
          {result.reason && <p className="text-xs text-slate-700 mt-1.5">{result.reason}</p>}
          {!!result.searchQueries?.length && (
            <details className="mt-1.5 text-xs text-slate-500">
              <summary className="cursor-pointer hover:text-slate-800 w-fit">What was searched ({result.searchQueries.length})</summary>
              <ul className="mt-1 flex flex-wrap gap-1">
                {result.searchQueries.map(q => <li key={q} className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">{q}</li>)}
              </ul>
            </details>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {result.videoUrl && onUse && (
          alreadyUsed
            ? <span className={`${pillBase} bg-white text-emerald-800 border-emerald-200`}><CircleCheck size={12} aria-hidden />Saved as the review link</span>
            : <button type="button" className={`${result.status === 'FOUND' ? 'btn-primary' : 'btn-secondary'} py-1.5! text-xs!`} disabled={using} onClick={handleUse}>
                {using ? 'Saving…' : useLabel}
              </button>
        )}
        {result.videoUrl && (
          <a href={result.videoUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary py-1.5! text-xs!">
            <PlatformIcon platform="youtube" size={14} />Open on YouTube<ExternalLink size={12} aria-hidden className="text-slate-400" />
          </a>
        )}
        <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-blue-700 cursor-pointer px-1.5 py-1.5" onClick={onRetry}>
          <RotateCw size={13} aria-hidden />Search again
        </button>
      </div>
    </div>
  );
};

/** "Searching…" placeholder with the elapsed time, shaped like the result card. */
export const ReviewSearchingCard: React.FC<{ search: Pick<ReviewSearchEntry, 'phase' | 'at'>; channel?: string }> = ({ search, channel }) => (
  <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3" role="status">
    <div className="flex gap-3 items-center">
      <div className="hidden sm:block w-40 aspect-video rounded-md bg-blue-100 animate-pulse shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
          {search.phase === 'queued'
            ? <>Waiting to search…</>
            : <><LoaderCircle size={15} className="animate-spin" aria-hidden />Searching {channel || 'their channel'} on YouTube… <span className="font-normal text-blue-700"><Elapsed since={search.at} /></span></>}
        </div>
        <p className="text-xs text-blue-800/80 mt-1">Gemini searches Google for the video, then YouTube confirms who uploaded it. Usually 20–60 seconds, sometimes up to 2 minutes.</p>
        <div className="mt-2 h-2 w-2/3 rounded bg-blue-100 animate-pulse" />
      </div>
    </div>
  </div>
);

export const ReviewSearchError: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2 text-sm text-red-800" role="alert">
    <CircleAlert size={16} className="shrink-0 mt-0.5" aria-hidden />
    <div className="flex-1">{message}</div>
    <button type="button" className="text-xs font-semibold underline cursor-pointer shrink-0" onClick={onRetry}>Try again</button>
  </div>
);

interface ReviewSearchProps {
  influencer?: InfluencerRecord;
  product: string;
  currentLink?: string;
  useLabel: string;
  onUse: (url: string) => void | Promise<void>;
}

/** Search button for one placement, then its live progress and result. */
export const ReviewSearch: React.FC<ReviewSearchProps> = ({ influencer, product, currentLink, useLabel, onUse }) => {
  const configured = useReviewSearchConfigured();
  const { searches, search } = useReviewSearchStore();
  const entry = influencer ? searches[reviewKey(influencer.id, product)] : undefined;
  const channel = influencer?.channelName || influencer?.name;
  const start = () => influencer && search(influencer.id, product);

  if (entry?.phase === 'queued' || entry?.phase === 'searching') return <ReviewSearchingCard search={entry} channel={channel} />;
  if (entry?.phase === 'error') return <ReviewSearchError message={entry.message} onRetry={start} />;
  if (entry?.phase === 'done') {
    return <ReviewResultCard result={entry.result} at={entry.at} currentLink={currentLink} useLabel={useLabel} onUse={onUse} onRetry={start} />;
  }

  const blockedReason = configured === false
    ? 'AI search is not set up on the server (GEMINI_API_KEY).'
    : !canSearchReview(influencer) ? 'Add their YouTube link to search their channel.' : '';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={start} disabled={!!blockedReason || !product}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
        <Sparkles size={14} aria-hidden />Find review with AI
      </button>
      <span className="text-xs text-slate-500">
        {blockedReason || `Searches ${channel || 'their channel'} for a ${product || 'product'} video.`}
      </span>
    </div>
  );
};

/**
 * Compact AI status for a table row without a review link: a "Find" button, a spinner while
 * searching, then the outcome (which jumps to the full result in the AI review check panel).
 */
export const ReviewRowStatus: React.FC<{ influencer?: InfluencerRecord; product: string; campaignId: string }> = ({ influencer, product, campaignId }) => {
  const configured = useReviewSearchConfigured();
  const { searches, search } = useReviewSearchStore();
  if (!influencer || !canSearchReview(influencer) || configured === false) return <span className="text-slate-400">—</span>;
  const entry = searches[reviewKey(influencer.id, product)];
  const start = () => search(influencer.id, product);
  const jump = () => document.getElementById(`ai-review-${campaignId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  if (entry?.phase === 'queued' || entry?.phase === 'searching') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 whitespace-nowrap" role="status">
        <LoaderCircle size={13} className="animate-spin" aria-hidden />{entry.phase === 'queued' ? 'Queued' : 'Searching'}
      </span>
    );
  }
  if (entry?.phase === 'done') {
    return (
      <button type="button" onClick={jump} className="cursor-pointer" title="See the result">
        <ReviewStatusPill status={entry.result.status} />
      </button>
    );
  }
  if (entry?.phase === 'error') {
    return (
      <button type="button" onClick={start} className={`${pillBase} bg-red-50 text-red-700 border-red-200 cursor-pointer`} title={entry.message}>
        <RotateCw size={12} aria-hidden />Retry
      </button>
    );
  }
  return (
    <button type="button" onClick={start} title={`Search ${influencer.channelName || influencer.name} for a ${product} video`}
      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-md px-1.5 py-1 -mx-1.5 cursor-pointer whitespace-nowrap">
      <Sparkles size={13} aria-hidden />Find
    </button>
  );
};
