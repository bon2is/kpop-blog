import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArticleCard from '@/components/ArticleCard';
import AdBanner, { InFeedAd } from '@/components/AdBanner';
import { getAllTags, getArticlesByTag } from '@/lib/articles';
import { Tag } from 'lucide-react';

interface TagPageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  const tags = getAllTags();
  return tags.map((tag) => ({
    slug: tag.toLowerCase(),
  }));
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const tag = decodeURIComponent(params.slug);
  const articles = getArticlesByTag(tag);

  if (articles.length === 0) {
    return { title: 'Tag Not Found' };
  }

  const tagUrl = `https://kpop.andxo.com/tag/${tag.toLowerCase()}`;
  return {
    title: `${tag} K-Pop News & Updates`,
    description: `Latest K-Pop and K-Drama news about ${tag}. ${articles.length} articles covering comebacks, tours, and more.`,
    keywords: [tag, `${tag} news`, `${tag} comeback`, `${tag} album`, `${tag} tour`, 'K-Pop', 'Kpop news'],
    alternates: { canonical: tagUrl },
    openGraph: {
      title: `${tag} K-Pop News | KPOP Daily`,
      description: `Latest ${tag} K-Pop news and updates. ${articles.length} articles.`,
      type: 'website',
      url: tagUrl,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: `${tag} – KPOP Daily` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${tag} K-Pop News | KPOP Daily`,
      description: `Latest ${tag} K-Pop news, comebacks, and updates.`,
      images: ['/og-image.png'],
    },
  };
}

export default function TagPage({ params }: TagPageProps) {
  const tag = decodeURIComponent(params.slug);
  const articles = getArticlesByTag(tag);

  if (articles.length === 0) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-100 mb-4">
          <Tag className="w-8 h-8 text-pink-500" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">#{tag}</h1>
        <p className="text-gray-600">
          {articles.length} article{articles.length !== 1 ? 's' : ''} tagged with #{tag}
        </p>
      </header>

      <AdBanner className="mb-8" />

      {articles[0] && (
        <div className="mb-8">
          <ArticleCard article={articles[0]} featured />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.slice(1, 7).map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>

      {articles.length > 7 && <InFeedAd className="my-8" />}

      {articles.length > 7 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.slice(7).map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      )}

      <AdBanner className="mt-12" />
    </div>
  );
}
