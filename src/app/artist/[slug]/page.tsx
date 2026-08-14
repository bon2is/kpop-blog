import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getArtistBySlug, getAllArtistSlugs, artists } from '@/lib/artists';
import { getAllArticles } from '@/lib/articles';
import ArtistArticleList from '@/components/ArtistArticleList';
import type { ArticleSummary } from '@/types';
import { Calendar, Building2, Users, Newspaper } from 'lucide-react';

interface ArtistPageProps {
  params: { slug: string };
}

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllArtistSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: ArtistPageProps): Promise<Metadata> {
  const artist = getArtistBySlug(params.slug);
  if (!artist) return { title: 'Artist Not Found' };
  const artistUrl = `https://kpop.andxo.com/artist/${artist.slug}`;
  return {
    title: `${artist.name} K-Pop News, Comebacks & Updates`,
    description: `Latest ${artist.name} news, comebacks, albums, concerts and more. Follow all ${artist.name} updates on KPOP Daily.`,
    keywords: [artist.name, ...artist.tags, `${artist.name} news`, `${artist.name} comeback`, `${artist.name} album`, 'K-Pop'],
    alternates: { canonical: artistUrl },
    openGraph: {
      title: `${artist.name} | KPOP Daily`,
      description: artist.description,
      type: 'website',
      url: artistUrl,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: `${artist.name} – KPOP Daily` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${artist.name} News | KPOP Daily`,
      description: `Latest ${artist.name} news, comebacks, and updates.`,
      images: ['/og-image.png'],
    },
  };
}

export default function ArtistPage({ params }: ArtistPageProps) {
  const artist = getArtistBySlug(params.slug);
  if (!artist) notFound();

  const allArticles = getAllArticles();
  const rawArtistArticles = allArticles.filter((a) =>
    artist.tags.some((tag) =>
      a.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
    )
  );
  const artistArticles: ArticleSummary[] = rawArtistArticles.map(({ content: _c, summary: _s, commentary: _co, ...rest }) => rest);

  // Related artists: same agency, or share at least one article tag
  const articleTags = new Set(rawArtistArticles.flatMap((a) => a.tags.map((t) => t.toLowerCase())));
  const relatedArtists = artists
    .filter((a) => a.slug !== artist.slug)
    .map((a) => {
      let score = 0;
      if (a.agency && a.agency === artist.agency) score += 3;
      if (a.tags.some((t) => articleTags.has(t.toLowerCase()))) score += 1;
      return { artist: a, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ artist: a }) => a);

  const headerBg = artist.brandColor
    ? `linear-gradient(135deg, ${artist.brandColor}12, ${artist.brandColor}06)`
    : '#FAFAFA';
  const headerBorder = artist.brandColor ? `${artist.brandColor}25` : '#E5E7EB';

  // Schema.org MusicGroup / MusicArtist structured data for Google Knowledge Panel
  // Safe: all values sourced from server-side artists.ts data, not user input
  const artistLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': artist.type === 'group' ? 'MusicGroup' : 'MusicArtist',
    name: artist.name,
    url: `https://kpop.andxo.com/artist/${artist.slug}`,
    ...(artist.description ? { description: artist.description } : {}),
    ...(artist.debut ? { foundingDate: artist.debut.slice(0, 4) } : {}),
    ...(artist.agency ? { foundingLocation: { '@type': 'Organization', name: artist.agency } } : {}),
    ...(artist.members && artist.members.length > 0
      ? { member: artist.members.map((m) => ({ '@type': 'Person', name: m })) }
      : {}),
    ...(artist.logo ? { image: `https://kpop.andxo.com${artist.logo}` } : {}),
    sameAs: [
      artist.socialLinks?.twitter,
      artist.socialLinks?.instagram,
      artist.socialLinks?.youtube,
    ].filter(Boolean),
  };
  const artistLdJson = JSON.stringify(artistLd);
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://kpop.andxo.com' },
      { '@type': 'ListItem', position: 2, name: 'Artists', item: 'https://kpop.andxo.com/artists' },
      { '@type': 'ListItem', position: 3, name: artist.name, item: `https://kpop.andxo.com/artist/${artist.slug}` },
    ],
  };
  // __html is safe: all values from static artists.ts, not user input
  const breadcrumbProps = { __html: JSON.stringify(breadcrumbLd) };
  const artistLdProps = { __html: artistLdJson };

  return (
    <>
      {/* JSON-LD: Safe — data comes from static artists.ts, not user input */}
      <script type="application/ld+json" dangerouslySetInnerHTML={artistLdProps} />
      <script type="application/ld+json" dangerouslySetInnerHTML={breadcrumbProps} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500">
        <ol className="flex items-center gap-2">
          <li><Link href="/" className="hover:text-gray-700">Home</Link></li>
          <li>/</li>
          <li><Link href="/artists" className="hover:text-gray-700">Artists</Link></li>
          <li>/</li>
          <li className="text-gray-900 font-medium">{artist.name}</li>
        </ol>
      </nav>

      {/* Artist Header */}
      <div
        className="rounded-2xl shadow-sm border p-6 mb-8"
        style={{ background: headerBg, borderColor: headerBorder }}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Logo */}
          <div
            className="w-28 h-28 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden p-3 bg-white shadow"
            style={{
              border: artist.brandColor ? `2px solid ${artist.brandColor}30` : '2px solid #E5E7EB',
              boxShadow: artist.brandColor ? `0 8px 24px ${artist.brandColor}22` : undefined,
            }}
          >
            {artist.logo ? (
              <Image
                src={artist.logo}
                alt={`${artist.name} logo`}
                width={88}
                height={88}
                className="object-contain w-full h-full"
                unoptimized
              />
            ) : (
              <span className="text-5xl">{artist.symbol ?? artist.name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{artist.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-700 capitalize">
                {artist.type}
              </span>
            </div>

            {artist.description && (
              <p className="text-gray-600 mb-4 max-w-2xl">{artist.description}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-gray-500 justify-center sm:justify-start">
              {artist.agency && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  {artist.agency}
                </span>
              )}
              {artist.debut && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  Debut: {new Date(artist.debut).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Newspaper className="w-4 h-4" />
                {artistArticles.length} articles
              </span>
            </div>
          </div>
        </div>

        {/* Members */}
        {artist.members && artist.members.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Members</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {artist.members.map((member) => (
                <span
                  key={member}
                  className="px-3 py-1 rounded-full text-sm bg-white text-gray-700 shadow-sm"
                  style={{ border: artist.brandColor ? `1px solid ${artist.brandColor}30` : '1px solid #E5E7EB' }}
                >
                  {member}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Articles */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Latest News
          <span className="ml-2 text-base font-normal text-gray-400">({artistArticles.length})</span>
        </h2>

        {artistArticles.length > 0 ? (
          <ArtistArticleList articles={artistArticles} brandColor={artist.brandColor} />
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-2xl">
            <Newspaper className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No articles found yet for {artist.name}.</p>
          </div>
        )}
      </section>

      {/* Related Artists */}
      {relatedArtists.length > 0 && (
        <section className="mt-12 pt-8 border-t border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-5">
            {artist.agency ? `More from ${artist.agency.split(' /')[0]}` : 'Related Artists'}
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {relatedArtists.map((rel) => (
              <Link
                key={rel.slug}
                href={`/artist/${rel.slug}`}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden p-2 bg-white shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all"
                  style={{
                    border: rel.brandColor ? `1.5px solid ${rel.brandColor}30` : '1.5px solid #E5E7EB',
                    background: rel.brandColor
                      ? `linear-gradient(135deg, ${rel.brandColor}18, ${rel.brandColor}08)`
                      : '#F9FAFB',
                  }}
                >
                  {rel.logo ? (
                    <Image src={rel.logo} alt={rel.name} width={44} height={44} className="object-contain w-full h-full" unoptimized />
                  ) : (
                    <span className="text-2xl">{rel.symbol ?? '🎵'}</span>
                  )}
                </div>
                <span className="text-xs text-gray-600 font-medium text-center line-clamp-1 group-hover:text-pink-600 transition-colors w-full">
                  {rel.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
    </>
  );
}
