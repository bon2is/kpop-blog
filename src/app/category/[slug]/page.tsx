import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AdBanner, { SidebarAd } from '@/components/AdBanner';
import CategoryArticleList from '@/components/CategoryArticleList';
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

  const catUrl = `https://kpop.andxo.com/category/${category.slug}`;
  return {
    title: `K-Pop ${category.name} News & Updates`,
    description: `${category.description} Browse all K-Pop ${category.name.toLowerCase()} news on KPOP Daily.`,
    keywords: [`K-Pop ${category.name}`, `Kpop ${category.name.toLowerCase()}`, 'K-Pop news', 'Kpop'],
    alternates: { canonical: catUrl },
    openGraph: {
      title: `K-Pop ${category.name} News | KPOP Daily`,
      description: category.description,
      type: 'website',
      url: catUrl,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: `${category.name} – KPOP Daily` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `K-Pop ${category.name} News | KPOP Daily`,
      description: category.description,
      images: ['/og-image.png'],
    },
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
          className="inline-flex w-16 h-16 rounded-full mb-4 items-center justify-center text-3xl"
          style={{ backgroundColor: `${category.color}20` }}
        >
          {category.symbol ?? category.name.charAt(0)}
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">{category.name}</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">{category.description}</p>
        <p className="text-sm text-gray-500 mt-2">
          {articles.length} article{articles.length !== 1 ? 's' : ''}
        </p>
      </header>

      {/* Ad Banner */}
      <AdBanner className="mb-8" />

      {/* Main Content with Sidebar */}
      <div className="flex gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Articles Grid */}
          {articles.length > 0 ? (
            <CategoryArticleList articles={articles} categoryColor={category.color} />
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

        {/* Sidebar - Desktop Only */}
        <aside className="hidden xl:block w-80 flex-shrink-0">
          <SidebarAd />
        </aside>
      </div>
    </div>
  );
}
