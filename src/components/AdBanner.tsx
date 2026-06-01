'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AdErrorBoundary } from './AdErrorBoundary';
import AuditionPromoCard from './AuditionPromoCard';

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
  atfRectangle: string | null;
}

const AD_SLOTS: AdSlotMap = {
  display:      process.env.NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT?.trim()    || '7671594779',
  topBanner:    process.env.NEXT_PUBLIC_ADSENSE_TOP_SLOT?.trim()        || '4092888672',
  bottomBanner: process.env.NEXT_PUBLIC_ADSENSE_BOTTOM_SLOT?.trim()     || null,
  inArticle:    process.env.NEXT_PUBLIC_ADSENSE_INARTICLE_SLOT?.trim()  || '4326293473',
  inFeed:       process.env.NEXT_PUBLIC_ADSENSE_INFEED_SLOT?.trim()     || '5270444172',
  sidebar:      process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT?.trim()    || '1112352179',
  atfRectangle: process.env.NEXT_PUBLIC_ADSENSE_ATF_SLOT?.trim()        || null,
};

// P0-3: dev / Preview 환경에서는 <ins> 를 렌더하지 않는다 (silverdrive AdUnit 패턴).
// invalid traffic 차단 + AdSense 정책 위험 제거.
const IS_PROD = process.env.NODE_ENV === 'production';

// Sprint 2 hotfix #2 (hydration mismatch React #418/#423 대응):
// adsbygoogle.js 가 SSR HTML 의 <ins> children/attribute 를 hydration 전에 modify 해
// React 가 mismatch 로 throw. mounted gate 로 <ins> 를 클라 mount 후에만 렌더해서
// hydration window 밖에서 AdSense 가 DOM 을 손대도록 분리한다.
function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

// Sprint 2: AdSenseScript 를 RootLayout 에서 제거하고, 광고 컴포넌트가 처음 마운트될 때만 로드.
// 광고 없는 페이지(/privacy, /terms, /about 등)의 LCP 를 보호한다.
let adsScriptInjected = false;

function ensureAdsScript() {
  if (!IS_PROD) return;
  if (typeof window === 'undefined') return;
  if (adsScriptInjected) return;
  if (document.getElementById('adsbygoogle-js')) {
    adsScriptInjected = true;
    return;
  }
  const s = document.createElement('script');
  s.id = 'adsbygoogle-js';
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  document.head.appendChild(s);
  adsScriptInjected = true;
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
  const mounted = useMounted();

  // SPA 라우트 변경 시 pathname이 바뀌므로 광고를 재초기화한다.
  // Next.js 클라이언트 내비게이션은 전체 페이지 리로드 없이 일어나기 때문에
  // useEffect dependency에 pathname을 넣어 새 경로마다 push({})를 호출한다.
  useEffect(() => {
    pushed.current = false;
  }, [pathname]);

  useEffect(() => {
    if (!IS_PROD || !mounted) return;
    ensureAdsScript();
    if (!pushed.current) {
      pushed.current = true;
      pushAd();
    }
  }, [pathname, mounted]);

  // SSR / hydration window: <ins> 를 렌더하지 않음. CLS 방지용 placeholder 만 둔다.
  if (!mounted) {
    return (
      <div
        className={`ad-container overflow-hidden ${className}`}
        style={{ minHeight: '90px' }}
        aria-hidden
      />
    );
  }

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
  const mounted = useMounted();

  useEffect(() => {
    pushed.current = false;
  }, [pathname]);

  useEffect(() => {
    if (!IS_PROD || !mounted) return;
    ensureAdsScript();
    if (!pushed.current) {
      pushed.current = true;
      pushAd();
    }
  }, [pathname, mounted]);

  if (!mounted) {
    return (
      <div
        className={`ad-container my-8 ${className}`}
        style={{ minHeight: '250px' }}
        aria-hidden
      />
    );
  }

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
  const mounted = useMounted();

  useEffect(() => {
    pushed.current = false;
  }, [pathname]);

  useEffect(() => {
    if (!IS_PROD || !mounted) return;
    ensureAdsScript();
    if (!pushed.current) {
      pushed.current = true;
      pushAd();
    }
  }, [pathname, mounted]);

  if (!mounted) {
    return (
      <div
        className={`ad-container ${className}`}
        style={{ minHeight: '100px' }}
        aria-hidden
      />
    );
  }

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

// Sprint 2 P0-1: ATF (Above-The-Fold) 강제 슬롯
// - 300×250 고정 사이즈 (Medium Rectangle, CPC fill 최고 포맷, CLS 0 보장)
// - 모바일/데스크톱 동일 사이즈 (양쪽 모두 정상 fill)
// - AdErrorBoundary 로 wrap, 런타임 광고 로드 실패 시 AuditionPromoCard 폴백
// - NEXT_PUBLIC_ADSENSE_ATF_SLOT 미설정 시: dev placeholder / prod 도 AuditionPromoCard 폴백
//   (AdErrorBoundary 는 SSR/prerender 시 throw 를 못 잡으므로, slot 부재는 build-time 분기로 직접 처리)
interface AtfAdUnitProps {
  slot: string;
}

// Sprint 2 hotfix: AdSense "no fill" 케이스 처리.
// silverdrive 에는 동등 로직이 없어 (fill rate 100% 에 가까운 단일 페이지 BM) kpop 만 새로 작성.
// AdErrorBoundary 는 throw 만 잡으므로 unfilled (HTTP 200 + 광고 없음) 응답은 React 가
// 감지할 수 없다. <ins> DOM 상태를 setTimeout 으로 확인해 폴백 카드로 swap 한다.
const UNFILLED_CHECK_DELAY_MS = 2000;
const UNFILLED_MIN_HEIGHT_PX  = 50;

function isInsUnfilled(el: HTMLElement): boolean {
  if (el.getAttribute('data-ad-status') === 'unfilled') return true;
  if (el.childElementCount === 0) return true;
  if (el.offsetHeight < UNFILLED_MIN_HEIGHT_PX) return true;
  return false;
}

function AtfRectangleAdUnit({ slot }: AtfAdUnitProps) {
  const pathname = usePathname();
  const insRef = useRef<HTMLModElement | null>(null);
  const lastPushedPath = useRef<string | null>(null);
  const [unfilled, setUnfilled] = useState(false);
  const mounted = useMounted();

  // SPA 라우트 변경 시 unfilled 상태 초기화 (새 경로에서는 다시 시도)
  useEffect(() => {
    setUnfilled(false);
  }, [pathname]);

  useEffect(() => {
    if (!IS_PROD || !mounted) return;
    if (unfilled) return;
    if (lastPushedPath.current === pathname) return; // 같은 path 중복 push 차단
    lastPushedPath.current = pathname;

    ensureAdsScript();
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // adsbygoogle 미가용 — unfilled 감지에서 후속 처리됨
    }

    const timer = window.setTimeout(() => {
      const el = insRef.current;
      if (!el) return;
      if (isInsUnfilled(el)) {
        setUnfilled(true);
      }
    }, UNFILLED_CHECK_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pathname, unfilled, mounted]);

  // SSR / hydration window: <ins> 미렌더, 자리만 reserve (CLS 0)
  if (!mounted) {
    return (
      <div
        className="ad-container flex justify-center"
        style={{ minHeight: '250px' }}
        aria-hidden
      />
    );
  }

  // unfilled 확정: <ins> 와 "Advertisement" 라벨까지 통째로 폴백 카드로 교체.
  // 운영자 지시 옵션 (a) "AuditionPromoCard 로 swap" 채택.
  if (unfilled) {
    return <AtfFallbackCard />;
  }

  return (
    <div
      className="ad-container flex justify-center"
      style={{ minHeight: '250px' }}
    >
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'inline-block', width: '300px', height: '250px' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
      />
    </div>
  );
}

function AtfFallbackCard() {
  return (
    <div style={{ width: '300px', minHeight: '250px' }}>
      <AuditionPromoCard source="atf_fallback" />
    </div>
  );
}

export function AtfRectangleAd({ className = '' }: { className?: string }) {
  const slot = AD_SLOTS.atfRectangle;

  if (!slot) {
    // dev: placeholder, prod: AuditionPromoCard 폴백 (빈 공간 회피)
    if (!IS_PROD) {
      return (
        <div className={`my-6 flex justify-center ${className}`}>
          <DevPlaceholder
            label="ATF Rectangle placeholder (NEXT_PUBLIC_ADSENSE_ATF_SLOT 미설정)"
            style={{ width: '300px', height: '250px', minHeight: '250px' }}
          />
        </div>
      );
    }
    return (
      <div className={`my-6 flex justify-center ${className}`}>
        <AtfFallbackCard />
      </div>
    );
  }

  if (!IS_PROD) {
    return (
      <div className={`my-6 flex justify-center ${className}`}>
        <DevPlaceholder
          label="ATF Rectangle Ad placeholder"
          style={{ width: '300px', height: '250px', minHeight: '250px' }}
        />
      </div>
    );
  }

  return (
    <div className={`my-6 flex justify-center ${className}`}>
      <AdErrorBoundary fallback={<AtfFallbackCard />}>
        <AtfRectangleAdUnit slot={slot} />
      </AdErrorBoundary>
    </div>
  );
}

// 기존 호출부 호환용 wrapper. dev/prod 분기 로직은 AdBanner 내부로 이동.
export function AdPlaceholder({ className = '' }: { className?: string }) {
  return <AdBanner className={className} />;
}
