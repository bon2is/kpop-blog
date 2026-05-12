'use client';

import { useEffect } from 'react';

const ADSENSE_CLIENT = 'ca-pub-7999144867236526';

const AD_SLOTS = {
  display: '7671594779',      // andxo-display-300x250
  topBanner: '4092888672',    // 상단 두개 광고
  inArticle: '4326293473',    // andxo-inarticle (인아티클 전용)
  inFeed: '5270444172',       // Inline (인피드 전용)
  sidebar: '1112352179',      // andxocom_sidebar 300x600
};

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

function pushAd() {
  try {
    if (typeof window !== 'undefined') {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    }
  } catch {
    // adsbygoogle not available
  }
}

export default function AdBanner({
  slot = AD_SLOTS.display,
  format = 'auto',
  className = '',
}: AdBannerProps) {
  useEffect(() => { pushAd(); }, []);

  return (
    <div className={`ad-container overflow-hidden ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

// 글 본문 중간 삽입 광고 — 네이티브 인아티클 포맷 (CTR/RPM 최고)
export function InArticleAd({ className = '' }: { className?: string }) {
  useEffect(() => { pushAd(); }, []);

  return (
    <div className={`ad-container my-8 ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={AD_SLOTS.inArticle}
        data-ad-layout="in-article"
        data-ad-format="fluid"
      />
    </div>
  );
}

// 피드 사이 삽입 광고 — 네이티브 인피드 포맷
export function InFeedAd({ className = '' }: { className?: string }) {
  useEffect(() => { pushAd(); }, []);

  return (
    <div className={`ad-container ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={AD_SLOTS.inFeed}
        data-ad-format="fluid"
        data-ad-layout-key="-fb+5w+4e-db+86"
      />
    </div>
  );
}

export function TopBannerAd({ className = '' }: { className?: string }) {
  return <AdBanner slot={AD_SLOTS.topBanner} className={`mb-6 ${className}`} />;
}

export function BottomBannerAd({ className = '' }: { className?: string }) {
  return <AdBanner slot={AD_SLOTS.topBanner} className={`mt-8 ${className}`} />;
}

export function SidebarAd({ className = '' }: { className?: string }) {
  return (
    <div className={`sticky top-20 ${className}`}>
      <AdBanner slot={AD_SLOTS.sidebar} format="vertical" />
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
