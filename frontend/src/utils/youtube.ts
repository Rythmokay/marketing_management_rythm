/** "@handle" or "handle" becomes a channel link; YouTube links are kept (with a scheme added). */
export const channelUrl = (channel: string) => {
  const c = channel.trim();
  if (!c) return '';
  if (/youtube\.com|youtu\.be/i.test(c)) return /^https?:\/\//i.test(c) ? c : `https://${c}`;
  return `https://www.youtube.com/@${c.replace(/^@/, '')}`;
};

/** Comparable channel id: "youtube.com/@Handle/videos" → "handle", "…/channel/UC…" → "channel/uc…". Same rules as the server. */
export const channelKey = (url?: string) => {
  if (!url?.trim()) return null;
  const path = url.trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^(www\.|m\.)?youtube\.com\/?/, '')
    .split(/[?#]/)[0];
  const parts = path.split('/');
  if (!parts[0]) return null;
  if (parts[0] === 'channel' && parts[1]) return `channel/${parts[1]}`;
  if ((parts[0] === 'c' || parts[0] === 'user') && parts[1]) return parts[1];
  return parts[0].replace(/^@/, '');
};

/** Short label for a channel input: "@handle", or the link when it's a channel id. */
export const channelLabel = (channel: string) => {
  const key = channelKey(channelUrl(channel));
  return !key ? channel : key.startsWith('channel/') ? 'channel ' + key.slice(8, 20) + '…' : `@${key}`;
};
