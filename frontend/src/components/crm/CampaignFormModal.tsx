import React, { useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import { useCrmStore } from '../../store/crmStore';
import type { CampaignRecord } from '../../types/crm';
import { ReviewSearch } from './ReviewFinder';
import { todayLabel } from '../../utils/campaign';

type Draft = Omit<CampaignRecord, 'id'> & { id?: string };

interface CampaignFormModalProps {
  /** Existing placement to edit, or a partial one (influencerId and/or product) to create. */
  campaign: Draft;
  onClose: () => void;
}

const TRACK_KEYS = ['orderMade', 'orderDate', 'received', 'receivedDate', 'reviewVideoLink', 'toBeReturned',
  'returnPickUpDate', 'pickedUp', 'returnReceived', 'returnReceivedDate', 'notes'] as const;

/** Yes / No (/ extra) buttons; keeps any other text from the sheet (e.g. "No, Yes") selectable. */
const Choice: React.FC<{ id: string; value?: string; options: string[]; onChange: (v: string) => void }> = ({ id, value = '', options, onChange }) => {
  const all = value && !options.includes(value) ? [...options, value] : options;
  return (
    <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 flex-wrap" role="radiogroup" aria-labelledby={id}>
      {all.map(opt => (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={value === opt}
          onClick={() => onChange(value === opt ? '' : opt)}
          className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
            value === opt ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
};

const DateField: React.FC<{ id: string; label: string; value?: string; onChange: (v: string) => void }> = ({ id, label, value = '', onChange }) => (
  <div>
    <label className="field-label" htmlFor={id}>{label}</label>
    <div className="flex gap-2">
      <input id={id} className="field-input" value={value} onChange={e => onChange(e.target.value)} placeholder="e.g. 6 May" />
      <button type="button" className="btn-secondary px-2.5! text-xs!" onClick={() => onChange(todayLabel())}>Today</button>
    </div>
  </div>
);

const Section: React.FC<{ step: number; title: string; hint: string; children: React.ReactNode }> = ({ step, title, hint, children }) => (
  <section className="flex gap-3">
    <div className="flex flex-col items-center">
      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{step}</span>
      <span className="w-px flex-1 bg-slate-200 mt-1" />
    </div>
    <div className="flex-1 pb-5 min-w-0">
      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      <p className="text-xs text-slate-500 mb-3">{hint}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  </section>
);

export const CampaignFormModal: React.FC<CampaignFormModalProps> = ({ campaign, onClose }) => {
  const { influencers, products, campaigns, saveCampaign, deleteCampaign } = useCrmStore();
  const [form, setForm] = useState<Draft>({ ...campaign });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isNew = !campaign.id;
  const pickInfluencer = !campaign.influencerId;
  const pickProduct = !campaign.product;
  const influencer = influencers.find(i => i.id === form.influencerId);

  // When creating, only offer pairs that don't already have a placement
  const takenProducts = useMemo(() => new Set(campaigns.filter(c => c.influencerId === form.influencerId).map(c => c.product)), [campaigns, form.influencerId]);
  const takenInfluencers = useMemo(() => new Set(campaigns.filter(c => c.product === form.product).map(c => c.influencerId)), [campaigns, form.product]);

  const update = (key: string) => (v: string) => setForm(f => ({ ...f, [key]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.influencerId || !form.product) {
      setError(pickInfluencer ? 'Choose an influencer.' : 'Choose a product.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form };
      TRACK_KEYS.forEach(k => { payload[k] = (payload[k] || '').trim(); });
      if (isNew && !payload.orderMade && payload.orderDate) payload.orderMade = 'Yes';
      await saveCampaign(payload);
      onClose();
    } catch (err) {
      console.error('Failed to save tracking:', err);
      setError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!campaign.id) return;
    setSaving(true);
    try {
      await deleteCampaign(campaign.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const title = isNew
    ? pickProduct ? `Add a product for ${influencer?.name ?? 'influencer'}` : `Add an influencer to ${form.product}`
    : `${influencer?.name ?? 'Influencer'} · ${form.product}`;

  return (
    <Modal
      title={title}
      subtitle="Fill in each step as it happens. Everything is optional except who and which product."
      onClose={onClose}
      size="lg"
      footer={
        confirmingDelete ? (
          <>
            <span className="text-sm text-slate-700 mr-auto self-center">Remove this product from {influencer?.name}? Its tracking is deleted.</span>
            <button type="button" className="btn-secondary" onClick={() => setConfirmingDelete(false)}>Keep</button>
            <button type="button" className="btn-danger" disabled={saving} onClick={handleDelete}>Remove</button>
          </>
        ) : (
          <>
            {!isNew && (
              <button type="button" className="btn-ghost-danger mr-auto" onClick={() => setConfirmingDelete(true)}>Remove placement</button>
            )}
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" form="campaign-form" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isNew ? 'Add' : 'Save changes'}
            </button>
          </>
        )
      }
    >
      <form id="campaign-form" onSubmit={handleSubmit} className="flex flex-col">
        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>}

        {(pickInfluencer || pickProduct) && (
          <div className="mb-5">
            {pickInfluencer ? (
              <>
                <label className="field-label" htmlFor="cmp-influencer">Influencer</label>
                <select id="cmp-influencer" className="field-input" value={form.influencerId} onChange={e => update('influencerId')(e.target.value)} autoFocus>
                  <option value="">Choose an influencer…</option>
                  {[...influencers].sort((a, b) => a.name.localeCompare(b.name)).filter(i => !takenInfluencers.has(i.id)).map(i => (
                    <option key={i.id} value={i.id}>{i.name}{i.channelName && i.channelName !== i.name ? ` — ${i.channelName}` : ''}</option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label className="field-label" htmlFor="cmp-product">Product</label>
                <select id="cmp-product" className="field-input" value={form.product} onChange={e => update('product')(e.target.value)} autoFocus>
                  <option value="">Choose a product…</option>
                  {products.filter(p => !takenProducts.has(p)).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </>
            )}
          </div>
        )}

        <Section step={1} title="Order" hint="Has the unit been ordered for them?">
          <div>
            <span className="field-label" id="cmp-order">Order made</span>
            <Choice id="cmp-order" value={form.orderMade} options={['Yes', 'No', 'PAUSED']} onChange={update('orderMade')} />
          </div>
          <DateField id="cmp-order-date" label="Order date" value={form.orderDate} onChange={update('orderDate')} />
        </Section>

        <Section step={2} title="Delivery" hint="Did the influencer receive it?">
          <div>
            <span className="field-label" id="cmp-received">Received</span>
            <Choice id="cmp-received" value={form.received} options={['Yes', 'No']} onChange={update('received')} />
          </div>
          <DateField id="cmp-received-date" label="Received date" value={form.receivedDate} onChange={update('receivedDate')} />
        </Section>

        <Section step={3} title="Review" hint="Paste the review video link once it's live, or let AI find it on their channel.">
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="cmp-video">Review video link</label>
            <input id="cmp-video" className="field-input" value={form.reviewVideoLink || ''} onChange={e => update('reviewVideoLink')(e.target.value)} placeholder="https://youtu.be/…" />
            <div className="mt-3">
              <ReviewSearch
                influencer={influencer}
                product={form.product}
                currentLink={form.reviewVideoLink}
                useLabel="Use this link"
                onUse={url => setForm(f => ({ ...f, reviewVideoLink: url, received: (f.received || '').toLowerCase().includes('yes') ? f.received : 'Yes' }))}
              />
            </div>
          </div>
        </Section>

        <Section step={4} title="Return" hint="Only for units that have to come back.">
          <div>
            <span className="field-label" id="cmp-return">To be returned</span>
            <Choice id="cmp-return" value={form.toBeReturned} options={['Yes', 'No']} onChange={update('toBeReturned')} />
          </div>
          <DateField id="cmp-pickup-date" label="Pick-up date" value={form.returnPickUpDate} onChange={update('returnPickUpDate')} />
          <div>
            <span className="field-label" id="cmp-picked">Picked up</span>
            <Choice id="cmp-picked" value={form.pickedUp} options={['Yes', 'No']} onChange={update('pickedUp')} />
          </div>
          <div>
            <span className="field-label" id="cmp-return-received">Return received</span>
            <Choice id="cmp-return-received" value={form.returnReceived} options={['Yes', 'No']} onChange={update('returnReceived')} />
          </div>
          <DateField id="cmp-return-date" label="Return received date" value={form.returnReceivedDate} onChange={update('returnReceivedDate')} />
        </Section>

        <div>
          <label className="field-label" htmlFor="cmp-notes">Notes</label>
          <textarea id="cmp-notes" rows={2} className="field-input resize-y" value={form.notes || ''} onChange={e => update('notes')(e.target.value)} placeholder="Anything worth remembering, e.g. replacement sent" />
        </div>
      </form>
    </Modal>
  );
};
