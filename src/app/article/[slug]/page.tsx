import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllArticles, getArticleBySlug, getRelatedArticles } from '@/lib/articles';
import { formatDate, estimateReadingTime } from '@/lib/utils';
import { getCategoryColor } from '@/lib/config';
import AdBanner, { InArticleAd, SidebarAd, BottomBannerAd } from '@/components/AdBanner';
import { NewsletterInline, NewsletterSidebar } from '@/components/Newsletter';
import ArticleCard from '@/components/ArticleCard';
import { Clock, Calendar, ExternalLink, Share2, Sparkles, ArrowRight } from 'lucide-react';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex gap-8">
        {/* Main Article Content */}
        <article className="flex-1 min-w-0 max-w-4xl">
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

      {/* Featured Image */}
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
          {/* AI Generated badge */}
          {article.isAIGenerated && (
            <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/80 backdrop-blur-sm rounded-full text-white text-sm">
              <Sparkles className="w-4 h-4" />
              AI Generated Image
            </div>
          )}
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

      {/* Source Attribution - Prominent CTA */}
      <div className="mb-8 p-6 bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium">Original Story: </span>
              {article.originalTitle || article.title}
            </p>
            <p className="text-xs text-gray-500">
              This is our commentary on news from {article.source}. Read the full original article for complete details.
            </p>
          </div>
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-pink-600 text-white font-medium rounded-lg hover:bg-pink-700 transition-colors whitespace-nowrap"
          >
            Read Full Story
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
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
        </article>

        {/* Sidebar - Desktop Only */}
        <aside className="hidden xl:block w-80 flex-shrink-0 space-y-6">
          <NewsletterSidebar />
          <SidebarAd />
        </aside>
      </div>

      {/* Newsletter - Mobile/Tablet */}
      <div className="xl:hidden mt-8">
        <NewsletterInline />
      </div>

      {/* Related Articles - Full Width */}
      {relatedArticles.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedArticles.map((related) => (
              <ArticleCard key={related.slug} article={related} />
            ))}
          </div>
          <BottomBannerAd className="mt-8" />
        </section>
      )}
    </div>
  );
}
