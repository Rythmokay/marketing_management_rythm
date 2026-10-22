export interface InfluencerRecord {
  id: string;
  name: string;
  channelName: string;
  instagram?: string;
  youtube?: string;
  twitter?: string;
  language: string;
  barterStatus: string;
  email: string;
  phone: string;
  address: string;

  // Unlabelled columns C and M of the "Influencers Details" sheet
  extraInfo?: string;
  extraLink?: string;

  [key: string]: any;
}

// Order & return tracking for one influencer on one product (one row of a product sheet)
export interface CampaignRecord {
  id: string;
  influencerId: string;
  product: string;
  orderMade?: string;
  orderDate?: string;
  received?: string;
  receivedDate?: string;
  reviewVideoLink?: string;
  toBeReturned?: string;
  returnPickUpDate?: string;
  pickedUp?: string;
  returnReceived?: string;
  returnReceivedDate?: string;
  notes?: string;

  [key: string]: any;
}

// Result of searching an influencer's YouTube channel for a product review (nothing is saved)
export interface ReviewSearchResult {
  status: 'FOUND' | 'NEEDS_REVIEW' | 'NOT_FOUND';
  videoUrl?: string;
  videoTitle?: string;
  videoChannel?: string;
  publishedDate?: string;
  confidence?: string;
  reason?: string;
  thumbnailUrl?: string;
  searchQueries?: string[];
}

// What the review checker looks for (any channel, tracked or not)
export interface ReviewCheckRequest {
  channel: string;          // @handle or channel link
  channelName?: string;     // display name, when known
  product: string;
  productDetails?: string;  // brand, model, other names
  postedAfter?: string;     // YYYY-MM-DD
  language?: string;
}

// An influencer counts as using a product once the order is made or the unit received
export const isUsingProduct = (c?: CampaignRecord): boolean =>
  !!c && [c.orderMade, c.received].some(v => (v || '').toLowerCase().includes('yes'));

export interface DynamicColumn {
  key: string;
  label: string;
  type: 'text' | 'select' | 'link';
  options?: string[];
  isCustom?: boolean;
  readOnly?: boolean;
}

export const INFLUENCER_COLUMNS: DynamicColumn[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'channelName', label: 'Channel Name', type: 'text' },
  { key: 'language', label: 'Language', type: 'select', options: ['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Malayalam', 'Kannada', 'Marathi'] },
  { key: 'barterStatus', label: 'Barter/Returnable', type: 'select', options: ['Barter', 'Returnable', 'Both', 'Mostly Barter', 'Mostly Returnable', 'Both equally'] },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'phone', label: 'Phone Number', type: 'text' },
  { key: 'address', label: 'Address', type: 'text' },
  { key: 'instagram', label: 'Instagram', type: 'link' },
  { key: 'youtube', label: 'Youtube', type: 'link' },
  { key: 'twitter', label: 'Twitter', type: 'link' },
  { key: 'extraInfo', label: 'Sheet Column C', type: 'text' },
  { key: 'extraLink', label: 'Other Link', type: 'link' },
];

export const CAMPAIGN_COLUMNS: DynamicColumn[] = [
  { key: 'orderMade', label: 'Order Made', type: 'select', options: ['Yes', 'No', 'PAUSED'] },
  { key: 'orderDate', label: 'Order Date', type: 'text' },
  { key: 'received', label: 'Received', type: 'select', options: ['Yes', 'No'] },
  { key: 'receivedDate', label: 'Received Date', type: 'text' },
  { key: 'reviewVideoLink', label: 'Review Video Link', type: 'link' },
  { key: 'toBeReturned', label: 'To Be Returned', type: 'select', options: ['Yes', 'No'] },
  { key: 'returnPickUpDate', label: 'Pick Up Date', type: 'text' },
  { key: 'pickedUp', label: 'Picked Up', type: 'select', options: ['Yes', 'No'] },
  { key: 'returnReceived', label: 'Return Received', type: 'select', options: ['Yes', 'No'] },
  { key: 'returnReceivedDate', label: 'Return Date', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'text' },
];

// Flat one-row-per-influencer-per-product layout used for spreadsheet import / template download
export const DEFAULT_COLUMNS: DynamicColumn[] = [
  ...INFLUENCER_COLUMNS.slice(0, 2),
  { key: 'product', label: 'Product', type: 'text' },
  ...INFLUENCER_COLUMNS.slice(2),
  ...CAMPAIGN_COLUMNS,
];
