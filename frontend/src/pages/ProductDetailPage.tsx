import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCrmStore } from '../store/crmStore';
import { PageHeader, EmptyState } from '../components/ui/PageHeader';
import { ConfirmDialog } from '../components/ui/Modal';
import { ReturnBadge, StageBadge } from '../components/crm/Badges';
import { PipelineBar } from '../components/crm/PipelineBar';
import { CampaignFormModal } from '../components/crm/CampaignFormModal';
import { AiReviewCheckPanel } from '../components/crm/AiReviewCheckPanel';
import { ReviewRowStatus } from '../components/crm/ReviewFinder';
import { CAMPAIGN_COLUMNS, INFLUENCER_COLUMNS } from '../types/crm';
import type { CampaignRecord, DynamicColumn } from '../types/crm';
import { exportToExcel } from '../utils/excelUtils';
import { getReturnState, getStage, isActive, toHref, type Stage } from '../utils/campaign';

type StageFilter = 'all' | Stage | 'return_due' | 'inactive';

export const ProductDetailPage: React.FC = () => {
  const { name = '' } = useParams();
  const product = name; // React Router already decodes params
  const navigate = useNavigate();
  const { products, influencers, campaigns, deleteProduct, saveCampaign } = useCrmStore();
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [influencerId, setInfluencerId] = useState('');
  const [campaignForm, setCampaignForm] = useState<(Omit<CampaignRecord, 'id'> & { id?: string }) | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const byId = useMemo(() => Object.fromEntries(influencers.map(i => [i.id, i])), [influencers]);
  const items = useMemo(
    () => campaigns
      .filter(c => c.product === product && byId[c.influencerId])
      .sort((a, b) => byId[a.influencerId].name.localeCompare(byId[b.influencerId].name)),
    [campaigns, product, byId]
  );

  if (!products.includes(product)) {
    return (
      <div className="card">
        <EmptyState title="Product not found">
          It may have been deleted. <Link to="/products" className="text-blue-700 font-semibold">Back to all products</Link>
        </EmptyState>
      </div>
    );
  }

  const matchesStage = (c: CampaignRecord, f: StageFilter) =>
    f === 'all' ? true
      : f === 'return_due' ? getReturnState(c) === 'due'
        : f === 'inactive' ? ['not_ordered', 'paused'].includes(getStage(c))
          : getStage(c) === f;

  const filters: { key: StageFilter; label: string }[] = [
    { key: 'all', label: 'Everyone' },
    { key: 'ordered', label: 'Awaiting delivery' },
    { key: 'received', label: 'Awaiting review' },
    { key: 'reviewed', label: 'Review posted' },
    { key: 'return_due', label: 'Return due' },
    { key: 'inactive', label: 'Paused / not ordered' },
  ];
  const visibleFilters = filters.filter(f => f.key === 'all' || items.some(c => matchesStage(c, f.key)));
  const rows = items.filter(c => matchesStage(c, stageFilter) && (!influencerId || c.influencerId === influencerId));

  // A posted review means the unit arrived, so saving the link also marks it received
  const saveReviewLink = async (c: CampaignRecord, url: string) => {
    await saveCampaign({ ...c, reviewVideoLink: url, received: (c.received || '').toLowerCase().includes('yes') ? c.received : 'Yes' });
  };

  const handleExport = () => {
    const cols: DynamicColumn[] = [...INFLUENCER_COLUMNS.slice(0, 2), { key: 'product', label: 'Product', type: 'text' }, ...CAMPAIGN_COLUMNS, ...INFLUENCER_COLUMNS.slice(2)];
    exportToExcel(rows.map(c => ({ ...byId[c.influencerId], ...c })), cols, `${product.replace(/[^\w-]+/g, '_')}.xlsx`);
  };

  return (
    <>
      <PageHeader
        back={{ to: '/products', label: 'All products' }}
        title={product}
        description={(() => {
          const using = items.filter(isActive).length;
          const other = items.length - using;
          return `${using} influencer${using === 1 ? '' : 's'} using it${other ? ` · ${other} paused or not ordered yet` : ''}`;
        })()}
        actions={
          <>
            <button type="button" className="btn-ghost-danger" onClick={() => setConfirmDelete(true)}>Delete product</button>
            <button type="button" className="btn-secondary" onClick={handleExport} disabled={rows.length === 0}>Export</button>
            <button type="button" className="btn-primary" onClick={() => setCampaignForm({ influencerId: '', product })}>+ Add influencer</button>
          </>
        }
      />

      {items.length > 0 && (
        <div className="card p-5 mb-4">
          <PipelineBar campaigns={items} showLegend />
        </div>
      )}

      {items.length > 0 && <AiReviewCheckPanel product={product} items={items} byId={byId} onSaveLink={saveReviewLink} />}

      <div className="card p-4 mb-4 flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="field-label" htmlFor="product-influencer">Find an influencer using {product}</label>
            <select id="product-influencer" className="field-input" value={influencerId} onChange={e => setInfluencerId(e.target.value)}>
              <option value="">All influencers ({items.length})</option>
              {items.map(c => (
                <option key={c.influencerId} value={c.influencerId}>
                  {byId[c.influencerId].name}{byId[c.influencerId].channelName !== byId[c.influencerId].name ? ` — ${byId[c.influencerId].channelName}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        {visibleFilters.length > 1 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by stage">
            {visibleFilters.map(f => {
              const count = items.filter(c => matchesStage(c, f.key)).length;
              const on = stageFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setStageFilter(f.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                    on ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {f.label} <span className={on ? 'text-slate-300' : 'text-slate-400'}>{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        {items.length === 0 ? (
          <EmptyState title={`${product} hasn't been sent to anyone yet`}>Use “Add influencer” when you order a unit for someone.</EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState title="No influencers match">Pick another stage or influencer.</EmptyState>
        ) : (
          <>
            <table className="w-full text-sm hidden md:table">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Influencer</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Ordered</th>
                  <th className="px-3 py-2.5 font-semibold">Received</th>
                  <th className="px-3 py-2.5 font-semibold">Review</th>
                  <th className="px-3 py-2.5 font-semibold hidden lg:table-cell">Phone</th>
                  <th className="px-5 py-2.5 font-semibold text-right"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(c => {
                  const inf = byId[c.influencerId];
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 align-top">
                      <td className="px-5 py-3">
                        <Link to={`/influencers/${inf.id}`} className="font-semibold text-slate-900 hover:text-blue-700">{inf.name}</Link>
                        {inf.channelName && inf.channelName !== inf.name && <div className="text-xs text-slate-500">{inf.channelName}</div>}
                        {c.notes && <div className="text-xs text-amber-800 mt-1 max-w-64">Note: {c.notes}</div>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col items-start gap-1"><StageBadge campaign={c} /><ReturnBadge campaign={c} /></div>
                      </td>
                      <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{c.orderDate || '—'}</td>
                      <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{c.receivedDate || '—'}</td>
                      <td className="px-3 py-3">
                        {c.reviewVideoLink
                          ? <a href={toHref(c.reviewVideoLink)} target="_blank" rel="noopener noreferrer" className="text-blue-700 font-semibold hover:underline whitespace-nowrap">▶ Watch</a>
                          : isActive(c) ? <ReviewRowStatus influencer={inf} product={product} campaignId={c.id} /> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-3 text-slate-700 hidden lg:table-cell whitespace-nowrap">{inf.phone || '—'}</td>
                      <td className="px-5 py-3 text-right">
                        <button type="button" className="btn-secondary py-1.5! text-xs!" onClick={() => setCampaignForm(c)}>Update</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <ul className="divide-y divide-slate-100 md:hidden">
              {rows.map(c => {
                const inf = byId[c.influencerId];
                return (
                  <li key={c.id} className="px-4 py-3.5 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <Link to={`/influencers/${inf.id}`} className="min-w-0">
                        <div className="font-semibold text-slate-900">{inf.name}</div>
                        {inf.channelName !== inf.name && <div className="text-xs text-slate-500">{inf.channelName}</div>}
                      </Link>
                      <button type="button" className="btn-secondary py-1! px-2.5! text-xs!" onClick={() => setCampaignForm(c)}>Update</button>
                    </div>
                    <div className="flex flex-wrap gap-1"><StageBadge campaign={c} /><ReturnBadge campaign={c} /></div>
                    <div className="text-xs text-slate-600">
                      Ordered {c.orderDate || '—'} · Received {c.receivedDate || '—'}
                      {c.reviewVideoLink && <> · <a href={toHref(c.reviewVideoLink)} target="_blank" rel="noopener noreferrer" className="text-blue-700 font-semibold">Watch review</a></>}
                    </div>
                    {!c.reviewVideoLink && isActive(c) && <div><ReviewRowStatus influencer={inf} product={product} campaignId={c.id} /></div>}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {campaignForm && <CampaignFormModal campaign={campaignForm} onClose={() => setCampaignForm(null)} />}
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${product}?`}
          message={<>This removes the product and its tracking for {items.length} influencer{items.length === 1 ? '' : 's'}. Their contact details stay. This can't be undone.</>}
          confirmLabel="Delete product"
          onConfirm={async () => { await deleteProduct(product); navigate('/products'); }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
};
