import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ScanSearch, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { PlatformIcon } from '../components/ui/SocialIcons';
import { ReviewResultCard, ReviewSearchError, ReviewSearchingCard } from '../components/crm/ReviewFinder';
import { useCrmStore } from '../store/crmStore';
import { useReviewSearchConfigured, useReviewSearchStore, type ReviewCheck } from '../store/reviewSearchStore';
import type { CampaignRecord, InfluencerRecord, ReviewCheckRequest } from '../types/crm';
import { channelKey, channelLabel, channelUrl } from '../utils/youtube';

const EMPTY: ReviewCheckRequest = { channel: '', product: '', productDetails: '', postedAfter: '' };

/** The tracked influencer (and their tracking row for the product) that a checked channel belongs to, if any. */
const useTrackingMatch = (request: ReviewCheckRequest) => {
  const { influencers, campaigns } = useCrmStore();
  return useMemo(() => {
    const key = channelKey(channelUrl(request.channel));
    const influencer: InfluencerRecord | undefined = key ? influencers.find(i => channelKey(i.youtube) === key) : undefined;
    const product = request.product.trim().toLowerCase();
    const campaign: CampaignRecord | undefined = influencer
      ? campaigns.find(c => c.influencerId === influencer.id && c.product.trim().toLowerCase() === product)
      : undefined;
    return { influencer, campaign };
  }, [request.channel, request.product, influencers, campaigns]);
};

const CheckCard: React.FC<{ check: ReviewCheck }> = ({ check }) => {
  const { retryCheck, removeCheck } = useReviewSearchStore();
  const { saveCampaign } = useCrmStore();
  const { influencer, campaign } = useTrackingMatch(check.request);
  const label = check.request.channelName || channelLabel(check.request.channel);

  const saveToTracking = campaign
    ? async (url: string) => {
        await saveCampaign({ ...campaign, reviewVideoLink: url, received: (campaign.received || '').toLowerCase().includes('yes') ? campaign.received : 'Yes' });
      }
    : undefined;

  return (
    <li className="card p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900 truncate">
            {check.request.product}
            <span className="font-normal text-slate-500"> on </span>
            <a href={channelUrl(check.request.channel)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 align-middle text-blue-700 hover:underline">
              <PlatformIcon platform="youtube" size={13} />{label}
            </a>
          </div>
          <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-2">
            {check.request.productDetails && <span className="truncate max-w-80">{check.request.productDetails}</span>}
            {check.request.postedAfter && <span>Posted after {check.request.postedAfter}</span>}
            {influencer && (
              <span>
                Tracked: <Link to={`/influencers/${influencer.id}`} className="font-semibold text-slate-700 hover:text-blue-700">{influencer.name}</Link>
                {!campaign && ` (no ${check.request.product} tracking)`}
              </span>
            )}
          </div>
        </div>
        <button type="button" onClick={() => removeCheck(check.id)} aria-label="Remove this check"
          className="text-slate-400 hover:text-slate-900 cursor-pointer p-1 -m-1 shrink-0">
          <X size={16} aria-hidden />
        </button>
      </div>
      {check.phase === 'searching' ? (
        <ReviewSearchingCard search={{ phase: 'searching', at: check.at }} channel={label} />
      ) : check.phase === 'error' ? (
        <ReviewSearchError message={check.message} onRetry={() => retryCheck(check.id)} />
      ) : (
        <ReviewResultCard result={check.result} at={check.at} currentLink={campaign?.reviewVideoLink}
          useLabel={`Save to ${influencer?.name ?? 'tracking'}`} onUse={saveToTracking} onRetry={() => retryCheck(check.id)} />
      )}
    </li>
  );
};

const HowItWorks: React.FC = () => (
  <div className="card p-6">
    <h2 className="text-sm font-bold text-slate-900">How the check works</h2>
    <ol className="mt-4 flex flex-col gap-4">
      {[
        { Icon: Search, title: 'Gemini searches Google', text: 'It looks for the product together with the channel name or handle, including shortened names and the brand.' },
        { Icon: ShieldCheck, title: 'YouTube confirms the video', text: 'A suggested video is kept only if it exists and was uploaded by that channel; anything else is flagged or dropped.' },
        { Icon: Sparkles, title: 'You decide', text: 'If the channel is a tracked influencer with this product, you can save the link to their tracking in one click.' },
      ].map(({ Icon, title, text }, i) => (
        <li key={title} className="flex gap-3">
          <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center shrink-0" aria-hidden>
            <Icon size={16} />
          </span>
          <div>
            <div className="text-sm font-semibold text-slate-900">{i + 1}. {title}</div>
            <p className="text-xs text-slate-600 mt-0.5">{text}</p>
          </div>
        </li>
      ))}
    </ol>
    <p className="text-xs text-slate-500 mt-5 border-t border-slate-100 pt-4">
      A check usually takes 20–60 seconds, sometimes up to 2 minutes. Videos posted in the last day or two may not be searchable yet.
    </p>
  </div>
);

export const ReviewCheckerPage: React.FC = () => {
  const configured = useReviewSearchConfigured();
  const { influencers, products } = useCrmStore();
  const { checks, runCheck } = useReviewSearchStore();
  const [form, setForm] = useState<ReviewCheckRequest>(EMPTY);
  const [pickedId, setPickedId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { influencer: matched, campaign: matchedCampaign } = useTrackingMatch(form);

  const set = (key: keyof ReviewCheckRequest) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const withYoutube = useMemo(
    () => [...influencers].filter(i => i.youtube).sort((a, b) => a.name.localeCompare(b.name)),
    [influencers]
  );

  const pickInfluencer = (id: string) => {
    setPickedId(id);
    const inf = influencers.find(i => i.id === id);
    if (inf?.youtube) setForm(f => ({ ...f, channel: inf.youtube || '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.channel.trim()) return setError('Enter the YouTube channel handle or link.');
    if (!form.product.trim()) return setError('Enter the product name.');
    setError(null);
    runCheck({
      channel: form.channel.trim(),
      channelName: matched?.channelName || undefined,
      language: matched?.language || undefined,
      product: form.product.trim(),
      productDetails: form.productDetails?.trim() || undefined,
      postedAfter: form.postedAfter || undefined,
    });
  };

  const resolved = form.channel.trim() ? channelUrl(form.channel) : '';

  return (
    <>
      <PageHeader
        title="Review checker"
        description="Check whether a YouTube channel has uploaded a review of a product, using AI search verified on YouTube."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] gap-6 items-start">
        <form onSubmit={handleSubmit} className="card p-5 flex flex-col gap-4 lg:sticky lg:top-4" aria-labelledby="checker-form-heading">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center" aria-hidden><ScanSearch size={16} /></span>
            <h2 id="checker-form-heading" className="text-sm font-bold text-slate-900">What to check</h2>
          </div>

          {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">{error}</p>}
          {configured === false && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              AI search isn't set up. Add GEMINI_API_KEY to the server's environment and restart it.
            </p>
          )}

          <div>
            <label className="field-label inline-flex! items-center gap-1.5" htmlFor="chk-channel"><PlatformIcon platform="youtube" />YouTube channel</label>
            <input id="chk-channel" className="field-input" value={form.channel} onChange={e => { set('channel')(e); setPickedId(''); }}
              placeholder="@handle or youtube.com/@handle" autoComplete="off" autoFocus />
            {resolved ? (
              <div className="text-xs mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <a href={resolved} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:underline break-all">
                  <PlatformIcon platform="youtube" size={12} />
                  {resolved.replace(/^https?:\/\/(www\.)?/, '')}<ExternalLink size={11} aria-hidden />
                </a>
                {matched && <span className="text-emerald-700 font-semibold">· {matched.name}</span>}
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-1.5">Paste a handle or channel link, or pick a tracked influencer below.</p>
            )}
          </div>

          {withYoutube.length > 0 && (
            <div>
              <label className="field-label" htmlFor="chk-influencer">Or pick an influencer</label>
              <select id="chk-influencer" className="field-input" value={pickedId} onChange={e => pickInfluencer(e.target.value)}>
                <option value="">Choose…</option>
                {withYoutube.map(i => (
                  <option key={i.id} value={i.id}>{i.name}{i.channelName && i.channelName !== i.name ? ` — ${i.channelName}` : ''}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="field-label" htmlFor="chk-product">Product</label>
            <input id="chk-product" className="field-input" value={form.product} onChange={set('product')} list="chk-products"
              placeholder="e.g. Twistura Delta" autoComplete="off" />
            <datalist id="chk-products">{products.map(p => <option key={p} value={p} />)}</datalist>
          </div>

          <div>
            <label className="field-label" htmlFor="chk-details">Product details <span className="font-normal text-slate-400">(optional)</span></label>
            <textarea id="chk-details" rows={2} className="field-input resize-y" value={form.productDetails} onChange={set('productDetails')}
              placeholder="Brand, model, type or other names, e.g. “Twistura in-ear monitor (IEM), also called Delta”" />
          </div>

          <div>
            <label className="field-label" htmlFor="chk-after">Posted after <span className="font-normal text-slate-400">(optional)</span></label>
            <input id="chk-after" type="date" className="field-input" value={form.postedAfter} onChange={set('postedAfter')} />
            <p className="text-xs text-slate-500 mt-1">Usually the date the product was sent.</p>
          </div>

          {matched && form.product.trim() && (
            <p className={`text-xs rounded-lg px-3 py-2 border ${matchedCampaign ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
              {matchedCampaign
                ? matchedCampaign.reviewVideoLink
                  ? <>{matched.name} already has a review link saved for {matchedCampaign.product}. A check can confirm or replace it.</>
                  : <>{matched.name} is tracked for {matchedCampaign.product}: a found video can be saved to their tracking.</>
                : <>{matched.name} has no tracking for “{form.product.trim()}”, so a result can't be saved, only viewed.</>}
            </p>
          )}

          <button type="submit" className="btn-primary w-full py-2.5!" disabled={configured === false}>
            <Sparkles size={15} aria-hidden />Check for review video
          </button>
        </form>

        <section aria-labelledby="checks-heading" aria-live="polite">
          {checks.length === 0 ? (
            <HowItWorks />
          ) : (
            <>
              <h2 id="checks-heading" className="text-sm font-bold text-slate-900 mb-3">
                Checks <span className="text-slate-500 font-semibold">({checks.length})</span>
              </h2>
              <ul className="flex flex-col gap-3">
                {checks.map(c => <CheckCard key={c.id} check={c} />)}
              </ul>
            </>
          )}
        </section>
      </div>
    </>
  );
};
