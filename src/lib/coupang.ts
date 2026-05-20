import crypto from 'crypto';

const ACCESS_KEY = process.env.COUPANG_ACCESS_KEY ?? '';
const SECRET_KEY = process.env.COUPANG_SECRET_KEY ?? '';
const BASE_URL = 'https://api-gateway.coupang.com';

function hmacSign(method: string, path: string, query: string) {
  const datetime = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const message = `${datetime}\n${method}\n${path}\n${query}`;
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(message).digest('hex');
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

export async function searchCoupangProducts(keyword: string, limit = 4): Promise<CoupangProduct[]> {
  if (!ACCESS_KEY || !SECRET_KEY) return [];
  const path = '/v2/providers/affiliate_open_api/apis/openapi/products/search';
  // HMAC 서명에는 raw(비인코딩) query, HTTP 요청 URL에는 URL-encoded query 사용
  const rawQuery = `keyword=${keyword}&limit=${limit}&subId=`;
  const urlQuery = `keyword=${encodeURIComponent(keyword)}&limit=${limit}&subId=`;
  const { authorization } = hmacSign('GET', path, rawQuery);
  try {
    const res = await fetch(`${BASE_URL}${path}?${urlQuery}`, {
      headers: { Authorization: authorization },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json() as { data?: { productData?: CoupangProduct[] } };
    return json.data?.productData ?? [];
  } catch {
    return [];
  }
}

const CATEGORY_KEYWORDS: Record<string, string> = {
  kpop: 'K-POP 아이돌 굿즈',
  idol: 'K-POP 아이돌 굿즈',
  album: 'K-POP 앨범',
  concert: '콘서트 응원봉',
  audition: 'K-POP 보컬 트레이닝',
  entertainment: '블루레이 DVD',
  lifestyle: '생활용품',
  culture: '베스트셀러 도서',
  drama: '한국 드라마 DVD',
  fashion: '아이돌 패션',
  etc: 'K-POP 베스트',
};

const TAG_KEYWORD_MAP: Array<[string, string]> = [
  ['BTS', 'BTS 굿즈'],
  ['방탄', 'BTS 굿즈'],
  ['BLACKPINK', '블랙핑크 굿즈'],
  ['NewJeans', '뉴진스 앨범'],
  ['aespa', 'aespa 굿즈'],
  ['Stray Kids', '스키즈 굿즈'],
  ['SEVENTEEN', '세븐틴 앨범'],
  ['TXT', '투모로우바이투게더 굿즈'],
  ['IVE', 'IVE 앨범'],
  ['TWICE', '트와이스 앨범'],
  ['NCT', 'NCT 굿즈'],
  ['ENHYPEN', 'ENHYPEN 굿즈'],
  ['LE SSERAFIM', '르세라핌 앨범'],
  ['ILLIT', 'ILLIT 앨범'],
  ['(G)I-DLE', '(여자)아이들 앨범'],
  ['ATEEZ', '에이티즈 굿즈'],
  ['concert', '콘서트 응원봉'],
  ['콘서트', '콘서트 응원봉'],
  ['photobook', '아이돌 포토북'],
  ['fanmeeting', '팬미팅 굿즈'],
  ['audition', 'K-POP 보컬 트레이닝'],
  ['drama', '한국 드라마 DVD'],
  ['photocard', '아이돌 포토카드'],
  ['lightstick', '응원봉'],
];

export function getCoupangKeyword(category: string, tags: string[] = []): string {
  for (const tag of tags) {
    for (const [match, keyword] of TAG_KEYWORD_MAP) {
      if (tag.toLowerCase().includes(match.toLowerCase())) return keyword;
    }
  }
  return CATEGORY_KEYWORDS[category] ?? 'K-POP 베스트';
}
