import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCrmStore } from '../store/crmStore';
import { PageHeader, EmptyState } from '../components/ui/PageHeader';
import { Modal } from '../components/ui/Modal';
import { PipelineBar, PipelineLegend } from '../components/crm/PipelineBar';
import { getReturnState, getStage, isActive } from '../utils/campaign';

const AddProductModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { products, addProduct } = useCrmStore();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (products.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
      setError('A product with this name already exists.');
      return;
    }
    setSaving(true);
    try {
      const created = await addProduct(trimmed);
      onClose();
      navigate(`/products/${encodeURIComponent(created)}`);
    } catch (err) {
      console.error('Failed to add product:', err);
      setError('Could not add the product. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Add product"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="product-form" className="btn-primary" disabled={saving || !name.trim()}>{saving ? 'Adding…' : 'Add product'}</button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="product-name">Product name</label>
        <input id="product-name" className="field-input" autoFocus value={name} onChange={e => { setName(e.target.value); setError(null); }} placeholder="e.g. Moondrop Pudding" />
        {error && <p className="text-xs text-red-700 mt-1.5">{error}</p>}
      </form>
    </Modal>
  );
};

export const ProductsPage: React.FC = () => {
  const { products, campaigns } = useCrmStore();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  const cards = products
    .filter(p => p.toLowerCase().includes(search.trim().toLowerCase()))
    .map(p => ({ name: p, items: campaigns.filter(c => c.product === p) }))
    .sort((a, b) => b.items.filter(isActive).length - a.items.filter(isActive).length || a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader
        title="Products"
        description="Every product in the catalog. Open one to see which influencers have it and where each unit stands."
        actions={<button type="button" className="btn-primary" onClick={() => setShowAdd(true)}>+ Add product</button>}
      />

      <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
        <div className="w-full sm:w-72">
          <label className="field-label" htmlFor="product-search">Search products</label>
          <input id="product-search" type="search" className="field-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Product name" />
        </div>
        <PipelineLegend />
      </div>

      {cards.length === 0 ? (
        <div className="card"><EmptyState title="No products match">Try a different name.</EmptyState></div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map(({ name, items }) => {
            const active = items.filter(isActive).length;
            const stat = (label: string, value: number) => (
              <div>
                <div className="text-lg font-bold text-slate-900 tabular-nums">{value}</div>
                <div className="text-[11px] text-slate-500 leading-tight">{label}</div>
              </div>
            );
            return (
              <li key={name}>
                <Link to={`/products/${encodeURIComponent(name)}`} className="card p-5 flex flex-col gap-4 h-full hover:border-blue-300 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-bold text-slate-900">{name}</h2>
                    <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                      {active} influencer{active === 1 ? '' : 's'}
                    </span>
                  </div>
                  {active > 0 ? <PipelineBar campaigns={items} /> : <p className="text-xs text-slate-400">Not sent to anyone yet</p>}
                  <div className="grid grid-cols-4 gap-2 border-t border-slate-100 pt-3 mt-auto">
                    {stat('awaiting delivery', items.filter(c => getStage(c) === 'ordered').length)}
                    {stat('awaiting review', items.filter(c => getStage(c) === 'received').length)}
                    {stat('reviews posted', items.filter(c => getStage(c) === 'reviewed').length)}
                    {stat('returns due', items.filter(c => getReturnState(c) === 'due').length)}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {showAdd && <AddProductModal onClose={() => setShowAdd(false)} />}
    </>
  );
};
