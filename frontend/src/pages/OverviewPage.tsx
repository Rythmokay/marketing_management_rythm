import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCrmStore } from '../store/crmStore';
import { PageHeader } from '../components/ui/PageHeader';
import { PipelineBar, PipelineLegend } from '../components/crm/PipelineBar';
import { OverviewInsights } from '../components/crm/OverviewInsights';
import { getReturnState, getStage, isActive } from '../utils/campaign';
import type { CampaignRecord } from '../types/crm';

const StatTile: React.FC<{ label: string; value: number; note: string }> = ({ label, value, note }) => (
  <div className="card p-5">
    <div className="text-xs font-semibold text-slate-500">{label}</div>
    <div className="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">{value}</div>
    <div className="text-xs text-slate-500 mt-1">{note}</div>
  </div>
);

export const OverviewPage: React.FC = () => {
  const { influencers, products, campaigns } = useCrmStore();
  const nameOf = useMemo(() => Object.fromEntries(influencers.map(i => [i.id, i.name])), [influencers]);

  const active = campaigns.filter(isActive);
  const awaitingDelivery = campaigns.filter(c => getStage(c) === 'ordered');
  const awaitingReview = campaigns.filter(c => getStage(c) === 'received');
  const reviewed = campaigns.filter(c => getStage(c) === 'reviewed');
  const returnsDue = campaigns.filter(c => getReturnState(c) === 'due');
  const withProducts = new Set(campaigns.map(c => c.influencerId));
  const withoutProducts = influencers.filter(i => !withProducts.has(i.id));

  const attention: { title: string; hint: string; items: CampaignRecord[]; detail: (c: CampaignRecord) => string }[] = [
    { title: 'Awaiting delivery', hint: 'Ordered but not received yet', items: awaitingDelivery, detail: c => c.orderDate ? `ordered ${c.orderDate}` : 'ordered' },
    { title: 'Awaiting review', hint: 'Received, no review video yet', items: awaitingReview, detail: c => c.receivedDate ? `received ${c.receivedDate}` : 'received' },
    { title: 'Returns due', hint: 'Units that have to come back', items: returnsDue, detail: c => c.returnPickUpDate ? `pick-up ${c.returnPickUpDate}` : 'not picked up yet' },
  ];

  const productRows = products
    .map(p => ({ name: p, items: campaigns.filter(c => c.product === p) }))
    .sort((a, b) => b.items.filter(isActive).length - a.items.filter(isActive).length || a.name.localeCompare(b.name));

  const maxActive = Math.max(1, ...productRows.map(r => r.items.filter(isActive).length));

  return (
    <>
      <PageHeader title="Overview" description="Where every product placement stands today." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile label="Influencers" value={influencers.length} note={`${withProducts.size} have products, ${withoutProducts.length} don't yet`} />
        <StatTile label="Products" value={products.length} note="in the catalog" />
        <StatTile label="Active placements" value={active.length} note="units ordered for influencers" />
        <StatTile label="Reviews posted" value={reviewed.length} note={`of ${active.length} placements`} />
      </div>

      <h2 className="text-base font-bold text-slate-900 mb-3">Needs attention</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {attention.map(group => (
          <div key={group.title} className="card flex flex-col">
            <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-baseline justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{group.title}</h3>
                <p className="text-xs text-slate-500">{group.hint}</p>
              </div>
              <span className="text-2xl font-extrabold text-slate-900 tabular-nums">{group.items.length}</span>
            </div>
            <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {group.items.length === 0 && <li className="px-5 py-4 text-sm text-slate-500">Nothing here — all clear.</li>}
              {group.items.map(c => (
                <li key={c.id}>
                  <Link to={`/influencers/${c.influencerId}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-slate-50">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900 truncate">{nameOf[c.influencerId] ?? 'Unknown'}</span>
                      <span className="block text-xs text-slate-500 truncate">{c.product}</span>
                    </span>
                    <span className="text-xs text-slate-500 whitespace-nowrap">{group.detail(c)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex items-end justify-between gap-4 flex-wrap mb-3">
        <h2 className="text-base font-bold text-slate-900">Products at a glance</h2>
        <PipelineLegend />
      </div>
      <div className="card overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-5 py-2.5 font-semibold">Product</th>
              <th className="px-5 py-2.5 font-semibold w-1/2 hidden sm:table-cell">Progress</th>
              <th className="px-3 py-2.5 font-semibold text-right">Placements</th>
              <th className="px-3 py-2.5 font-semibold text-right hidden md:table-cell">Reviews</th>
              <th className="px-5 py-2.5 font-semibold text-right hidden md:table-cell">Returns due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {productRows.map(row => (
              <tr key={row.name} className="hover:bg-slate-50">
                <td className="px-5 py-3">
                  <Link to={`/products/${encodeURIComponent(row.name)}`} className="font-semibold text-slate-900 hover:text-blue-700">{row.name}</Link>
                </td>
                <td className="px-5 py-3 hidden sm:table-cell"><PipelineBar campaigns={row.items} scaleMax={maxActive} /></td>
                <td className="px-3 py-3 text-right tabular-nums">{row.items.filter(isActive).length}</td>
                <td className="px-3 py-3 text-right tabular-nums hidden md:table-cell">{row.items.filter(c => getStage(c) === 'reviewed').length}</td>
                <td className="px-5 py-3 text-right tabular-nums hidden md:table-cell">{row.items.filter(c => getReturnState(c) === 'due').length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <OverviewInsights />

      {withoutProducts.length > 0 && (
        <>
          <h2 className="text-base font-bold text-slate-900 mb-1">Influencers without products</h2>
          <p className="text-xs text-slate-500 mb-3">In the directory, but no product has been sent to them yet.</p>
          <div className="flex flex-wrap gap-2">
            {withoutProducts.map(i => (
              <Link key={i.id} to={`/influencers/${i.id}`} className="card px-3 py-1.5 text-sm font-medium text-slate-800 hover:border-blue-300 hover:text-blue-700">
                {i.name}
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
};
