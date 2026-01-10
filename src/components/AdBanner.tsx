'use client';

import { useEffect } from 'react';

const ADSENSE_CLIENT = 'ca-pub-7999144867236526';
const DEFAULT_SLOT = '4092888672';

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

interface AdBannerProps {
  slot?: string;
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
  className?: string;
}

export default function AdBanner({
  slot = DEFAULT_SLOT,
  format = 'auto',
  className = '',
}: AdBannerProps) {
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  return (
    <div className={`ad-container ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minHeight: '90px' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

export function InArticleAd({ className = '' }: { className?: string }) {
  return <AdBanner className={`my-8 ${className}`} />;
}

export function InFeedAd({ className = '' }: { className?: string }) {
  return <AdBanner className={className} />;
}

export function TopBannerAd({ className = '' }: { className?: string }) {
  return <AdBanner className={`mb-6 ${className}`} />;
}

export function BottomBannerAd({ className = '' }: { className?: string }) {
  return <AdBanner className={`mt-8 ${className}`} />;
}

export function SidebarAd({ className = '' }: { className?: string }) {
  return (
    <div className={`sticky top-20 ${className}`}>
      <AdBanner format="vertical" />
    </div>
  );
}

export function AdPlaceholder({ className = '' }: { className?: string }) {
  if (process.env.NODE_ENV === 'production') {
    return <AdBanner className={className} />;
  }
  return (
    <div
      className={`bg-pink-50 border-2 border-dashed border-pink-200 rounded-lg flex items-center justify-center text-pink-400 ${className}`}
      style={{ minHeight: '90px' }}
    >
      <span className="text-sm">Ad Space</span>
    </div>
  );
}
