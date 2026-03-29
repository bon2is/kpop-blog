import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdBanner, { SidebarAd } from '@/components/AdBanner';
import AuditionPromoCard from '@/components/AuditionPromoCard';
import CategoryArticleList from '@/components/CategoryArticleList';
import { getArticlesByCategory } from '@/lib/articles';
import { categories, getCategoryBySlug } from '@/lib/config';
import { getTagFrequency } from '@/lib/utils';
import type { ArticleSummary } from '@/types';
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

  const rawArticles = getArticlesByCategory(params.slug as Category);
  const articles: ArticleSummary[] = rawArticles.map(({ content: _c, summary: _s, commentary: _co, ...rest }) => rest);

  // BreadcrumbList structured data — Safe: all values from static config, not user input
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://kpop.andxo.com' },
      { '@type': 'ListItem', position: 2, name: 'Categories', item: 'https://kpop.andxo.com/categories' },
      { '@type': 'ListItem', position: 3, name: category.name, item: `https://kpop.andxo.com/category/${category.slug}` },
    ],
  };
  const breadcrumbLdJson = JSON.stringify(breadcrumbLd);

  // Top tags in this category
  const tagFreq = getTagFrequency(rawArticles.map((a) => a.tags));
  const topTags = Object.entries(tagFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([tag]) => tag);

  // __html is safe here: all values from static category config, not user input
  const scriptProps = { __html: breadcrumbLdJson };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={scriptProps} />
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
          {/* Audition promo card — always shown at the top of audition category */}
          {category.slug === 'audition' && <AuditionPromoCard />}

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

          {/* Popular Tags in this category */}
          {topTags.length > 0 && (
            <div className="mt-10 pt-8 border-t border-gray-100">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Popular Topics in {category.name}
              </h2>
              <div className="flex flex-wrap gap-2">
                {topTags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/tag/${tag.toLowerCase()}`}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm border transition-all hover:scale-105"
                    style={{
                      backgroundColor: `${category.color}10`,
                      color: category.color,
                      borderColor: `${category.color}30`,
                    }}
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
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
    </>
  );
}
