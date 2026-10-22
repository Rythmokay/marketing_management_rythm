import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoaderCircle, Sparkles } from 'lucide-react';
import { canSearchReview, reviewKey, useReviewSearchConfigured, useReviewSearchStore } from '../../store/reviewSearchStore';
import type { CampaignRecord, InfluencerRecord, ReviewSearchResult } from '../../types/crm';
import { getStage } from '../../utils/campaign';
import { ReviewResultCard, ReviewSearchError, ReviewSearchingCard } from './ReviewFinder';

interface AiReviewCheckPanelProps {
  product: string;
  /** This product's placements */
  items: CampaignRecord[];
  byId: Record<string, InfluencerRecord>;
  onSaveLink: (campaign: CampaignRecord, url: string) => Promise<void>;
}

const ORDER: Record<ReviewSearchResult['status'] | 'error', number> = { FOUND: 0, NEEDS_REVIEW: 1, error: 2, NOT_FOUND: 3 };

/** Bulk check: searches every waiting influencer's channel for this product's review video. */
export const AiReviewCheckPanel: React.FC<AiReviewCheckPanelProps> = ({ product, items, byId, onSaveLink }) => {
  const configured = useReviewSearchConfigured();
  const { searches, search, searchMany, cancelQueued } = useReviewSearchStore();
  const [includeOrdered, setIncludeOrdered] = useState(false);
  const [savingAll, setSavingAll] = useState(false);

  const waiting = (stage: string) => items.filter(c => !c.reviewVideoLink && getStage(c) === stage && canSearchReview(byId[c.influencerId]));
  const awaitingReview = waiting('received');
  const awaitingDelivery = waiting('ordered');
  const candidates = includeOrdered ? [...awaitingReview, ...awaitingDelivery] : awaitingReview;

  // Every search for this product, whether started here or from a row / form
  const mine = useMemo(() => items
    .map(c => ({ campaign: c, entry: searches[reviewKey(c.influencerId, product)] }))
    .filter(x => x.entry), [items, searches, product]);
  const active = mine.filter(x => x.entry.phase === 'queued' || x.entry.phase === 'searching');
  const finished = mine
    .filter(x => x.entry.phase === 'done' || x.entry.phase === 'error')
    .sort((a, b) => {
      const rank = (e: typeof a.entry) => ORDER[e.phase === 'done' ? e.result.status : 'error'];
      return rank(a.entry) - rank(b.entry) || byId[a.campaign.influencerId].name.localeCompare(byId[b.campaign.influencerId].name);
    });
  const unsavedFound = finished.filter(x => x.entry.phase === 'done' && x.entry.result.status === 'FOUND'
    && x.entry.result.videoUrl && x.entry.result.videoUrl !== x.campaign.reviewVideoLink);
  const counts = {
    found: finished.filter(x => x.entry.phase === 'done' && x.entry.result.status === 'FOUND').length,
    check: finished.filter(x => x.entry.phase === 'done' && x.entry.result.status === 'NEEDS_REVIEW').length,
    none: finished.filter(x => x.entry.phase === 'done' && x.entry.result.status === 'NOT_FOUND').length,
  };
  const batchTotal = active.length + finished.length;

  const startCheck = () => searchMany(candidates.map(c => ({ influencerId: c.influencerId, product })));

  const saveAllFound = async () => {
    setSavingAll(true);
    try {
      for (const x of unsavedFound) {
        if (x.entry.phase === 'done' && x.entry.result.videoUrl) await onSaveLink(x.campaign, x.entry.result.videoUrl);
      }
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <section className="card mb-4 overflow-hidden" aria-labelledby="ai-check-heading">
      <div className="p-5 flex flex-col lg:flex-row lg:items-center gap-4 justify-between bg-gradient-to-r from-blue-50/70 to-white">
        <div className="flex gap-3 min-w-0">
          <span className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0" aria-hidden>
            <Sparkles size={18} />
          </span>
          <div className="min-w-0">
            <h2 id="ai-check-heading" className="text-sm font-bold text-slate-900">AI review check</h2>
            <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
              Gemini searches each influencer's YouTube channel for a {product} video, and YouTube confirms who uploaded it.
              Nothing is saved until you choose a video.
            </p>
            {configured === false && (
              <p className="text-xs text-red-700 mt-1.5 font-semibold">Not set up: add GEMINI_API_KEY to the server's environment and restart it.</p>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
          {awaitingDelivery.length > 0 && (
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
              <input type="checkbox" className="accent-blue-600 w-4 h-4" checked={includeOrdered} onChange={e => setIncludeOrdered(e.target.checked)} />
              Include awaiting delivery ({awaitingDelivery.length})
            </label>
          )}
          {active.length > 0 ? (
            <button type="button" className="btn-secondary" onClick={cancelQueued} disabled={!active.some(x => x.entry.phase === 'queued')}>
              Stop after current
            </button>
          ) : (
            <button type="button" className="btn-primary"
              onClick={startCheck} disabled={!configured || candidates.length === 0}>
              <Sparkles size={15} aria-hidden />
              {candidates.length === 0 ? 'No one waiting' : `Check ${candidates.length} channel${candidates.length === 1 ? '' : 's'}`}
            </button>
          )}
        </div>
      </div>

      {batchTotal > 0 && (
        <div className="border-t border-slate-200">
          <div className="px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs" aria-live="polite">
            {active.length > 0 && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-blue-800">
                <LoaderCircle size={14} className="animate-spin" aria-hidden />
                Checked {finished.length} of {batchTotal}
              </span>
            )}
            <span className="text-emerald-800 font-semibold">{counts.found} found</span>
            <span className="text-amber-800 font-semibold">{counts.check} to check</span>
            <span className="text-slate-600 font-semibold">{counts.none} not yet posted</span>
            {unsavedFound.length > 0 && (
              <button type="button" className="btn-primary py-1.5! text-xs! ml-auto" disabled={savingAll} onClick={saveAllFound}>
                {savingAll ? 'Saving…' : `Save ${unsavedFound.length} verified link${unsavedFound.length === 1 ? '' : 's'}`}
              </button>
            )}
          </div>
          {active.length > 0 && (
            <div className="h-1 bg-slate-100" aria-hidden>
              <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${(finished.length / batchTotal) * 100}%` }} />
            </div>
          )}

          <ul className="divide-y divide-slate-100">
            {[...active, ...finished].map(({ campaign: c, entry }) => {
              const inf = byId[c.influencerId];
              const retry = () => search(c.influencerId, product);
              return (
                <li key={c.id} id={`ai-review-${c.id}`} className="px-5 py-4 scroll-mt-4">
                  <div className="flex items-baseline gap-2 mb-2">
                    <Link to={`/influencers/${inf.id}`} className="text-sm font-semibold text-slate-900 hover:text-blue-700">{inf.name}</Link>
                    {inf.channelName && inf.channelName !== inf.name && <span className="text-xs text-slate-500">{inf.channelName}</span>}
                  </div>
                  {entry.phase === 'done' ? (
                    <ReviewResultCard result={entry.result} at={entry.at} currentLink={c.reviewVideoLink}
                      useLabel="Save as review link" onUse={url => onSaveLink(c, url)} onRetry={retry} />
                  ) : entry.phase === 'error' ? (
                    <ReviewSearchError message={entry.message} onRetry={retry} />
                  ) : (
                    <ReviewSearchingCard search={entry} channel={inf.channelName || inf.name} />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
};
