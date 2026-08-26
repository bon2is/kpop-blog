import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import AdBanner from '@/components/AdBanner';
import { TagArticleList } from '@/components/TagArticleList';
import { getArticlesByTag, getRelatedTags, getAllTags, getOriginalTag } from '@/lib/articles';
import { tagSlug } from '@/lib/utils';
import type { ArticleSummary } from '@/types';
import { getArtistByTag } from '@/lib/artists';
import { Tag, Building2, Calendar, Newspaper } from 'lucide-react';
import { siteConfig } from '@/lib/config';

interface TagPageProps {
  params: { slug: string };
}

// static export: 전체 태그 페이지를 빌드 타임에 생성한다(온디맨드 렌더 없음).
// 슬러그는 tagSlug()로 정규화 — 링크·캐노니컬·sitemap과 반드시 동일한 규칙.
export const dynamicParams = false;

export async function generateStaticParams() {
  const seen = new Map<string, string>();
  for (const tag of getAllTags()) {
    const slug = tagSlug(tag);
    if (!seen.has(slug)) seen.set(slug, slug);
  }
  return Array.from(seen.keys()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug).toLowerCase();
  const tag = getOriginalTag(slug);
  const articles = getArticlesByTag(slug);

  if (!tag || articles.length === 0) {
    return { title: 'Tag Not Found' };
  }

  const tagUrl = `${siteConfig.url}/tag/${slug}`;
  // Thin content: noindex tags with fewer than 3 articles to protect crawl budget
  const isIndexable = articles.length >= 3;
  return {
    title: `${tag} K-Pop News & Updates`,
    description: `Latest K-Pop and K-Drama news about ${tag}. ${articles.length} articles covering comebacks, tours, and more.`,
    keywords: [tag, `${tag} news`, `${tag} comeback`, `${tag} album`, `${tag} tour`, 'K-Pop', 'Kpop news'],
    alternates: { canonical: tagUrl },
    ...(isIndexable ? {} : {
      robots: { index: false, follow: true },
    }),
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
  const slug = decodeURIComponent(params.slug).toLowerCase();
  const tag = getOriginalTag(slug);
  const rawArticles = getArticlesByTag(slug);

  if (!tag || rawArticles.length === 0) {
    notFound();
  }

  const articles: ArticleSummary[] = rawArticles.map(({ content: _c, summary: _s, commentary: _co, ...rest }) => rest);

  // Check if this tag matches a known artist
  const artist = getArtistByTag(tag);
  const relatedTags = getRelatedTags(slug, 8);

  // BreadcrumbList JSON-LD: Safe — tag is a URL slug from our own static generated tags
  const tagBreadcrumbJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteConfig.url },
      { '@type': 'ListItem', position: 2, name: `#${tag}`, item: `${siteConfig.url}/tag/${slug}` },
    ],
  });
  const tagBreadcrumbProps = { __html: tagBreadcrumbJson };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={tagBreadcrumbProps} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm text-gray-500">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-gray-700">Home</Link></li>
            <li>/</li>
            <li className="text-gray-900 font-medium">#{tag}</li>
          </ol>
        </nav>

        <div className="flex items-center gap-3 mb-2">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-pink-100">
            <Tag className="w-5 h-5 text-pink-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">#{tag}</h1>
        </div>
        <p className="text-gray-600 ml-13">
          {articles.length} article{articles.length !== 1 ? 's' : ''}
        </p>
      </header>

      {/* Artist Card (if tag matches a known artist) */}
      {artist && (
        <Link
          href={`/artist/${artist.slug}`}
          className="block mb-8 p-5 rounded-2xl border hover:shadow-md transition-all group"
          style={{
            background: artist.brandColor
              ? `linear-gradient(135deg, ${artist.brandColor}10, ${artist.brandColor}06)`
              : '#FAFAFA',
            borderColor: artist.brandColor ? `${artist.brandColor}25` : '#E5E7EB',
          }}
        >
          <div className="flex items-center gap-4">
            {/* Logo / Symbol */}
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden p-2 bg-white shadow-sm"
              style={{
                border: artist.brandColor ? `1.5px solid ${artist.brandColor}30` : '1.5px solid #E5E7EB',
              }}
            >
              {artist.logo ? (
                <Image
                  src={artist.logo}
                  alt={`${artist.name} logo`}
                  width={48}
                  height={48}
                  className="object-contain w-full h-full"
                  unoptimized
                />
              ) : (
                <span className="text-3xl">{artist.symbol ?? '🎵'}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold text-gray-900 text-lg group-hover:text-pink-600 transition-colors">
                  {artist.name}
                </p>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-700 capitalize">
                  {artist.type}
                </span>
              </div>
              <p className="text-sm text-gray-500 line-clamp-2">{artist.description}</p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                {artist.agency && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />{artist.agency}
                  </span>
                )}
                {artist.debut && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Debut {new Date(artist.debut).getFullYear()}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Newspaper className="w-3 h-3" />{articles.length} articles
                </span>
              </div>
            </div>

            <span className="text-pink-500 font-medium text-sm whitespace-nowrap hidden sm:block group-hover:translate-x-1 transition-transform">
              Artist Profile →
            </span>
          </div>
        </Link>
      )}

      <AdBanner className="mb-8" />

      {/* Articles with Load More */}
      <TagArticleList articles={articles} />

      {/* Related Tags */}
      {relatedTags.length > 0 && (
        <div className="mt-12 pt-8 border-t border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Related Topics</h2>
          <div className="flex flex-wrap gap-2">
            {relatedTags.map((relTag) => (
              <Link
                key={relTag}
                href={`/tag/${tagSlug(relTag)}`}
                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-pink-50 hover:text-pink-600 border border-transparent hover:border-pink-200 transition-all"
              >
                #{relTag}
              </Link>
            ))}
          </div>
        </div>
      )}

      <AdBanner className="mt-12" />
    </div>
    </>
  );
}
