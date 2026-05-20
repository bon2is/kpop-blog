import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllArticles, getArticleBySlug, getRelatedArticles, getAdjacentArticles } from '@/lib/articles';
import { getArtistByTag } from '@/lib/artists';
import { formatDate, estimateReadingTime, extractHeadings } from '@/lib/utils';
import { getCategoryColor } from '@/lib/config';
import { InArticleAd, SidebarAd, BottomBannerAd, TopBannerAd } from '@/components/AdBanner';
import AuditionPromoCard from '@/components/AuditionPromoCard';
import AuditionSidebarWidget from '@/components/AuditionSidebarWidget';
import { NewsletterInline, NewsletterSidebar } from '@/components/Newsletter';
import ArticleCard from '@/components/ArticleCard';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { Clock, Calendar, Sparkles, ArrowRight } from 'lucide-react';
import ShareButtons from '@/components/ShareButtons';
import { ViewCounter, ViewRecorder, LikeDislike } from '@/components/ArticleEngagement';
import { BookmarkButton } from '@/components/Bookmark';
import { siteConfig } from '@/lib/config';
import type { ArticleSummary } from '@/types';
import ReadingProgressBar from '@/components/ReadingProgressBar';
import TableOfContents from '@/components/TableOfContents';
import ArticleNavigation from '@/components/ArticleNavigation';
import CoupangBanner from '@/components/CoupangBanner';
import DisqusComments from '@/components/DisqusComments';

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
  // Fallback to site OG image if article has no thumbnail
  const ogImages = article.thumbnail
    ? [{ url: article.thumbnail, width: 1200, height: 630, alt: article.title }]
    : [{ url: '/og-image.png', width: 1200, height: 630, alt: article.title }];

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

  const rawRelated = getRelatedArticles(article, 4);
  const relatedArticles: ArticleSummary[] = rawRelated.map(({ content: _c, summary: _s, commentary: _co, ...rest }) => rest);
  const categoryColor = getCategoryColor(article.category);
  // Look up artist from primary tag for cross-linking
  const featuredArtist = article.tags.length > 0 ? getArtistByTag(article.tags[0]) : undefined;
  const headings = extractHeadings(article.content);
  // H2 경계에서 분할 — 섹션 사이에 인아티클 광고 삽입용
  const contentSections = article.content.split(/\n(?=## )/);
  const rawAdjacent = getAdjacentArticles(params.slug);
  const slimAdj = (a: ReturnType<typeof getRelatedArticles>[0] | null) =>
    a ? (({ content: _c, summary: _s, commentary: _co, ...rest }) => rest)(a) : null;
  const prev = slimAdj(rawAdjacent.prev);
  const next = slimAdj(rawAdjacent.next);

  // JSON-LD structured data for Google rich snippets & News
  // Safe: all values come from server-side frontmatter, not user input
  const articleImageUrl = article.thumbnail
    ? `${siteConfig.url}${article.thumbnail}`
    : `${siteConfig.url}/og-image.png`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.excerpt,
    image: [articleImageUrl],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: { '@type': 'Organization', name: article.author, url: siteConfig.url },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
      logo: {
        '@type': 'ImageObject',
        url: `${siteConfig.url}/og-image.png`,
        width: 1200,
        height: 630,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteConfig.url}/article/${article.slug}`,
    },
    keywords: article.tags.join(', '),
    articleSection: article.category.charAt(0).toUpperCase() + article.category.slice(1),
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['article h1', '.article-content p:first-of-type'],
    },
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
          {article.updatedAt !== article.publishedAt &&
            new Date(article.updatedAt).getTime() - new Date(article.publishedAt).getTime() > 86400000 && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
              Updated {formatDate(article.updatedAt)}
            </span>
          )}
          <span className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {article.readingTime ?? estimateReadingTime(article.content)} min read
          </span>
          <ViewCounter slug={article.slug} />
          <span>By {article.author}</span>
        </div>
        <ViewRecorder slug={article.slug} />
      </header>

      {/* Top banner — 헤더 직후, 히어로 이미지 전 */}
      <TopBannerAd className="mb-6" />

      {/* Featured Image */}
      {article.thumbnail && (
        <div className="relative aspect-video mb-8 rounded-xl overflow-hidden" style={{ maxHeight: '60vh' }}>
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

      {/* Article Content — H2 섹션 사이에 인아티클 광고 삽입 (최대 3개) */}
      <div className="mb-8">
        {contentSections.map((section, index) => (
          <div key={index}>
            <div className="article-content max-w-none">
              <MarkdownRenderer content={section} />
            </div>
            {index < contentSections.length - 1 && index < 3 && (
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
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Topics</h3>
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <Link
                key={tag}
                href={`/tag/${tag.toLowerCase()}`}
                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full hover:bg-pink-50 hover:text-pink-600 hover:border-pink-200 border border-transparent transition-all"
              >
                #{tag}
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
              </Link>
            ))}
          </div>
          {/* Primary artist quick link */}
          {article.tags[0] && (
            <div className="mt-3">
              <Link
                href={`/tag/${article.tags[0].toLowerCase()}`}
                className="text-sm text-pink-600 hover:text-pink-700 font-medium inline-flex items-center gap-1"
              >
                More {article.tags[0]} news
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Artist Spotlight */}
      {featuredArtist && (
        <Link
          href={`/artist/${featuredArtist.slug}`}
          className="block mb-8 p-4 rounded-xl border hover:shadow-md transition-all group"
          style={{
            background: featuredArtist.brandColor
              ? `linear-gradient(135deg, ${featuredArtist.brandColor}10, ${featuredArtist.brandColor}06)`
              : '#FAFAFA',
            borderColor: featuredArtist.brandColor ? `${featuredArtist.brandColor}25` : '#E5E7EB',
          }}
        >
          <div className="flex items-center gap-4">
            {featuredArtist.logo ? (
              <div
                className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden p-1.5 bg-white shadow-sm"
                style={{ border: featuredArtist.brandColor ? `1.5px solid ${featuredArtist.brandColor}30` : '1.5px solid #E5E7EB' }}
              >
                <Image src={featuredArtist.logo} alt={featuredArtist.name} width={44} height={44} className="object-contain w-full h-full" unoptimized />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center text-3xl bg-white shadow-sm">
                {featuredArtist.symbol ?? '🎵'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Artist Profile</p>
              <p className="font-bold text-gray-900 group-hover:text-pink-600 transition-colors">{featuredArtist.name}</p>
              {featuredArtist.agency && <p className="text-xs text-gray-500">{featuredArtist.agency}</p>}
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-pink-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* Audition promo — shown for audition/debut/trainee-related articles */}
      {(article.category === 'audition' ||
        article.tags.some((t) =>
          ['audition', 'trainee', 'debut', 'casting', 'survival show'].includes(t.toLowerCase())
        )) && (
        <AuditionPromoCard source="article_inline" />
      )}

      {/* Like/Dislike, Bookmark & Share Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-3">
          <LikeDislike slug={article.slug} />
          <BookmarkButton slug={article.slug} title={article.title} />
        </div>
        <ShareButtons
          title={article.title}
          url={`${siteConfig.url}/article/${article.slug}`}
        />
      </div>

      {/* Coupang Partners — article-category-aware product recommendations */}
      <CoupangBanner category={article.category} tags={article.tags} />

      {/* Disqus Comments */}
      <DisqusComments
        slug={article.slug}
        title={article.title}
        url={`${siteConfig.url}/article/${article.slug}`}
      />

            </article>

        {/* Sidebar - Desktop Only */}
        <aside className="hidden xl:block w-72 flex-shrink-0 space-y-6">
          <TableOfContents headings={headings} />
          <AuditionSidebarWidget source="article_sidebar" />
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
