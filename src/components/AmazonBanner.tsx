// AmazonBanner — 글로벌 방문자용 제휴(Amazon Associates) 배너.
// CoupangBanner 는 한국 IP 에서만 상품이 채워지고, ISR 빌드(비한국 Vercel 서버)에서는
// 401 로 상품이 비어 사실상 글로벌 방문자에게 무의미하다. 이 컴포넌트가 그 공백을 메운다.
//
// env NEXT_PUBLIC_AMAZON_ASSOC_TAG 미설정 시 null 을 렌더한다 → Associates 가입/승인
// 전까지는 프로덕션에서 아무것도 노출되지 않는 "활성화 대기" 골격이다.
// 가입 후 Vercel 에 태그를 넣으면 자동으로 켜진다.

const AMAZON_TAG = process.env.NEXT_PUBLIC_AMAZON_ASSOC_TAG?.trim();
const AMAZON_STORE = 'https://www.amazon.com';

interface Props {
  tags?: string[];
  keyword?: string;
  title?: string;
  className?: string;
}

function searchUrl(keyword: string): string {
  const params = new URLSearchParams({ k: keyword, tag: AMAZON_TAG as string });
  return `${AMAZON_STORE}/s?${params.toString()}`;
}

export default function AmazonBanner({ tags = [], keyword, title, className = '' }: Props) {
  // 활성화 대기: 태그 없으면 렌더하지 않는다.
  if (!AMAZON_TAG) return null;

  const primary = (keyword || tags[0] || 'K-pop').trim();
  const items = [
    { label: `${primary} Albums`, kw: `${primary} kpop album` },
    { label: `${primary} Merch`, kw: `${primary} kpop merch` },
    { label: 'K-pop Lightstick', kw: 'kpop official lightstick' },
    { label: 'K-pop Photocards', kw: 'kpop photocard' },
  ];

  return (
    <div className={`my-8 rounded-xl border border-gray-100 bg-gray-50 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 leading-none">
          Amazon
        </span>
        <p className="text-sm font-semibold text-gray-700">{title ?? `Shop ${primary}`}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((it) => (
          <a
            key={it.label}
            href={searchUrl(it.kw)}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className="group flex min-h-[80px] flex-col justify-between rounded-lg border border-gray-100 bg-white p-3 transition-shadow hover:shadow-md"
          >
            <p className="text-[12px] font-medium leading-snug text-gray-800">{it.label}</p>
            <span className="mt-2 text-[11px] font-bold text-amber-600">Shop on Amazon →</span>
          </a>
        ))}
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-gray-400">
        As an Amazon Associate we earn from qualifying purchases.
      </p>
    </div>
  );
}
