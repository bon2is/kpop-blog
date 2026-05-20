'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const ADSENSE_CLIENT = 'ca-pub-7999144867236526';

const AD_SLOTS = {
  display: '7671594779',      // andxo-display-300x250
  topBanner: '4092888672',    // 상단 배너
  bottomBanner: '4092888672', // 하단 배너 (동일 슬롯 ID — 위치는 AdSense가 구분)
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
  const pathname = usePathname();
  const pushed = useRef(false);

  // SPA 라우트 변경 시 pathname이 바뀌므로 광고를 재초기화한다.
  // Next.js 클라이언트 내비게이션은 전체 페이지 리로드 없이 일어나기 때문에
  // useEffect dependency에 pathname을 넣어 새 경로마다 push({})를 호출한다.
  useEffect(() => {
    pushed.current = false;
  }, [pathname]);

  useEffect(() => {
    if (!pushed.current) {
      pushed.current = true;
      pushAd();
    }
  });

  return (
    <div className={`ad-container overflow-hidden ${className}`}>
      <p className="text-xs text-gray-400 text-center mb-1 select-none">Advertisement</p>
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

// 글 본문 중간 삽입 광고 — 네이티브 인아티클 포맷 (CTR/RPM 최고)
export function InArticleAd({ className = '' }: { className?: string }) {
  const pathname = usePathname();
  const pushed = useRef(false);

  useEffect(() => {
    pushed.current = false;
  }, [pathname]);

  useEffect(() => {
    if (!pushed.current) {
      pushed.current = true;
      pushAd();
    }
  });

  return (
    <div className={`ad-container my-8 ${className}`}>
      <p className="text-xs text-gray-400 text-center mb-1 select-none">Advertisement</p>
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
  const pathname = usePathname();
  const pushed = useRef(false);

  useEffect(() => {
    pushed.current = false;
  }, [pathname]);

  useEffect(() => {
    if (!pushed.current) {
      pushed.current = true;
      pushAd();
    }
  });

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
  return <AdBanner slot={AD_SLOTS.bottomBanner} className={`mt-8 ${className}`} />;
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
