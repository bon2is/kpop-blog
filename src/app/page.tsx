import Link from 'next/link';
import ArticleCard from '@/components/ArticleCard';
import AdBanner, { InFeedAd, SidebarAd } from '@/components/AdBanner';
import { NewsletterBanner, NewsletterSidebar } from '@/components/Newsletter';
import { getAllArticles } from '@/lib/articles';
import { categories } from '@/lib/config';

export default function HomePage() {
  const articles = getAllArticles();
  const featuredArticle = articles[0];
  const recentArticles = articles.slice(1, 7);
  const moreArticles = articles.slice(7, 13);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <section className="mb-12">
        <h1 className="sr-only">KPOP Daily - Your K-Pop News Source</h1>

        {featuredArticle ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ArticleCard article={featuredArticle} featured />
            </div>
            <div className="space-y-4">
              {recentArticles.slice(0, 2).map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl">
            <h2 className="text-3xl font-bold gradient-text mb-4">Welcome to KPOP Daily</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Your daily source for K-Pop news, music releases, drama updates, and audition information.
            </p>
            <p className="text-gray-500 mt-4">
              Articles will appear here once the news fetcher runs.
            </p>
          </div>
        )}
      </section>

      {/* Ad Banner */}
      <AdBanner className="mb-12" />

      {/* Categories Quick Links */}
      <section className="mb-12">
        <div className="flex flex-wrap gap-3 justify-center">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105"
              style={{
                backgroundColor: `${category.color}15`,
                color: category.color,
              }}
            >
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Main Content with Sidebar */}
      <div className="flex gap-8 mb-12">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Recent Articles Grid */}
          {recentArticles.length > 2 && (
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Latest News</h2>
                <Link
                  href="/category/news"
                  className="text-pink-600 hover:text-pink-700 font-medium"
                >
                  View All →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {recentArticles.slice(2, 4).map((article) => (
                  <ArticleCard key={article.slug} article={article} />
                ))}
              </div>
              {/* In-feed Ad */}
              <InFeedAd className="my-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {recentArticles.slice(4).map((article) => (
                  <ArticleCard key={article.slug} article={article} />
                ))}
              </div>
            </section>
          )}

          {/* Mid-page Ad */}
          <AdBanner className="mb-12" />

          {/* More Articles */}
          {moreArticles.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">More Stories</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {moreArticles.slice(0, 4).map((article) => (
                  <ArticleCard key={article.slug} article={article} />
                ))}
              </div>
              {moreArticles.length > 4 && (
                <>
                  <InFeedAd className="my-6" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {moreArticles.slice(4).map((article) => (
                      <ArticleCard key={article.slug} article={article} />
                    ))}
                  </div>
                </>
              )}
            </section>
          )}
        </div>

        {/* Sidebar - Desktop Only */}
        <aside className="hidden xl:block w-80 flex-shrink-0 space-y-6">
          <NewsletterSidebar />
          <SidebarAd />
        </aside>
      </div>

      {/* Newsletter Signup */}
      <NewsletterBanner />
    </div>
  );
}
