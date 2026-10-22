import React, { useState } from 'react';
import { PlatformIcon } from '../ui/SocialIcons';
import { Modal } from '../ui/Modal';
import { useCrmStore } from '../../store/crmStore';
import type { InfluencerRecord } from '../../types/crm';

const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Malayalam', 'Kannada', 'Marathi'];
const DEAL_TYPES = ['Barter', 'Returnable', 'Both', 'Mostly Barter', 'Mostly Returnable', 'Both equally'];

const EMPTY: InfluencerRecord = {
  id: '', name: '', channelName: '', language: '', barterStatus: '', email: '', phone: '', address: '',
  instagram: '', youtube: '', twitter: '', extraInfo: '', extraLink: ''
};

interface InfluencerFormModalProps {
  influencer?: InfluencerRecord;
  onClose: () => void;
  onSaved?: (saved: InfluencerRecord) => void;
}

export const InfluencerFormModal: React.FC<InfluencerFormModalProps> = ({ influencer, onClose, onSaved }) => {
  const saveInfluencer = useCrmStore(s => s.saveInfluencer);
  const [form, setForm] = useState<InfluencerRecord>({ ...EMPTY, ...influencer });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isNew = !influencer;

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() && !form.channelName.trim()) {
      setError('Enter a name or a channel name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const trimmed = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])) as InfluencerRecord;
      const saved = await saveInfluencer({ ...trimmed, name: trimmed.name || trimmed.channelName });
      onSaved?.(saved);
      onClose();
    } catch (err) {
      console.error('Failed to save influencer:', err);
      setError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Keep values from the sheet that aren't in the standard lists selectable
  const withCurrent = (options: string[], current?: string) => (current && !options.includes(current) ? [current, ...options] : options);

  return (
    <Modal
      title={isNew ? 'Add influencer' : `Edit ${influencer?.name}`}
      subtitle={isNew ? 'Only a name or channel is required — fill in the rest whenever you have it.' : undefined}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="influencer-form" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Add influencer' : 'Save changes'}
          </button>
        </>
      }
    >
      <form id="influencer-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Basics</legend>
          <div>
            <label className="field-label" htmlFor="inf-name">Name</label>
            <input id="inf-name" className="field-input" value={form.name} onChange={set('name')} placeholder="e.g. Rajit Shankar Ghosh" autoFocus />
          </div>
          <div>
            <label className="field-label" htmlFor="inf-channel">Channel name</label>
            <input id="inf-channel" className="field-input" value={form.channelName} onChange={set('channelName')} placeholder="e.g. Purecast 9" />
          </div>
          <div>
            <label className="field-label" htmlFor="inf-lang">Language</label>
            <select id="inf-lang" className="field-input" value={form.language} onChange={set('language')}>
              <option value="">Not set</option>
              {withCurrent(LANGUAGES, influencer?.language).map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="inf-deal">Deal type</label>
            <select id="inf-deal" className="field-input" value={form.barterStatus} onChange={set('barterStatus')}>
              <option value="">Not set</option>
              {withCurrent(DEAL_TYPES, influencer?.barterStatus).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Barter: they keep the unit. Returnable: it comes back.</p>
          </div>
        </fieldset>

        <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Contact</legend>
          <div>
            <label className="field-label" htmlFor="inf-email">Email</label>
            <input id="inf-email" type="email" className="field-input" value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="field-label" htmlFor="inf-phone">Phone number</label>
            <input id="inf-phone" className="field-input" value={form.phone} onChange={set('phone')} placeholder="Separate several with commas" />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="inf-address">Shipping address</label>
            <textarea id="inf-address" rows={2} className="field-input resize-y" value={form.address} onChange={set('address')} />
          </div>
        </fieldset>

        <fieldset className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Social profiles</legend>
          <div>
            <label className="field-label inline-flex! items-center gap-1.5" htmlFor="inf-yt"><PlatformIcon platform="youtube" />YouTube</label>
            <input id="inf-yt" className="field-input" value={form.youtube} onChange={set('youtube')} placeholder="https://youtube.com/@…" />
          </div>
          <div>
            <label className="field-label inline-flex! items-center gap-1.5" htmlFor="inf-ig"><PlatformIcon platform="instagram" />Instagram</label>
            <input id="inf-ig" className="field-input" value={form.instagram} onChange={set('instagram')} placeholder="https://instagram.com/…" />
          </div>
          <div>
            <label className="field-label inline-flex! items-center gap-1.5" htmlFor="inf-x"><PlatformIcon platform="twitter" />X / Twitter</label>
            <input id="inf-x" className="field-input" value={form.twitter} onChange={set('twitter')} placeholder="https://x.com/…" />
          </div>
        </fieldset>

        <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Other (unlabelled columns in the sheet)</legend>
          <div>
            <label className="field-label" htmlFor="inf-c">Sheet column C</label>
            <input id="inf-c" className="field-input" value={form.extraInfo} onChange={set('extraInfo')} />
          </div>
          <div>
            <label className="field-label" htmlFor="inf-link">Other link</label>
            <input id="inf-link" className="field-input" value={form.extraLink} onChange={set('extraLink')} />
          </div>
        </fieldset>
      </form>
    </Modal>
  );
};
