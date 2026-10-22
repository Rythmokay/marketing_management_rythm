import { api } from './axios';
import type { InfluencerRecord, CampaignRecord, ReviewCheckRequest, ReviewSearchResult } from '../types/crm';

export interface ProductItem {
  id?: number;
  name: string;
}

export const crmApi = {
  // Products
  getProducts: async (): Promise<string[]> => {
    const res = await api.get<ProductItem[]>('/products');
    return res.data.map(p => p.name);
  },

  addProduct: async (name: string): Promise<string> => {
    const res = await api.post<ProductItem>('/products', { name });
    return res.data.name;
  },

  deleteProduct: async (name: string): Promise<void> => {
    await api.delete(`/products/${encodeURIComponent(name)}`);
  },

  // Influencers
  getInfluencers: async (): Promise<InfluencerRecord[]> => {
    const res = await api.get<InfluencerRecord[]>('/influencers');
    return res.data;
  },

  saveInfluencer: async (record: InfluencerRecord): Promise<InfluencerRecord> => {
    const res = await api.post<InfluencerRecord>('/influencers', record);
    return res.data;
  },

  updateInfluencer: async (id: string, record: InfluencerRecord): Promise<InfluencerRecord> => {
    const res = await api.put<InfluencerRecord>(`/influencers/${id}`, record);
    return res.data;
  },

  deleteInfluencer: async (id: string): Promise<void> => {
    await api.delete(`/influencers/${id}`);
  },

  batchImportInfluencers: async (records: InfluencerRecord[], mode: 'replace' | 'append'): Promise<InfluencerRecord[]> => {
    const res = await api.post<InfluencerRecord[]>('/influencers/batch', { records, mode });
    return res.data;
  },

  // Per-product campaigns (order / review / return tracking)
  getCampaigns: async (): Promise<CampaignRecord[]> => {
    const res = await api.get<CampaignRecord[]>('/campaigns');
    return res.data;
  },

  // Creates the campaign, or updates the existing one for the same influencer + product
  saveCampaign: async (record: Omit<CampaignRecord, 'id'> & { id?: string }): Promise<CampaignRecord> => {
    const res = await api.post<CampaignRecord>('/campaigns', record);
    return res.data;
  },

  updateCampaign: async (id: string, record: CampaignRecord): Promise<CampaignRecord> => {
    const res = await api.put<CampaignRecord>(`/campaigns/${id}`, record);
    return res.data;
  },

  deleteCampaign: async (id: string): Promise<void> => {
    await api.delete(`/campaigns/${id}`);
  },

  // Asks Gemini to find the influencer's review video of the product; the link is checked on YouTube
  findReview: async (influencerId: string, product: string): Promise<ReviewSearchResult> => {
    const res = await api.post<ReviewSearchResult>('/campaigns/find-review', { influencerId, product });
    return res.data;
  },

  // Review checker: any channel handle/link + product details
  checkReview: async (request: ReviewCheckRequest): Promise<ReviewSearchResult> => {
    const res = await api.post<ReviewSearchResult>('/review-check', request);
    return res.data;
  },

  getFindReviewStatus: async (): Promise<{ configured: boolean; model: string }> => {
    const res = await api.get<{ configured: boolean; model: string }>('/campaigns/find-review/status');
    return res.data;
  }
};
