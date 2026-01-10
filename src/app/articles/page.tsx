import { Metadata } from 'next';
import Link from 'next/link';
import ArticleCard from '@/components/ArticleCard';
import AdBanner, { InFeedAd } from '@/components/AdBanner';
import { getAllArticles } from '@/lib/articles';
import { siteConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: 'All Articles',
  description: `Browse all K-Pop and K-Drama news articles on ${siteConfig.name}. Latest updates, comebacks, and entertainment news.`,
};

export default function ArticlesPage() {
  const articles = getAllArticles(); // Already sorted by date (newest first)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <nav className="mb-4 text-sm">
          <ol className="flex items-center space-x-2 text-gray-500">
            <li>
              <Link href="/" className="hover:text-gray-700">
                Home
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900 font-medium">All Articles</li>
          </ol>
        </nav>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          All Articles
        </h1>
        <p className="text-gray-600">
          {articles.length} articles • Sorted by newest first
        </p>
      </div>

      {/* Top Ad */}
      <AdBanner className="mb-8" />

      {/* Articles Grid */}
      <div className="space-y-8">
        {articles.map((article, index) => (
          <div key={article.slug}>
            <ArticleCard article={article} />
            {/* Insert ad every 5 articles */}
            {(index + 1) % 5 === 0 && index < articles.length - 1 && (
              <InFeedAd className="mt-8" />
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {articles.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-2xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Articles Yet</h2>
          <p className="text-gray-600">
            Check back soon for the latest K-Pop news!
          </p>
        </div>
      )}

      {/* Bottom Ad */}
      <AdBanner className="mt-12" />
    </div>
  );
}
