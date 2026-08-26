import { Metadata } from 'next';
import Link from 'next/link';
import CoupangBanner from '@/components/CoupangBanner';
import { siteConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: `K-Pop Official Shop Guide | ${siteConfig.name}`,
  description: 'Your complete K-Pop shopping guide. Find official merch, albums, and fashion from BTS, BLACKPINK, aespa, and more top artists.',
  alternates: { canonical: `${siteConfig.url}/shop` },
  openGraph: {
    title: 'K-Pop Official Shop Guide',
    description: 'Official merch & album shopping guide for K-Pop fans',
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
      { name: 'Weverse Shop', url: 'https://weverseshop.io', description: 'Official merch for BTS, SEVENTEEN, TXT, LE SSERAFIM, NewJeans & ENHYPEN' },
      { name: 'HYBE Merch', url: 'https://ibighit.com', description: 'BIGHIT MUSIC official store' },
    ],
    artists: ['BTS', 'SEVENTEEN', 'TXT', 'LE SSERAFIM', 'NewJeans', 'ENHYPEN', 'ILLIT'],
  },
  {
    agency: 'SM Entertainment',
    color: 'from-sky-500 to-blue-600',
    stores: [
      { name: 'SM Global Shop', url: 'https://smglobalshop.com', description: 'Official merch for EXO, NCT, aespa, Red Velvet, SHINee & RIIZE' },
      { name: 'Dear U Bubble', url: 'https://www.dearu.io', description: 'Private messaging subscription for SM artists' },
    ],
    artists: ['EXO', 'NCT', 'aespa', 'Red Velvet', 'SHINee', 'RIIZE'],
  },
  {
    agency: 'YG Entertainment',
    color: 'from-yellow-500 to-orange-500',
    stores: [
      { name: 'YG Select', url: 'https://ygselect.com', description: 'Official merch for BLACKPINK, BABYMONSTER & BIGBANG' },
    ],
    artists: ['BLACKPINK', 'BABYMONSTER'],
  },
  {
    agency: 'JYP Entertainment',
    color: 'from-red-500 to-pink-600',
    stores: [
      { name: 'JYP Shop', url: 'https://jypshop.com', description: 'Official merch for TWICE, Stray Kids, ITZY & NMIXX' },
    ],
    artists: ['TWICE', 'Stray Kids', 'ITZY', 'NMIXX', 'GOT7'],
  },
  {
    agency: 'Global Platforms',
    color: 'from-gray-600 to-gray-800',
    stores: [
      { name: 'Makestar', url: 'https://www.makestar.co', description: 'K-Pop fan platform — albums, photocards & limited edition merch' },
      { name: 'Ktown4u', url: 'https://www.ktown4u.com', description: 'Album pre-orders & photocard trading' },
      { name: 'Creatrip Shop', url: 'https://creatrip.com/en/shop', description: 'K-Pop merch & Korean travel items' },
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
    title: 'Albums & Photocards',
    description: 'Latest K-Pop albums and photocard collections',
    category: 'album',
    tags: ['BTS', 'BLACKPINK'],
    emoji: '💿',
  },
  {
    title: 'K-Pop Merch',
    description: 'Official merchandise & collaboration items',
    category: 'idol',
    tags: ['SEVENTEEN'],
    emoji: '✨',
  },
  {
    title: 'Fashion & Style',
    description: 'K-Pop idol-inspired fashion items',
    category: 'fashion',
    tags: ['aespa'],
    emoji: '👗',
  },
  {
    title: 'K-Beauty & Skincare',
    description: 'K-Beauty brands featuring K-Pop idols as ambassadors',
    category: 'lifestyle',
    tags: ['BLACKPINK'],
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
            Browse official merch, albums, and fashion from BTS, BLACKPINK, aespa, and more of your favorite K-Pop artists.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-16">
        {/* Official Store Links */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Official Agency Stores</h2>
          <p className="text-gray-500 mb-6">Shop authentic merchandise directly from each label&apos;s official store.</p>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Featured Products by Category</h2>
          <p className="text-gray-500 mb-6">Popular K-Pop items available on Coupang.</p>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Browse by Artist</h2>
          <p className="text-gray-500 mb-6">Get the latest news and merch picks for each artist.</p>
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
          Some links on this page are Coupang Partners affiliate links. We may earn a commission on qualifying purchases. Prices and availability are subject to change.
        </p>
      </div>
    </main>
  );
}
