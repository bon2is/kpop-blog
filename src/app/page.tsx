import Link from 'next/link';
import ArticleCard from '@/components/ArticleCard';
import AdBanner, { InFeedAd, SidebarAd } from '@/components/AdBanner';
import { NewsletterBanner, NewsletterSidebar } from '@/components/Newsletter';
import { getAllArticles } from '@/lib/articles';
import { categories } from '@/lib/config';
import BreakingNewsTicker from '@/components/BreakingNewsTicker';
import TrendingSection from '@/components/TrendingSection';
import TagCloud from '@/components/TagCloud';
import ChartWidget from '@/components/ChartWidget';

export default function HomePage() {
  const articles = getAllArticles();
  const featuredArticle = articles[0];
  // Right column: 3 cards fills the hero height cleanly
  const heroSideArticles = articles.slice(1, 4);
  // Main grid below hero
  const latestArticles = articles.slice(4, 10);
  const moreArticles = articles.slice(10, 16);

  return (
    <div>
      {/* Breaking News Ticker */}
      <BreakingNewsTicker articles={articles.slice(0, 8)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="sr-only">KPOP Daily - Your K-Pop News Source</h1>

        {/* ── Hero Section ────────────────────────────────── */}
        {featuredArticle && (
          <section className="mb-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Featured — 2/3 width */}
              <div className="lg:col-span-2">
                <ArticleCard article={featuredArticle} featured />
              </div>

              {/* Right stack — 3 cards fills the height */}
              <div className="flex flex-col gap-4">
                {heroSideArticles.map((article) => (
                  <ArticleCard key={article.slug} article={article} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Chart Widget ─────────────────────────────────── */}
        <ChartWidget />

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
            <TrendingSection articles={articles} />
            <NewsletterSidebar />
            <SidebarAd />
          </aside>
        </div>

        {/* ── Tag Cloud ────────────────────────────────────── */}
        <TagCloud articles={articles} />

        {/* ── Newsletter ───────────────────────────────────── */}
        <NewsletterBanner />
      </div>
    </div>
  );
}
