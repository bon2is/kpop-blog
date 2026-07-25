'use client';

import { useEffect, useState } from 'react';

// CoupangFallbackLink — Coupang 상품이 비었을 때(ISR 빌드가 비한국 Vercel IP에서
// 돌아 Coupang API 401 → 0건) 노출하는 폴백 링크. 단, Coupang 은 한국 전용
// 이커머스이므로 **한국 방문자에게만** 보여준다. 글로벌 방문자는 null → 죽은 링크
// 대신 AmazonBanner 만 보게 된다.
//
// hydration 안전: 서버/초기 클라 모두 null 을 렌더하고, mount 후 지역 판별 시에만
// 링크를 노출한다(초기 렌더 일치 → mismatch 없음).

interface Props {
  keyword: string;
  title?: string;
  className?: string;
}

function isLikelyKorean(): boolean {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === 'Asia/Seoul') return true;
    const lang = (navigator.language || '').toLowerCase();
    return lang.startsWith('ko');
  } catch {
    return false;
  }
}

export default function CoupangFallbackLink({ keyword, title, className = '' }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(isLikelyKorean());
  }, []);

  if (!show) return null;

  const searchUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(keyword)}`;
  return (
    <a
      href={searchUrl}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      className={`group flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50 p-4 transition-colors hover:bg-orange-100 ${className}`}
    >
      <div>
        <p className="text-sm font-semibold text-gray-800">{title ?? keyword}</p>
        <p className="mt-0.5 text-xs text-gray-500">Browse on Coupang →</p>
      </div>
      <span className="rounded-full border border-orange-200 bg-white px-2 py-1 text-xs font-bold text-orange-500">
        Coupang
      </span>
    </a>
  );
}
