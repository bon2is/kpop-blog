# 쿠팡 파트너스 API 연동 가이드 (Next.js App Router)

andxo.com(tistorymigration)에서 검증된 구현을 기반으로 작성된 가이드입니다.  
다른 Next.js App Router 프로젝트에 동일하게 적용하세요.

---

## 사전 조건

- Next.js 14+ (App Router)
- Node.js `crypto` 모듈 (내장, 별도 설치 불필요)
- 쿠팡 파트너스 계정 → Access Key / Secret Key 발급 완료
  - 발급: [https://partners.coupang.com](https://partners.coupang.com) → API 관리

---

## 1. 환경 변수 설정

`.env.local`에 추가:

```env
COUPANG_ACCESS_KEY=your_access_key_here
COUPANG_SECRET_KEY=your_secret_key_here
```

> **주의**: `NEXT_PUBLIC_` prefix 없이 선언해야 서버에서만 접근됩니다.  
> 이 키들은 절대 클라이언트 컴포넌트(`'use client'`)에서 사용하지 마세요.

---

## 2. API 유틸리티 파일 생성

`src/lib/coupang.ts` 를 생성합니다:

```typescript
import crypto from 'crypto';

const ACCESS_KEY = process.env.COUPANG_ACCESS_KEY ?? '';
const SECRET_KEY = process.env.COUPANG_SECRET_KEY ?? '';
const BASE_URL = 'https://api-gateway.coupang.com';

function hmacSign(method: string, path: string, query: string) {
  // datetime: YYYYMMDDTHHmmssZ (UTC, 구분자 제거)
  const datetime = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z');
  const message = `${datetime}\n${method}\n${path}\n${query}`;
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(message)
    .digest('hex');
  return {
    authorization: `CEA algorithm=HmacSHA256, access-key=${ACCESS_KEY}, signed-date=${datetime}, signature=${signature}`,
  };
}

export interface CoupangProduct {
  productId: number;
  productName: string;
  productUrl: string;
  productImage: string;
  salePrice: number;
  originalPrice?: number;
  isRocket: boolean;
  isFreeShipping: boolean;
  categoryName?: string;
}

export async function searchCoupangProducts(
  keyword: string,
  limit = 4,
): Promise<CoupangProduct[]> {
  if (!ACCESS_KEY || !SECRET_KEY) return [];

  const path = '/v2/providers/affiliate_open_api/apis/openapi/products/search';
  const query = `keyword=${encodeURIComponent(keyword)}&limit=${limit}&subId=`;
  const { authorization } = hmacSign('GET', path, query);

  try {
    const res = await fetch(`${BASE_URL}${path}?${query}`, {
      headers: { Authorization: authorization },
      next: { revalidate: 3600 }, // 1시간 캐시
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data?.productData ?? []) as CoupangProduct[];
  } catch {
    return [];
  }
}

// ── 카테고리 → 기본 검색어 매핑 ──
// 프로젝트의 카테고리 구조에 맞게 수정하세요
const CATEGORY_KEYWORDS: Record<string, string> = {
  kpop:          'K-POP 앨범',
  entertainment: '블루레이 DVD',
  lifestyle:     '생활용품',
  culture:       '베스트셀러 도서',
  etc:           '베스트',
};

// ── 태그 → 특화 검색어 매핑 ──
// 콘텐츠 태그가 매칭될 때 더 관련성 높은 상품을 보여줌
const TAG_KEYWORD_MAP: Array<[string, string]> = [
  ['여행', '여행용품'],
  ['항공', '캐리어'],
  ['호텔', '여행용품'],
  ['신생아', '아기용품'],
  ['유아', '유아용품'],
  ['육아', '육아용품'],
  ['출산', '출산용품'],
  ['건강', '건강식품'],
  ['운동', '운동용품'],
  ['다이어트', '다이어트 식품'],
  ['뷰티', '화장품'],
  ['패션', '의류'],
  ['식품', '신선식품'],
  ['청소', '청소용품'],
];

export function getCoupangKeyword(category: string, tags: string[] = []): string {
  for (const tag of tags) {
    for (const [match, keyword] of TAG_KEYWORD_MAP) {
      if (tag.includes(match)) return keyword;
    }
  }
  return CATEGORY_KEYWORDS[category] ?? '베스트';
}
```

---

## 3. 배너 컴포넌트 생성

`src/components/CoupangBanner.tsx` 를 생성합니다:

```typescript
import Image from 'next/image';
import { searchCoupangProducts, getCoupangKeyword, CoupangProduct } from '@/lib/coupang';

interface Props {
  category?: string;
  tags?: string[];
  keyword?: string;   // 직접 검색어 지정 시 사용
  title?: string;     // 배너 제목 커스터마이즈
  limit?: number;     // 상품 수 (기본 4)
}

function ProductCard({ product }: { product: CoupangProduct }) {
  const discountPct =
    product.originalPrice && product.originalPrice > product.salePrice
      ? Math.round(((product.originalPrice - product.salePrice) / product.originalPrice) * 100)
      : 0;

  return (
    <a
      href={product.productUrl}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group flex flex-col rounded-lg border border-gray-100 bg-white overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        <Image
          src={product.productImage}
          alt={product.productName}
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          unoptimized
        />
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
          {product.isRocket && (
            <span className="text-[9px] font-bold bg-[#e44] text-white px-1.5 py-0.5 rounded-full leading-none">
              로켓
            </span>
          )}
          {discountPct > 0 && (
            <span className="text-[9px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-full leading-none">
              {discountPct}%
            </span>
          )}
        </div>
      </div>
      <div className="p-2 flex flex-col gap-1 flex-1">
        <p className="text-[11px] text-gray-700 line-clamp-2 leading-snug">{product.productName}</p>
        <div className="mt-auto">
          <p className="text-sm font-bold text-gray-900">{product.salePrice.toLocaleString()}원</p>
          {product.isFreeShipping && (
            <p className="text-[10px] text-blue-500 font-medium">무료배송</p>
          )}
        </div>
      </div>
    </a>
  );
}

export default async function CoupangBanner({
  category = 'etc',
  tags = [],
  keyword,
  title,
  limit = 4,
}: Props) {
  const searchKeyword = keyword ?? getCoupangKeyword(category, tags);
  const products = await searchCoupangProducts(searchKeyword, limit);
  if (products.length === 0) return null;

  return (
    <div className="my-8 rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 leading-none">
          쿠팡 파트너스
        </span>
        <p className="text-sm font-semibold text-gray-700">
          {title ?? `${searchKeyword} 추천 상품`}
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {products.map((p) => (
          <ProductCard key={p.productId} product={p} />
        ))}
      </div>
      <p className="mt-3 text-[10px] text-gray-400 leading-relaxed">
        이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </p>
    </div>
  );
}
```

> **필수**: `이 포스팅은 쿠팡 파트너스 활동의 일환으로...` 문구는 쿠팡 파트너스 이용약관상 **반드시** 포함해야 합니다.

---

## 4. 페이지에서 사용

### 포스트 상세 페이지 — 포스트 카테고리/태그 자동 반영

```typescript
import CoupangBanner from '@/components/CoupangBanner';

// post.category와 post.tags를 전달하면 자동으로 관련 상품 검색
<CoupangBanner category={post.category} tags={post.tags ?? []} />
```

### 홈/목록 페이지 — 고정 키워드

```typescript
// 직접 검색어 지정
<CoupangBanner keyword="K-POP 굿즈" title="오늘의 K-POP 추천 상품" />

// 카테고리만 지정 (CATEGORY_KEYWORDS 매핑 사용)
<CoupangBanner category="kpop" title="오늘의 추천 상품" />
```

### 상품 수 조절

```typescript
// 2개만 표시 (좁은 레이아웃)
<CoupangBanner keyword="아이돌 포토카드" limit={2} />
```

---

## 5. `next.config` 이미지 도메인 설정

쿠팡 상품 이미지 호스트를 허용해야 합니다.

```javascript
// next.config.js 또는 next.config.ts
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'thumbnail*.coupangcdn.com',
      },
      {
        protocol: 'https',
        hostname: 'static.coupangcdn.com',
      },
    ],
  },
};

module.exports = nextConfig;
```

> `Image` 컴포넌트에 `unoptimized` prop을 사용하면 이 설정 없이도 동작하지만,  
> Next.js 이미지 최적화를 쓰려면 위 설정이 필요합니다.

---

## 6. HMAC 서명 원리 (참고)

쿠팡 파트너스 API는 **HMAC-SHA256** 서명 방식을 사용합니다:

```
message    = datetime + "\n" + method + "\n" + path + "\n" + query
signature  = HMAC-SHA256(secretKey, message)
Authorization: CEA algorithm=HmacSHA256, access-key=..., signed-date=..., signature=...
```

- `datetime` 형식: `YYYYMMDDTHHmmssZ` (UTC, 구분자 모두 제거)
- 서명은 요청마다 새로 생성해야 함 (타임스탬프 포함)

---

## 7. K-POP 프로젝트 특화 매핑 예시

새 프로젝트에 맞게 `CATEGORY_KEYWORDS`와 `TAG_KEYWORD_MAP`을 교체하세요:

```typescript
// K-POP 특화 카테고리 매핑
const CATEGORY_KEYWORDS: Record<string, string> = {
  idol:       'K-POP 아이돌 굿즈',
  album:      'K-POP 앨범',
  concert:    '콘서트 응원봉',
  audition:   'K-POP 보컬 트레이닝',
  fashion:    '아이돌 패션',
  default:    'K-POP 베스트',
};

// K-POP 특화 태그 매핑
const TAG_KEYWORD_MAP: Array<[string, string]> = [
  ['BTS', 'BTS 굿즈'],
  ['뉴진스', '뉴진스 앨범'],
  ['aespa', 'aespa 굿즈'],
  ['스트레이키즈', '스키즈 굿즈'],
  ['세븐틴', '세븐틴 앨범'],
  ['콘서트', '콘서트 응원봉'],
  ['포토북', '아이돌 포토북'],
  ['팬미팅', '팬미팅 굿즈'],
  ['오디션', '보컬 트레이닝'],
];
```

---

## 8. 주의사항

| 항목 | 내용 |
|------|------|
| **API 키 보안** | `.env.local`에만 저장, `.gitignore` 확인 필수, 절대 커밋 금지 |
| **캐싱** | `revalidate: 3600` — 동일 키워드는 1시간 캐시 (API 호출 절약) |
| **서버 컴포넌트 전용** | `async` 컴포넌트이므로 `'use client'` 파일에서 직접 사용 불가 |
| **실패 시 null 반환** | API 오류·키 미설정 시 컴포넌트 자체가 렌더링되지 않음 (안전) |
| **광고 고지 문구** | 쿠팡 파트너스 약관상 필수 — 삭제 시 계정 정지 위험 |
| **`nofollow` 속성** | 검색엔진 가이드라인 준수 — `rel="noopener noreferrer nofollow"` 유지 |

---

## 체크리스트

- [ ] `.env.local`에 `COUPANG_ACCESS_KEY`, `COUPANG_SECRET_KEY` 추가
- [ ] `.gitignore`에 `.env.local` 포함 여부 확인
- [ ] `src/lib/coupang.ts` 생성
- [ ] `CATEGORY_KEYWORDS` / `TAG_KEYWORD_MAP` 을 프로젝트에 맞게 수정
- [ ] `src/components/CoupangBanner.tsx` 생성
- [ ] `next.config`에 쿠팡 이미지 도메인 추가
- [ ] 각 페이지에 `<CoupangBanner />` 삽입
- [ ] 광고 고지 문구 포함 확인
- [ ] `npm run dev` 로 상품이 실제로 표시되는지 확인
