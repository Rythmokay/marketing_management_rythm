import { create } from 'zustand';
import { crmApi } from '../api/crmApi';
import { useEffect } from 'react';
import type { InfluencerRecord, ReviewCheckRequest, ReviewSearchResult } from '../types/crm';

/** One AI search for an influencer's review of a product. */
export type ReviewSearchEntry =
  | { phase: 'queued'; influencerId: string; product: string; at: number }
  | { phase: 'searching'; influencerId: string; product: string; at: number }
  | { phase: 'done'; influencerId: string; product: string; at: number; result: ReviewSearchResult }
  | { phase: 'error'; influencerId: string; product: string; at: number; message: string };

/** One run of the review checker page. */
export type ReviewCheck = { id: string; request: ReviewCheckRequest; at: number } & (
  | { phase: 'searching' }
  | { phase: 'done'; result: ReviewSearchResult }
  | { phase: 'error'; message: string });

/** Searches running at once: each takes 20–60 s and uses Gemini quota. */
const CONCURRENCY = 2;

export const reviewKey = (influencerId: string, product: string) => JSON.stringify([influencerId, product]);

interface ReviewSearchState {
  /** null until the server has been asked whether a Gemini key is set */
  configured: boolean | null;
  searches: Record<string, ReviewSearchEntry>;

  checkConfigured: () => Promise<void>;
  /** Searches one pair now (skipped if it is already running). */
  search: (influencerId: string, product: string) => void;
  /** Queues several pairs; they run a few at a time. */
  searchMany: (pairs: { influencerId: string; product: string }[]) => void;
  cancelQueued: () => void;

  /** Review checker runs, newest first */
  checks: ReviewCheck[];
  runCheck: (request: ReviewCheckRequest) => void;
  retryCheck: (id: string) => void;
  removeCheck: (id: string) => void;
  reset: () => void;
}

/**
 * Kept outside the pages so a bulk check keeps running (and its results stay)
 * while the person moves around the app.
 */
export const useReviewSearchStore = create<ReviewSearchState>((set, get) => {
  const put = (key: string, value: ReviewSearchEntry) => set(s => ({ searches: { ...s.searches, [key]: value } }));

  const run = async (key: string, influencerId: string, product: string) => {
    put(key, { phase: 'searching', influencerId, product, at: Date.now() });
    try {
      const result = await crmApi.findReview(influencerId, product);
      put(key, { phase: 'done', influencerId, product, at: Date.now(), result });
    } catch (err) {
      put(key, { phase: 'error', influencerId, product, at: Date.now(), message: errorMessage(err) });
    } finally {
      pump();
    }
  };

  const errorMessage = (err: unknown) =>
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'The search failed. Try again.';

  const putCheck = (id: string, change: Partial<ReviewCheck>) =>
    set(s => ({ checks: s.checks.map(c => (c.id === id ? ({ ...c, ...change } as ReviewCheck) : c)) }));

  const execCheck = async (id: string, request: ReviewCheckRequest) => {
    try {
      const result = await crmApi.checkReview(request);
      putCheck(id, { phase: 'done', result, at: Date.now() } as Partial<ReviewCheck>);
    } catch (err) {
      putCheck(id, { phase: 'error', message: errorMessage(err), at: Date.now() } as Partial<ReviewCheck>);
    }
  };

  const pump = () => {
    const all = Object.entries(get().searches);
    const free = CONCURRENCY - all.filter(([, s]) => s.phase === 'searching').length;
    all.filter(([, s]) => s.phase === 'queued')
      .sort((a, b) => a[1].at - b[1].at)
      .slice(0, Math.max(0, free))
      .forEach(([key, s]) => run(key, s.influencerId, s.product));
  };

  return {
    configured: null,
    searches: {},

    checkConfigured: async () => {
      try {
        const status = await crmApi.getFindReviewStatus();
        set({ configured: status.configured });
      } catch {
        set({ configured: false });
      }
    },

    search: (influencerId, product) => {
      const key = reviewKey(influencerId, product);
      if (get().searches[key]?.phase === 'searching') return;
      run(key, influencerId, product);
    },

    searchMany: (pairs) => {
      const now = Date.now();
      set(s => {
        const searches = { ...s.searches };
        pairs.forEach(({ influencerId, product }, i) => {
          const key = reviewKey(influencerId, product);
          if (searches[key]?.phase !== 'searching') searches[key] = { phase: 'queued', influencerId, product, at: now + i };
        });
        return { searches };
      });
      pump();
    },

    cancelQueued: () => set(s => ({
      searches: Object.fromEntries(Object.entries(s.searches).filter(([, v]) => v.phase !== 'queued')),
    })),

    checks: [],

    runCheck: (request) => {
      const id = `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      set(s => ({ checks: [{ id, request, at: Date.now(), phase: 'searching' }, ...s.checks] }));
      execCheck(id, request);
    },

    retryCheck: (id) => {
      const check = get().checks.find(c => c.id === id);
      if (!check || check.phase === 'searching') return;
      putCheck(id, { phase: 'searching', at: Date.now() } as Partial<ReviewCheck>);
      execCheck(id, check.request);
    },

    removeCheck: (id) => set(s => ({ checks: s.checks.filter(c => c.id !== id) })),

    reset: () => set({ searches: {}, checks: [], configured: null }),
  };
});

/** Asks the server once whether a Gemini key is set; null while unknown. */
export const useReviewSearchConfigured = () => {
  const configured = useReviewSearchStore(s => s.configured);
  const checkConfigured = useReviewSearchStore(s => s.checkConfigured);
  useEffect(() => { if (configured === null) checkConfigured(); }, [configured, checkConfigured]);
  return configured;
};

/** An influencer can be searched when we know their YouTube channel. */
export const canSearchReview = (inf?: InfluencerRecord) => !!inf && !!(inf.youtube || inf.channelName);
