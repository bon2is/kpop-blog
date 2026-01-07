import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllArticles, getArticleBySlug, getRelatedArticles } from '@/lib/articles';
import { formatDate, estimateReadingTime } from '@/lib/utils';
import { getCategoryColor } from '@/lib/config';
import AdBanner, { InArticleAd } from '@/components/AdBanner';
import ArticleCard from '@/components/ArticleCard';
import { Clock, Calendar, ExternalLink, Share2 } from 'lucide-react';

interface ArticlePageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  const articles = getAllArticles();
  return articles.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const article = getArticleBySlug(params.slug);

  if (!article) {
    return { title: 'Article Not Found' };
  }

  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [article.author],
      images: article.thumbnail ? [article.thumbnail] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt,
      images: article.thumbnail ? [article.thumbnail] : [],
    },
  };
}

export default function ArticlePage({ params }: ArticlePageProps) {
  const article = getArticleBySlug(params.slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = getRelatedArticles(article, 4);
  const categoryColor = getCategoryColor(article.category);

  // Convert markdown-like content to HTML paragraphs
  const contentParagraphs = article.content
    .split('\n\n')
    .filter((p) => p.trim())
    .map((p) => p.trim());

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center space-x-2 text-gray-500">
          <li>
            <Link href="/" className="hover:text-gray-700">
              Home
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link
              href={`/category/${article.category}`}
              className="hover:text-gray-700"
              style={{ color: categoryColor }}
            >
              {article.category.charAt(0).toUpperCase() + article.category.slice(1)}
            </Link>
          </li>
        </ol>
      </nav>

      {/* Article Header */}
      <header className="mb-8">
        <span
          className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4"
          style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
        >
          {article.category.toUpperCase()}
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          {article.title}
        </h1>
        <p className="text-xl text-gray-600 mb-6">{article.excerpt}</p>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            {formatDate(article.publishedAt)}
          </span>
          <span className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {estimateReadingTime(article.content)} min read
          </span>
          <span>By {article.author}</span>
        </div>
      </header>

      {/* Featured Image - AI Generated */}
      {article.thumbnail && (
        <div className="relative aspect-video mb-8 rounded-xl overflow-hidden">
          <Image
            src={article.thumbnail}
            alt={article.title}
            fill
            className="object-cover"
            unoptimized
            priority
          />
          {/* Source badge */}
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm hover:bg-black/70 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Original at {article.source}
          </a>
        </div>
      )}

      {/* Ad before content */}
      <AdBanner className="mb-8" />

      {/* Article Content with mid-article ad */}
      <div className="article-content text-gray-700 mb-8">
        {contentParagraphs.map((paragraph, index) => (
          <div key={index}>
            <p>{paragraph}</p>
            {/* Insert ad after 2nd paragraph */}
            {index === 1 && contentParagraphs.length > 3 && (
              <InArticleAd />
            )}
          </div>
        ))}
      </div>

      {/* Source Attribution */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Source: </span>
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-600 hover:text-pink-700 inline-flex items-center"
          >
            {article.source}
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          This article has been rewritten by AI. Visit the original source for the full story.
        </p>
      </div>

      {/* Tags */}
      {article.tags.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <Link
                key={tag}
                href={`/tag/${tag.toLowerCase()}`}
                className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full hover:bg-gray-200 transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Share Buttons */}
      <div className="mb-8 flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">Share:</span>
        <div className="flex gap-2">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(`https://kpop.andxo.com/article/${article.slug}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
          >
            <Share2 className="w-4 h-4 text-gray-600" />
          </a>
        </div>
      </div>

      {/* Ad after content */}
      <AdBanner className="mb-12" />

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {relatedArticles.map((related) => (
              <ArticleCard key={related.slug} article={related} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
