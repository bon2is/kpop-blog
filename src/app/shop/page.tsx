import { Metadata } from 'next';
import Link from 'next/link';
import CoupangBanner from '@/components/CoupangBanner';
import { siteConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: `K-Pop Official Shop Guide | ${siteConfig.name}`,
  description: 'K-Pop 공식 굿즈 & 앨범 쇼핑 가이드. BTS, BLACKPINK, aespa 등 아티스트별 공식 스토어 링크와 추천 상품을 모아놓았습니다.',
  openGraph: {
    title: 'K-Pop Official Shop Guide',
    description: 'K-Pop 공식 굿즈 & 앨범 쇼핑 가이드',
    url: `${siteConfig.url}/shop`,
  },
};

interface OfficialStore {
  agency: string;
  color: string;
  stores: { name: string; url: string; description: string }[];
  artists: string[];
}

const officialStores: OfficialStore[] = [
  {
    agency: 'HYBE',
    color: 'from-purple-600 to-indigo-600',
    stores: [
      { name: 'Weverse Shop', url: 'https://weverseshop.io', description: 'BTS, SEVENTEEN, TXT, LE SSERAFIM, NewJeans, ENHYPEN 공식 굿즈' },
      { name: 'HYBE Merch', url: 'https://ibighit.com', description: 'BIGHIT MUSIC 공식 스토어' },
    ],
    artists: ['BTS', 'SEVENTEEN', 'TXT', 'LE SSERAFIM', 'NewJeans', 'ENHYPEN', 'ILLIT'],
  },
  {
    agency: 'SM Entertainment',
    color: 'from-sky-500 to-blue-600',
    stores: [
      { name: 'SM Global Shop', url: 'https://smglobalshop.com', description: 'EXO, NCT, aespa, Red Velvet, SHINee, RIIZE 공식 굿즈' },
      { name: 'Dear U Bubble', url: 'https://www.dearu.io', description: 'SM 아티스트 프라이빗 메시지 구독' },
    ],
    artists: ['EXO', 'NCT', 'aespa', 'Red Velvet', 'SHINee', 'RIIZE'],
  },
  {
    agency: 'YG Entertainment',
    color: 'from-yellow-500 to-orange-500',
    stores: [
      { name: 'YG Select', url: 'https://ygselect.com', description: 'BLACKPINK, BABYMONSTER, BIGBANG 공식 굿즈' },
    ],
    artists: ['BLACKPINK', 'BABYMONSTER'],
  },
  {
    agency: 'JYP Entertainment',
    color: 'from-red-500 to-pink-600',
    stores: [
      { name: 'JYP Shop', url: 'https://jypshop.com', description: 'TWICE, Stray Kids, ITZY, NMIXX 공식 굿즈' },
    ],
    artists: ['TWICE', 'Stray Kids', 'ITZY', 'NMIXX', 'GOT7'],
  },
  {
    agency: 'Global Platforms',
    color: 'from-gray-600 to-gray-800',
    stores: [
      { name: 'Makestar', url: 'https://www.makestar.co', description: 'K-Pop 팬 플랫폼 — 앨범, 포토카드, 한정판 굿즈' },
      { name: 'Ktown4u', url: 'https://www.ktown4u.com', description: '앨범 예약 & 포토카드 트레이딩' },
      { name: 'Creatrip Shop', url: 'https://creatrip.com/en/shop', description: 'K-Pop 굿즈 & 한국 여행 아이템' },
    ],
    artists: ['ATEEZ', 'ZEROBASEONE', '(G)I-DLE', 'IVE', 'MAMAMOO'],
  },
];

interface CategorySection {
  title: string;
  description: string;
  category: string;
  tags: string[];
  emoji: string;
}

const categorySections: CategorySection[] = [
  {
    title: '앨범 & 포토카드',
    description: '최신 K-Pop 앨범과 포토카드 모음',
    category: 'music',
    tags: ['앨범', 'BTS', 'BLACKPINK'],
    emoji: '💿',
  },
  {
    title: 'K-Pop 굿즈',
    description: '공식 굿즈 & 콜라보 상품',
    category: 'fashion',
    tags: ['굿즈', 'SEVENTEEN'],
    emoji: '✨',
  },
  {
    title: '패션 & 스타일',
    description: 'K-Pop 아이돌 스타일 패션 아이템',
    category: 'fashion',
    tags: ['패션', 'aespa'],
    emoji: '👗',
  },
  {
    title: 'K-뷰티 & 스킨케어',
    description: '아이돌이 모델로 활동하는 K-뷰티 브랜드',
    category: 'beauty',
    tags: ['beauty', 'BLACKPINK'],
    emoji: '💄',
  },
];

const featuredArtists = [
  { slug: 'bts', name: 'BTS', symbol: '🪄' },
  { slug: 'blackpink', name: 'BLACKPINK', symbol: '🌹' },
  { slug: 'aespa', name: 'aespa', symbol: '⚡' },
  { slug: 'seventeen', name: 'SEVENTEEN', symbol: '💎' },
  { slug: 'twice', name: 'TWICE', symbol: '🦋' },
  { slug: 'ive', name: 'IVE', symbol: '🌟' },
  { slug: 'stray-kids', name: 'Stray Kids', symbol: '🔥' },
  { slug: 'newjeans', name: 'NewJeans', symbol: '🐇' },
  { slug: 'txt', name: 'TXT', symbol: '🌀' },
  { slug: 'le-sserafim', name: 'LE SSERAFIM', symbol: '🔥' },
  { slug: 'enhypen', name: 'ENHYPEN', symbol: '🌙' },
  { slug: 'nct', name: 'NCT', symbol: '🌐' },
];

export default function ShopPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero */}
      <section className="bg-gradient-to-r from-pink-600 to-purple-600 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">🛍️ K-Pop Official Shop</h1>
          <p className="text-lg text-pink-100 max-w-2xl mx-auto">
            BTS, BLACKPINK, aespa 등 인기 K-Pop 아티스트의 공식 굿즈, 앨범, 패션 아이템을 한눈에 확인하세요.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-16">
        {/* Official Store Links */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">공식 에이전시 스토어</h2>
          <p className="text-gray-500 mb-6">각 에이전시 공식 스토어에서 정품 굿즈를 구매하세요.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {officialStores.map((store) => (
              <div key={store.agency} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className={`bg-gradient-to-r ${store.color} p-4`}>
                  <h3 className="text-white font-bold text-lg">{store.agency}</h3>
                  <p className="text-white/80 text-sm mt-1">{store.artists.join(' · ')}</p>
                </div>
                <div className="p-4 space-y-3">
                  {store.stores.map((s) => (
                    <a
                      key={s.name}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-pink-50 transition-colors group"
                    >
                      <span className="text-2xl">🏪</span>
                      <div>
                        <p className="font-semibold text-gray-900 group-hover:text-pink-600 transition-colors">
                          {s.name} →
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">{s.description}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Coupang Affiliate Sections */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">카테고리별 추천 상품</h2>
          <p className="text-gray-500 mb-6">쿠팡에서 찾은 K-Pop 관련 인기 상품들을 소개합니다.</p>
          <div className="space-y-10">
            {categorySections.map((sec) => (
              <div key={sec.title}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{sec.emoji}</span>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{sec.title}</h3>
                    <p className="text-sm text-gray-500">{sec.description}</p>
                  </div>
                </div>
                <CoupangBanner category={sec.category} tags={sec.tags} />
              </div>
            ))}
          </div>
        </section>

        {/* Artist Quick Links */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">아티스트별 페이지</h2>
          <p className="text-gray-500 mb-6">관심 아티스트의 최신 소식과 관련 상품을 확인하세요.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {featuredArtists.map((artist) => (
              <Link
                key={artist.slug}
                href={`/artist/${artist.slug}`}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <span className="text-3xl">{artist.symbol}</span>
                <span className="text-xs font-semibold text-center text-gray-800 leading-tight">{artist.name}</span>
              </Link>
            ))}
          </div>
        </section>

        <p className="text-xs text-gray-400 text-center pb-4">
          이 페이지의 일부 링크는 쿠팡 파트너스 제휴 링크로, 구매 시 소정의 수수료를 받을 수 있습니다. 가격 및 상품 정보는 실시간 변동될 수 있습니다.
        </p>
      </div>
    </main>
  );
}
