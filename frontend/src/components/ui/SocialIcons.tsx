import React from 'react';
import { SiInstagram, SiX, SiYoutube, SiYoutubeshorts } from 'react-icons/si';

export type Platform = 'youtube' | 'youtubeShorts' | 'instagram' | 'twitter';

/** Official brand logos (Simple Icons) and colours. Instagram uses its gradient. */
const PLATFORMS: Record<Platform, { Icon: React.ElementType; color: string; label: string }> = {
  youtube: { Icon: SiYoutube, color: '#FF0000', label: 'YouTube' },
  youtubeShorts: { Icon: SiYoutubeshorts, color: '#FF0000', label: 'YouTube Shorts' },
  instagram: { Icon: SiInstagram, color: 'url(#ig-gradient)', label: 'Instagram' },
  twitter: { Icon: SiX, color: '#0f172a', label: 'X / Twitter' },
};

/** Gradient referenced by the Instagram logo; rendered once per icon (ids are identical, so duplicates are harmless). */
const InstagramGradient = () => (
  <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
    <defs>
      <radialGradient id="ig-gradient" cx="30%" cy="107%" r="150%">
        <stop offset="0%" stopColor="#fdf497" />
        <stop offset="5%" stopColor="#fdf497" />
        <stop offset="45%" stopColor="#fd5949" />
        <stop offset="60%" stopColor="#d6249f" />
        <stop offset="90%" stopColor="#285AEB" />
      </radialGradient>
    </defs>
  </svg>
);

interface PlatformIconProps {
  platform: Platform;
  size?: number;
  /** Brand colour (default) or the surrounding text colour */
  colored?: boolean;
  className?: string;
  /** Text for screen readers; omit when a visible label sits next to the icon */
  title?: string;
}

export const PlatformIcon: React.FC<PlatformIconProps> = ({ platform, size = 14, colored = true, className = '', title }) => {
  const { Icon, color } = PLATFORMS[platform];
  return (
    <>
      {colored && platform === 'instagram' && <InstagramGradient />}
      <Icon
        size={size}
        className={`shrink-0 ${className}`}
        style={colored ? { fill: color, color: platform === 'instagram' ? undefined : color } : undefined}
        aria-hidden={title ? undefined : true}
        aria-label={title}
        role={title ? 'img' : undefined}
      />
    </>
  );
};
