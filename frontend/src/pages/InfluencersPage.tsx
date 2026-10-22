import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCrmStore } from '../store/crmStore';
import { PageHeader, EmptyState } from '../components/ui/PageHeader';
import { DealBadge, SocialLinks } from '../components/crm/Badges';
import { InfluencerFormModal } from '../components/crm/InfluencerFormModal';
import { ExcelUploadModal } from '../components/crm/ExcelUploadModal';
import { DEFAULT_COLUMNS } from '../types/crm';
import type { CampaignRecord, InfluencerRecord } from '../types/crm';
import { exportToExcel } from '../utils/excelUtils';
import { isActive } from '../utils/campaign';

const ALL = '';
const NO_PRODUCTS = '__none__';

export const InfluencersPage: React.FC = () => {
  const { influencers, products, campaigns, importRecords } = useCrmStore();
  const navigate = useNavigate();
  // Filters live in the URL so Back returns to the same filtered list
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const language = params.get('language') ?? ALL;
  const deal = params.get('deal') ?? ALL;
  const product = params.get('product') ?? ALL;
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const byInfluencer = useMemo(() => {
    const map: Record<string, CampaignRecord[]> = {};
    campaigns.forEach(c => { (map[c.influencerId] ||= []).push(c); });
    return map;
  }, [campaigns]);

  const languages = useMemo(() => [...new Set(influencers.map(i => i.language).filter(Boolean))].sort(), [influencers]);
  const deals = useMemo(() => [...new Set(influencers.map(i => i.barterStatus).filter(Boolean))].sort(), [influencers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return influencers
      .filter(inf => {
        const mine = byInfluencer[inf.id] || [];
        if (q && ![inf.name, inf.channelName, inf.email, inf.phone, inf.address].some(v => (v || '').toLowerCase().includes(q))) return false;
        if (language && inf.language !== language) return false;
        if (deal && inf.barterStatus !== deal) return false;
        if (product === NO_PRODUCTS && mine.length > 0) return false;
        if (product && product !== NO_PRODUCTS && !mine.some(c => c.product === product)) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [influencers, byInfluencer, search, language, deal, product]);

  const hasFilters = Boolean(search || language || deal || product);

  // Flat export: one row per influencer per product (+ influencers with none), same layout the importer reads
  const handleExport = () => {
    const rows = filtered.flatMap(inf => {
      const mine = byInfluencer[inf.id] || [];
      return mine.length ? mine.map(c => ({ ...inf, ...c, id: inf.id })) : [{ ...inf, product: '' }];
    });
    exportToExcel(rows, DEFAULT_COLUMNS, 'Influencers.xlsx');
  };

  const handleImport = async (records: InfluencerRecord[], _cols: unknown, mode: 'replace' | 'append') => {
    try {
      await importRecords(records, mode);
    } catch (err) {
      console.error('Failed to import records to backend database:', err);
    }
  };

  const productChips = (inf: InfluencerRecord) => {
    const mine = byInfluencer[inf.id] || [];
    if (mine.length === 0) return <span className="text-xs text-slate-400">No products yet</span>;
    const shown = mine.slice(0, 2);
    return (
      <div className="flex flex-wrap gap-1">
        {shown.map(c => (
          <span key={c.id} className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${isActive(c) ? 'bg-blue-50 text-blue-800 border-blue-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
            {c.product}
          </span>
        ))}
        {mine.length > shown.length && <span className="px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">+{mine.length - shown.length} more</span>}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Influencers"
        description="Everyone you work with. Click a person to see their contact details and every product sent to them."
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowImport(true)}>Import</button>
            <button type="button" className="btn-secondary" onClick={handleExport} disabled={filtered.length === 0}>Export</button>
            <button type="button" className="btn-primary" onClick={() => setShowAdd(true)}>+ Add influencer</button>
          </>
        }
      />

      <div className="card p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-3">
        <div>
          <label className="field-label" htmlFor="inf-search">Search</label>
          <input id="inf-search" type="search" className="field-input" placeholder="Name, channel, email or phone" value={search} onChange={e => setParam('q', e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="inf-language">Language</label>
          <select id="inf-language" className="field-input" value={language} onChange={e => setParam('language', e.target.value)}>
            <option value={ALL}>All languages</option>
            {languages.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="inf-deal">Deal type</label>
          <select id="inf-deal" className="field-input" value={deal} onChange={e => setParam('deal', e.target.value)}>
            <option value={ALL}>All deal types</option>
            {deals.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="inf-product">Product</label>
          <select id="inf-product" className="field-input" value={product} onChange={e => setParam('product', e.target.value)}>
            <option value={ALL}>Any product</option>
            {products.map(p => <option key={p} value={p}>Has {p}</option>)}
            <option value={NO_PRODUCTS}>No products yet</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mb-3 text-sm text-slate-600">
        <span>Showing <strong className="text-slate-900">{filtered.length}</strong> of {influencers.length} influencers</span>
        {hasFilters && (
          <button type="button" className="text-sm font-semibold text-blue-700 hover:underline cursor-pointer" onClick={() => setParams({}, { replace: true })}>
            Clear filters
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState title="No influencers match">Try a different search or clear the filters.</EmptyState>
        ) : (
          <>
            {/* Desktop table */}
            <table className="w-full text-sm hidden md:table">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Influencer</th>
                  <th className="px-3 py-2.5 font-semibold">Language</th>
                  <th className="px-3 py-2.5 font-semibold">Deal type</th>
                  <th className="px-3 py-2.5 font-semibold">Products</th>
                  <th className="px-3 py-2.5 font-semibold hidden lg:table-cell">Contact</th>
                  <th className="px-5 py-2.5 font-semibold">Social</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(inf => (
                  <tr key={inf.id} className="hover:bg-blue-50/40 cursor-pointer" onClick={() => navigate(`/influencers/${inf.id}`)}>
                    <td className="px-5 py-3">
                      <Link to={`/influencers/${inf.id}`} className="font-semibold text-slate-900 hover:text-blue-700" onClick={e => e.stopPropagation()}>{inf.name}</Link>
                      {inf.channelName && inf.channelName !== inf.name && <div className="text-xs text-slate-500">{inf.channelName}</div>}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{inf.language || <span className="text-slate-400 text-xs">—</span>}</td>
                    <td className="px-3 py-3"><DealBadge value={inf.barterStatus} /></td>
                    <td className="px-3 py-3 max-w-64">{productChips(inf)}</td>
                    <td className="px-3 py-3 text-xs text-slate-600 hidden lg:table-cell">
                      <div className="truncate max-w-52">{inf.email || '—'}</div>
                      <div>{inf.phone}</div>
                    </td>
                    <td className="px-5 py-3"><SocialLinks record={inf} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {filtered.map(inf => (
                <li key={inf.id}>
                  <Link to={`/influencers/${inf.id}`} className="block px-4 py-3.5 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900">{inf.name}</div>
                        <div className="text-xs text-slate-500">{[inf.channelName !== inf.name && inf.channelName, inf.language].filter(Boolean).join(' · ')}</div>
                      </div>
                      <DealBadge value={inf.barterStatus} />
                    </div>
                    <div className="mt-2">{productChips(inf)}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {showAdd && <InfluencerFormModal onClose={() => setShowAdd(false)} onSaved={saved => navigate(`/influencers/${saved.id}`)} />}
      <ExcelUploadModal isOpen={showImport} onClose={() => setShowImport(false)} onImport={handleImport} />
    </>
  );
};
