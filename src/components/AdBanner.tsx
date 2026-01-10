'use client';

import { useEffect, useRef } from 'react';

interface AdBannerProps {
  slot?: string;
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle' | 'fluid';
  className?: string;
  style?: React.CSSProperties;
  layout?: 'in-article' | 'in-feed' | '';
  layoutKey?: string;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

const ADSENSE_CLIENT = 'ca-pub-7999144867236526';
const DEFAULT_SLOT = '4092888672';

export default function AdBanner({
  slot = DEFAULT_SLOT,
  format = 'auto',
  className = '',
  style,
  layout = '',
  layoutKey,
}: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  const isAdLoaded = useRef(false);

  useEffect(() => {
    if (isAdLoaded.current) return;

    try {
      if (typeof window !== 'undefined' && adRef.current) {
        // Check if ad is already initialized
        if (adRef.current.getAttribute('data-ad-status')) return;

        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isAdLoaded.current = true;
      }
    } catch (error) {
      console.error('Adsense error:', error);
    }
  }, []);

  return (
    <div className={`ad-container overflow-hidden ${className}`} style={{ minHeight: '100px' }}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', minHeight: '100px', ...style }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
        {...(layout && { 'data-ad-layout': layout })}
        {...(layoutKey && { 'data-ad-layout-key': layoutKey })}
      />
    </div>
  );
}

// 기사 내 광고 (In-article)
export function InArticleAd({ className = '' }: { className?: string }) {
  return (
    <AdBanner
      slot={DEFAULT_SLOT}
      format="fluid"
      layout="in-article"
      className={`my-8 ${className}`}
      style={{ textAlign: 'center' }}
    />
  );
}

// 피드 내 광고 (In-feed)
export function InFeedAd({ className = '' }: { className?: string }) {
  return (
    <AdBanner
      slot={DEFAULT_SLOT}
      format="fluid"
      layout="in-feed"
      layoutKey="-fb+5w+4e-db+86"
      className={className}
    />
  );
}

// 상단 배너 광고
export function TopBannerAd({ className = '' }: { className?: string }) {
  return (
    <AdBanner
      slot={DEFAULT_SLOT}
      format="horizontal"
      className={`mb-6 ${className}`}
    />
  );
}

// 하단 배너 광고
export function BottomBannerAd({ className = '' }: { className?: string }) {
  return (
    <AdBanner
      slot={DEFAULT_SLOT}
      format="horizontal"
      className={`mt-8 ${className}`}
    />
  );
}

// 사이드바 광고 (고정)
export function SidebarAd({ className = '' }: { className?: string }) {
  return (
    <div className={`sticky top-20 ${className}`}>
      <AdBanner
        slot={DEFAULT_SLOT}
        format="vertical"
      />
    </div>
  );
}

// Placeholder (개발용)
export function AdPlaceholder({ className = '' }: { className?: string }) {
  if (process.env.NODE_ENV === 'production') {
    return <AdBanner className={className} />;
  }

  return (
    <div
      className={`bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-dashed border-pink-200 rounded-lg flex items-center justify-center text-pink-400 ${className}`}
      style={{ minHeight: '90px' }}
    >
      <span className="text-sm font-medium">Ad Space</span>
    </div>
  );
}
