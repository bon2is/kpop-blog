import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArticleCard from '@/components/ArticleCard';
import AdBanner from '@/components/AdBanner';
import { getArticlesByCategory } from '@/lib/articles';
import { categories, getCategoryBySlug } from '@/lib/config';
import { Category } from '@/types';

interface CategoryPageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  return categories.map((category) => ({
    slug: category.slug,
  }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const category = getCategoryBySlug(params.slug);

  if (!category) {
    return { title: 'Category Not Found' };
  }

  return {
    title: `${category.name} News`,
    description: category.description,
  };
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const category = getCategoryBySlug(params.slug);

  if (!category) {
    notFound();
  }

  const articles = getArticlesByCategory(params.slug as Category);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Category Header */}
      <header className="mb-12 text-center">
        <div
          className="inline-block w-16 h-16 rounded-full mb-4"
          style={{ backgroundColor: `${category.color}20` }}
        >
          <div
            className="w-full h-full rounded-full flex items-center justify-center text-2xl"
            style={{ color: category.color }}
          >
            {category.name.charAt(0)}
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">{category.name}</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">{category.description}</p>
        <p className="text-sm text-gray-500 mt-2">
          {articles.length} article{articles.length !== 1 ? 's' : ''}
        </p>
      </header>

      {/* Ad Banner */}
      <AdBanner className="mb-8" />

      {/* Articles Grid */}
      {articles.length > 0 ? (
        <>
          {/* Featured Article */}
          {articles[0] && (
            <div className="mb-8">
              <ArticleCard article={articles[0]} featured />
            </div>
          )}

          {/* Rest of Articles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.slice(1).map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-500">No articles in this category yet.</p>
          <p className="text-sm text-gray-400 mt-2">
            Check back soon for updates!
          </p>
        </div>
      )}

      {/* Bottom Ad */}
      <AdBanner className="mt-12" />
    </div>
  );
}
