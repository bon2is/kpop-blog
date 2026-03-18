import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllArticles, getArticleBySlug, getRelatedArticles, getAdjacentArticles } from '@/lib/articles';
import { formatDate, estimateReadingTime, extractHeadings } from '@/lib/utils';
import { getCategoryColor } from '@/lib/config';
import AdBanner, { InArticleAd, SidebarAd, BottomBannerAd } from '@/components/AdBanner';
import { NewsletterInline, NewsletterSidebar } from '@/components/Newsletter';
import ArticleCard from '@/components/ArticleCard';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { Clock, Calendar, Sparkles, ArrowRight } from 'lucide-react';
import ShareButtons from '@/components/ShareButtons';
import { ViewCounter, ViewRecorder, LikeDislike } from '@/components/ArticleEngagement';
import { siteConfig } from '@/lib/config';
import ReadingProgressBar from '@/components/ReadingProgressBar';
import TableOfContents from '@/components/TableOfContents';
import ArticleNavigation from '@/components/ArticleNavigation';

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

  const articleUrl = `${siteConfig.url}/article/${article.slug}`;
  const ogImages = article.thumbnail
    ? [{ url: article.thumbnail, width: 1200, height: 630, alt: article.title }]
    : [];

  return {
    title: article.title,
    description: article.excerpt,
    keywords: article.tags,
    alternates: { canonical: articleUrl },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
      url: articleUrl,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [article.author],
      tags: article.tags,
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt,
      images: ogImages,
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
  const headings = extractHeadings(article.content);
  const { prev, next } = getAdjacentArticles(params.slug);

  // JSON-LD structured data for Google rich snippets & News
  // Safe: all values come from server-side frontmatter, not user input
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.excerpt,
    image: article.thumbnail
      ? [`${siteConfig.url}${article.thumbnail}`]
      : [],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: { '@type': 'Organization', name: article.author, url: siteConfig.url },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteConfig.url}/article/${article.slug}`,
    },
    keywords: article.tags.join(', '),
    articleSection: article.category,
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteConfig.url },
      {
        '@type': 'ListItem',
        position: 2,
        name: article.category.charAt(0).toUpperCase() + article.category.slice(1),
        item: `${siteConfig.url}/category/${article.category}`,
      },
      { '@type': 'ListItem', position: 3, name: article.title },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <ReadingProgressBar />
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
          <ViewCounter slug={article.slug} />
          <span>By {article.author}</span>
        </div>
        <ViewRecorder slug={article.slug} />
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

      {/* Article Content with enhanced markdown rendering */}
      <div className="article-content max-w-none mb-8">
        <MarkdownRenderer content={article.content} />
      </div>

      {/* In-article ad */}
      <InArticleAd />

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

      {/* Like/Dislike & Share Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 p-4 bg-gray-50 rounded-xl">
        <LikeDislike slug={article.slug} />
        <ShareButtons
          title={article.title}
          url={`${siteConfig.url}/article/${article.slug}`}
        />
      </div>

          {/* Ad after content */}
          <AdBanner className="mb-12" />
        </article>

        {/* Sidebar - Desktop Only */}
        <aside className="hidden xl:block w-72 flex-shrink-0 space-y-6">
          <TableOfContents headings={headings} />
          <NewsletterSidebar />
          <SidebarAd />
        </aside>
      </div>

      {/* Newsletter - Mobile/Tablet */}
      <div className="xl:hidden mt-8">
        <NewsletterInline />
      </div>

      {/* Previous / Next Navigation */}
      <ArticleNavigation prev={prev} next={next} />

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
    </>
  );
}
