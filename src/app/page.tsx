import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import ArticleCard from '@/components/ArticleCard';
import AdBanner, { InFeedAd, SidebarAd } from '@/components/AdBanner';
import AuditionPromoCard from '@/components/AuditionPromoCard';
import AuditionSidebarWidget from '@/components/AuditionSidebarWidget';
import { NewsletterBanner, NewsletterSidebar } from '@/components/Newsletter';
import { getAllArticles } from '@/lib/articles';
import { artists } from '@/lib/artists';
import { categories, siteConfig } from '@/lib/config';
import BreakingNewsTicker from '@/components/BreakingNewsTicker';
import TrendingSection from '@/components/TrendingSection';
import TagCloud from '@/components/TagCloud';
import ChartWidget from '@/components/ChartWidget';
import { ReadingList } from '@/components/Bookmark';

export const metadata: Metadata = {
  alternates: {
    canonical: siteConfig.url,
    types: { 'application/rss+xml': `${siteConfig.url}/feed.xml` },
  },
};

const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${siteConfig.url}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};


// Strip heavy fields before serializing article objects to client components
function slim(a: ReturnType<typeof getAllArticles>[number]) {
  const { content: _c, summary: _s, commentary: _co, ...rest } = a;
  return rest;
}

export default function HomePage() {
  const articles = getAllArticles();
  const featuredArticle = articles[0];

  // Top artists by article count (computed at build time)
  const topArtists = artists
    .map((artist) => ({
      ...artist,
      count: articles.filter((a) =>
        artist.tags.some((tag) => a.tags.some((t) => t.toLowerCase() === tag.toLowerCase()))
      ).length,
    }))
    .filter((a) => a.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  // Right column: 3 cards fills the hero height cleanly
  const heroSideArticles = articles.slice(1, 4).map(slim);
  // Main grid below hero
  const latestArticles = articles.slice(4, 10).map(slim);
  const moreArticles = articles.slice(10, 16).map(slim);
  // Slim versions for client components that receive full array
  const slimArticles = articles.map(slim);

  return (
    <div>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
      />
      {/* Breaking News Ticker */}
      <BreakingNewsTicker articles={slimArticles.slice(0, 8)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="sr-only">KPOP Daily - Your K-Pop News Source</h1>

        {/* ── Hero Section ────────────────────────────────── */}
        {featuredArticle && (
          <section className="mb-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
              {/* Left col: Featured article + Chart Widget filling the gap */}
              <div className="lg:col-span-2 flex flex-col gap-5">
                <ArticleCard article={slim(featuredArticle)} featured />
                <ChartWidget />
              </div>

              {/* Right stack */}
              <div className="flex flex-col gap-4">
                {heroSideArticles.map((article) => (
                  <ArticleCard key={article.slug} article={article} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Ad ──────────────────────────────────────────── */}
        <AdBanner className="mb-10" />

        {/* ── Category Pills ───────────────────────────────── */}
        <section className="mb-10">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-105"
                style={{
                  backgroundColor: `${category.color}18`,
                  color: category.color,
                  border: `1px solid ${category.color}30`,
                }}
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>

        {/* ── Hot Artists ──────────────────────────────────── */}
        {topArtists.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-bold text-gray-900">Popular Artists</h2>
              <Link href="/artists" className="text-pink-600 hover:text-pink-700 font-medium text-sm">
                All Artists →
              </Link>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
              {topArtists.map((artist) => (
                <Link
                  key={artist.slug}
                  href={`/artist/${artist.slug}`}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-200 overflow-hidden p-1.5 bg-white"
                    style={{
                      background: artist.brandColor
                        ? `linear-gradient(135deg, ${artist.brandColor}22, ${artist.brandColor}10)`
                        : '#F3F4F6',
                      border: artist.brandColor ? `1.5px solid ${artist.brandColor}30` : '1.5px solid #E5E7EB',
                    }}
                  >
                    {artist.logo ? (
                      <Image src={artist.logo} alt={artist.name} width={40} height={40} className="object-contain w-full h-full" unoptimized />
                    ) : (
                      artist.symbol ?? '🎵'
                    )}
                  </div>
                  <span className="text-[10px] text-gray-600 font-medium text-center leading-tight line-clamp-1 group-hover:text-pink-600 transition-colors w-full">
                    {artist.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Main Content + Sidebar ───────────────────────── */}
        <div className="flex gap-8 mb-10">
          {/* Main */}
          <div className="flex-1 min-w-0">

            {/* Latest News */}
            {latestArticles.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-2xl font-bold text-gray-900">Latest News</h2>
                  <Link href="/articles" className="text-pink-600 hover:text-pink-700 font-medium text-sm">
                    View All →
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {latestArticles.slice(0, 2).map((article) => (
                    <ArticleCard key={article.slug} article={article} />
                  ))}
                </div>
                <InFeedAd className="my-5" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {latestArticles.slice(2).map((article) => (
                    <ArticleCard key={article.slug} article={article} />
                  ))}
                </div>
              </section>
            )}

            <AdBanner className="mb-10" />

            {/* Audition promo — between Latest News and More Stories */}
            <AuditionPromoCard source="homepage_feed" />

            {/* More Stories */}
            {moreArticles.length > 0 && (
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-5">More Stories</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {moreArticles.slice(0, 4).map((article) => (
                    <ArticleCard key={article.slug} article={article} />
                  ))}
                </div>
                {moreArticles.length > 4 && (
                  <>
                    <InFeedAd className="my-5" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {moreArticles.slice(4).map((article) => (
                        <ArticleCard key={article.slug} article={article} />
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}

            {/* View All */}
            {articles.length > 16 && (
              <section className="mb-10 text-center">
                <Link
                  href="/articles"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-full hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
                >
                  View All {articles.length} Articles
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden xl:block w-80 flex-shrink-0 space-y-6">
            <ReadingList allArticles={slimArticles} />
            <TrendingSection articles={slimArticles} />
            <AuditionSidebarWidget source="homepage_sidebar" />
            <NewsletterSidebar />
            <SidebarAd />
          </aside>
        </div>

        {/* ── Tag Cloud ────────────────────────────────────── */}
        <TagCloud articles={slimArticles} />

        {/* ── Newsletter ───────────────────────────────────── */}
        <NewsletterBanner />
      </div>
    </div>
  );
}
