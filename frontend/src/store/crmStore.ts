import { create } from 'zustand';
import { crmApi } from '../api/crmApi';
import type { CampaignRecord, InfluencerRecord } from '../types/crm';

interface CrmState {
  products: string[];
  influencers: InfluencerRecord[];
  campaigns: CampaignRecord[];
  isLoading: boolean;
  loadError: string | null;
  hasLoaded: boolean;

  load: () => Promise<void>;
  saveInfluencer: (record: InfluencerRecord) => Promise<InfluencerRecord>;
  deleteInfluencer: (id: string) => Promise<void>;
  saveCampaign: (record: Omit<CampaignRecord, 'id'> & { id?: string }) => Promise<CampaignRecord>;
  deleteCampaign: (id: string) => Promise<void>;
  addProduct: (name: string) => Promise<string>;
  deleteProduct: (name: string) => Promise<void>;
  importRecords: (records: InfluencerRecord[], mode: 'replace' | 'append') => Promise<void>;
  reset: () => void;
}

/** Shared CRM data for every page, so moving between pages doesn't refetch or lose edits. */
export const useCrmStore = create<CrmState>((set, get) => ({
  products: [],
  influencers: [],
  campaigns: [],
  isLoading: false,
  loadError: null,
  hasLoaded: false,

  load: async () => {
    set({ isLoading: true, loadError: null });
    try {
      const [products, influencers, campaigns] = await Promise.all([
        crmApi.getProducts(),
        crmApi.getInfluencers(),
        crmApi.getCampaigns()
      ]);
      set({ products, influencers, campaigns, hasLoaded: true });
    } catch (err) {
      console.error('Failed to load CRM data from database backend:', err);
      set({ loadError: 'Could not load data from the server. Check that the backend is running, then retry.' });
    } finally {
      set({ isLoading: false });
    }
  },

  saveInfluencer: async (record) => {
    const exists = get().influencers.some(i => i.id === record.id);
    const saved = exists ? await crmApi.updateInfluencer(record.id, record) : await crmApi.saveInfluencer(record);
    set(state => ({
      influencers: exists
        ? state.influencers.map(i => (i.id === saved.id ? saved : i))
        : [...state.influencers, saved]
    }));
    return saved;
  },

  deleteInfluencer: async (id) => {
    await crmApi.deleteInfluencer(id);
    set(state => ({
      influencers: state.influencers.filter(i => i.id !== id),
      campaigns: state.campaigns.filter(c => c.influencerId !== id)
    }));
  },

  saveCampaign: async (record) => {
    const saved = record.id
      ? await crmApi.updateCampaign(record.id, record as CampaignRecord)
      : await crmApi.saveCampaign(record);
    set(state => ({
      campaigns: state.campaigns.some(c => c.id === saved.id)
        ? state.campaigns.map(c => (c.id === saved.id ? saved : c))
        : [...state.campaigns, saved]
    }));
    return saved;
  },

  deleteCampaign: async (id) => {
    await crmApi.deleteCampaign(id);
    set(state => ({ campaigns: state.campaigns.filter(c => c.id !== id) }));
  },

  addProduct: async (name) => {
    const created = await crmApi.addProduct(name);
    set(state => ({ products: state.products.includes(created) ? state.products : [...state.products, created] }));
    return created;
  },

  deleteProduct: async (name) => {
    await crmApi.deleteProduct(name);
    set(state => ({
      products: state.products.filter(p => p !== name),
      campaigns: state.campaigns.filter(c => c.product !== name)
    }));
  },

  importRecords: async (records, mode) => {
    await crmApi.batchImportInfluencers(records, mode);
    await get().load();
  },

  // Forget loaded data on logout so the next user gets a fresh load
  reset: () => set({ products: [], influencers: [], campaigns: [], hasLoaded: false, loadError: null })
}));
