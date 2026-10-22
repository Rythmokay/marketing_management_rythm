import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCrmStore } from '../store/crmStore';
import { PageHeader, EmptyState } from '../components/ui/PageHeader';
import { ConfirmDialog } from '../components/ui/Modal';
import { DealBadge, ReturnBadge, SocialLinks, StageBadge } from '../components/crm/Badges';
import { InfluencerFormModal } from '../components/crm/InfluencerFormModal';
import { CampaignFormModal } from '../components/crm/CampaignFormModal';
import { ReviewSearch } from '../components/crm/ReviewFinder';
import type { CampaignRecord } from '../types/crm';
import { getReturnState, getStage, isActive, toHref } from '../utils/campaign';

const Detail: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <dt className="text-xs font-semibold text-slate-500">{label}</dt>
    <dd className="text-sm text-slate-900 mt-0.5 break-words">{children || <span className="text-slate-400">Not added</span>}</dd>
  </div>
);

/** Order -> Received -> Review (-> Return) as ticked steps with their dates. */
export const PlacementSteps: React.FC<{ campaign: CampaignRecord }> = ({ campaign: c }) => {
  const stage = getStage(c);
  const returnState = getReturnState(c);
  const steps = [
    { label: 'Ordered', done: ['ordered', 'received', 'reviewed'].includes(stage), detail: c.orderDate },
    { label: 'Received', done: ['received', 'reviewed'].includes(stage), detail: c.receivedDate },
    { label: 'Review', done: stage === 'reviewed', detail: c.reviewVideoLink ? 'posted' : '' },
  ];
  if (returnState !== 'none') {
    const returnDetail = {
      returned: c.returnReceivedDate || 'done',
      picked_up: 'picked up',
      due: c.returnPickUpDate ? `pick-up ${c.returnPickUpDate}` : 'due',
    }[returnState];
    steps.push({ label: 'Returned', done: returnState === 'returned', detail: returnDetail });
  }
  return (
    <ol className="grid text-xs" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex flex-col items-center gap-1 px-1 min-w-0">
          {i < steps.length - 1 && (
            <span aria-hidden className={`absolute top-2.5 left-1/2 w-full h-px ${steps[i + 1].done ? 'bg-blue-600' : 'bg-slate-200'}`} />
          )}
          <span className={`relative w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${s.done ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border border-slate-300'}`}>
            {s.done ? '✓' : i + 1}
          </span>
          <span className={`font-semibold ${s.done ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</span>
          <span className="text-slate-500 text-center truncate max-w-full">{s.detail || '—'}</span>
        </li>
      ))}
    </ol>
  );
};

export const InfluencerDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { influencers, campaigns, deleteInfluencer, saveCampaign } = useCrmStore();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [campaignForm, setCampaignForm] = useState<(Omit<CampaignRecord, 'id'> & { id?: string }) | null>(null);

  const inf = influencers.find(i => i.id === id);
  if (!inf) {
    return (
      <div className="card">
        <EmptyState title="Influencer not found">
          They may have been deleted. <Link to="/influencers" className="text-blue-700 font-semibold">Back to all influencers</Link>
        </EmptyState>
      </div>
    );
  }

  const mine = campaigns
    .filter(c => c.influencerId === inf.id)
    .sort((a, b) => a.product.localeCompare(b.product));

  return (
    <>
      <PageHeader
        back={{ to: '/influencers', label: 'All influencers' }}
        title={inf.name}
        description={
          <span className="inline-flex items-center gap-2 flex-wrap">
            {inf.channelName && inf.channelName !== inf.name && <span>{inf.channelName}</span>}
            {inf.language && <span>· {inf.language}</span>}
            {inf.barterStatus && <DealBadge value={inf.barterStatus} />}
          </span>
        }
        actions={
          <>
            <button type="button" className="btn-ghost-danger" onClick={() => setConfirmDelete(true)}>Delete</button>
            <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>Edit details</button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6 items-start">
        <section className="card p-5" aria-labelledby="contact-heading">
          <h2 id="contact-heading" className="text-sm font-bold text-slate-900 mb-4">Contact & profiles</h2>
          <dl className="flex flex-col gap-4">
            <Detail label="Email">{inf.email && <a href={`mailto:${inf.email}`} className="text-blue-700 hover:underline">{inf.email}</a>}</Detail>
            <Detail label="Phone">
              {inf.phone && inf.phone.split(',').map(p => p.trim()).map(p => (
                <a key={p} href={`tel:${p}`} className="text-blue-700 hover:underline mr-3">{p}</a>
              ))}
            </Detail>
            <Detail label="Shipping address">{inf.address}</Detail>
            <div>
              <dt className="text-xs font-semibold text-slate-500 mb-1.5">Social profiles</dt>
              <dd><SocialLinks record={inf} size="md" /></dd>
            </div>
            {(inf.extraInfo || inf.extraLink) && (
              <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
                <Detail label="Sheet column C">{inf.extraInfo}</Detail>
                <Detail label="Other link">
                  {inf.extraLink && <a href={toHref(inf.extraLink)} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">Open link</a>}
                </Detail>
              </div>
            )}
          </dl>
        </section>

        <section aria-labelledby="products-heading">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 id="products-heading" className="text-sm font-bold text-slate-900">
              Products <span className="text-slate-500 font-semibold">({mine.length})</span>
            </h2>
            <button type="button" className="btn-primary" onClick={() => setCampaignForm({ influencerId: inf.id, product: '' })}>+ Add product</button>
          </div>

          {mine.length === 0 ? (
            <div className="card">
              <EmptyState title="No products sent yet">Use “Add product” when you order a unit for {inf.name}.</EmptyState>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {mine.map(c => (
                <li key={c.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/products/${encodeURIComponent(c.product)}`} className="font-bold text-slate-900 hover:text-blue-700">{c.product}</Link>
                      <StageBadge campaign={c} />
                      <ReturnBadge campaign={c} />
                    </div>
                    <div className="flex items-center gap-2">
                      {c.reviewVideoLink && (
                        <a href={toHref(c.reviewVideoLink)} target="_blank" rel="noopener noreferrer" className="btn-secondary py-1.5! text-xs!">▶ Watch review</a>
                      )}
                      <button type="button" className="btn-secondary py-1.5! text-xs!" onClick={() => setCampaignForm(c)}>Update</button>
                    </div>
                  </div>
                  <PlacementSteps campaign={c} />
                  {!c.reviewVideoLink && isActive(c) && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <ReviewSearch
                        influencer={inf}
                        product={c.product}
                        currentLink={c.reviewVideoLink}
                        useLabel="Save as review link"
                        onUse={async url => { await saveCampaign({ ...c, reviewVideoLink: url, received: (c.received || '').toLowerCase().includes('yes') ? c.received : 'Yes' }); }}
                      />
                    </div>
                  )}
                  {c.notes && <p className="mt-3 text-xs text-slate-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">Note: {c.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {editing && <InfluencerFormModal influencer={inf} onClose={() => setEditing(false)} />}
      {campaignForm && <CampaignFormModal campaign={campaignForm} onClose={() => setCampaignForm(null)} />}
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${inf.name}?`}
          message={<>This removes their details and the tracking for {mine.length} product{mine.length === 1 ? '' : 's'}. This can't be undone.</>}
          confirmLabel="Delete influencer"
          onConfirm={async () => { await deleteInfluencer(inf.id); navigate('/influencers'); }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
};
