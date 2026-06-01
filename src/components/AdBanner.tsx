'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// AdSense Publisher ID. 환경변수 미설정 시 기존 ID 로 fallback.
const ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() || 'ca-pub-7999144867236526';

// Slot ID 정책 (Sprint 1, P0-2):
// - display / topBanner / inArticle / inFeed / sidebar 는 기존 ID fallback 유지
// - bottomBanner 는 신규 slot 발급 후 NEXT_PUBLIC_ADSENSE_BOTTOM_SLOT 으로 주입.
//   미설정 시 BottomBannerAd 가 null 을 렌더해 7671594779 중복 호출을 차단.
interface AdSlotMap {
  display: string;
  topBanner: string;
  bottomBanner: string | null;
  inArticle: string;
  inFeed: string;
  sidebar: string;
}

const AD_SLOTS: AdSlotMap = {
  display:      process.env.NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT?.trim()    || '7671594779',
  topBanner:    process.env.NEXT_PUBLIC_ADSENSE_TOP_SLOT?.trim()        || '4092888672',
  bottomBanner: process.env.NEXT_PUBLIC_ADSENSE_BOTTOM_SLOT?.trim()     || null,
  inArticle:    process.env.NEXT_PUBLIC_ADSENSE_INARTICLE_SLOT?.trim()  || '4326293473',
  inFeed:       process.env.NEXT_PUBLIC_ADSENSE_INFEED_SLOT?.trim()     || '5270444172',
  sidebar:      process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT?.trim()    || '1112352179',
};

// P0-3: dev / Preview 환경에서는 <ins> 를 렌더하지 않는다 (silverdrive AdUnit 패턴).
// invalid traffic 차단 + AdSense 정책 위험 제거.
const IS_PROD = process.env.NODE_ENV === 'production';

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

interface DevPlaceholderProps {
  label: string;
  className?: string;
  style?: React.CSSProperties;
}

function DevPlaceholder({ label, className = '', style }: DevPlaceholderProps) {
  return (
    <div
      className={`bg-pink-50 border-2 border-dashed border-pink-200 rounded-lg flex items-center justify-center text-pink-400 ${className}`}
      style={{ minHeight: '90px', ...style }}
    >
      <span className="text-sm">{label}</span>
    </div>
  );
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
    if (!IS_PROD) return;
    if (!pushed.current) {
      pushed.current = true;
      pushAd();
    }
  });

  if (!IS_PROD) {
    return (
      <DevPlaceholder
        label={`Ad placeholder (slot ${slot})`}
        className={className}
      />
    );
  }

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
    if (!IS_PROD) return;
    if (!pushed.current) {
      pushed.current = true;
      pushAd();
    }
  });

  if (!IS_PROD) {
    return (
      <DevPlaceholder
        label="In-Article Ad placeholder"
        className={`my-8 ${className}`}
        style={{ minHeight: '250px' }}
      />
    );
  }

  return (
    <div className={`ad-container my-8 ${className}`}>
      <p className="text-xs text-gray-400 text-center mb-1 select-none">Advertisement</p>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center', minHeight: '250px' }}
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
    if (!IS_PROD) return;
    if (!pushed.current) {
      pushed.current = true;
      pushAd();
    }
  });

  if (!IS_PROD) {
    return (
      <DevPlaceholder
        label="In-Feed Ad placeholder"
        className={className}
        style={{ minHeight: '100px' }}
      />
    );
  }

  return (
    <div className={`ad-container ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minHeight: '100px' }}
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

// 신규 slot (NEXT_PUBLIC_ADSENSE_BOTTOM_SLOT) 미설정 시 null 렌더.
// 7671594779 와의 중복 호출을 차단하는 의도된 동작이며, 운영자가 env 등록 후 자동 활성화된다.
export function BottomBannerAd({ className = '' }: { className?: string }) {
  const slot = AD_SLOTS.bottomBanner;
  if (!slot) {
    if (!IS_PROD) {
      return (
        <DevPlaceholder
          label="Bottom Banner placeholder (NEXT_PUBLIC_ADSENSE_BOTTOM_SLOT 미설정)"
          className={`mt-8 ${className}`}
        />
      );
    }
    return null;
  }
  return <AdBanner slot={slot} className={`mt-8 ${className}`} />;
}

export function SidebarAd({ className = '' }: { className?: string }) {
  return (
    <div className={`sticky top-20 ${className}`}>
      <AdBanner slot={AD_SLOTS.sidebar} format="vertical" />
    </div>
  );
}

// 기존 호출부 호환용 wrapper. dev/prod 분기 로직은 AdBanner 내부로 이동.
export function AdPlaceholder({ className = '' }: { className?: string }) {
  return <AdBanner className={className} />;
}
