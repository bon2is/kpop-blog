import { Metadata } from 'next';
import Link from 'next/link';
import AdBanner from '@/components/AdBanner';
import ArticlesBrowser from '@/components/ArticlesBrowser';
import { getAllArticles, toListItems } from '@/lib/articles';
import { categories, siteConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: 'All K-Pop & K-Drama Articles',
  description: `Browse all K-Pop and K-Drama news articles on ${siteConfig.name}. Hundreds of articles covering comebacks, tours, awards, drama releases, and K-entertainment news.`,
  alternates: { canonical: `${siteConfig.url}/articles` },
  openGraph: {
    title: 'All K-Pop Articles | KPOP Daily',
    description: 'Browse hundreds of K-Pop and K-Drama news articles on KPOP Daily.',
    type: 'website',
    url: `${siteConfig.url}/articles`,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'KPOP Daily Articles' }],
  },
};

export default function ArticlesPage() {
  const rawArticles = getAllArticles();
  const articleCount = rawArticles.length;

  // Minimal fields only — the full list is serialized into the page payload
  const articles = toListItems(rawArticles);

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
          {articleCount} articles • Filter by category • Sorted by newest first
        </p>
      </div>

      {/* Top Ad */}
      <AdBanner className="mb-8" />

      {/* Client-side filterable + paginated article browser */}
      <ArticlesBrowser articles={articles} categories={categories} />

      {/* Bottom Ad */}
      <AdBanner className="mt-12" />
    </div>
  );
}
