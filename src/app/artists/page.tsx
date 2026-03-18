import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { artists } from '@/lib/artists';
import { getAllArticles } from '@/lib/articles';
import { Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'K-Pop Artists – Groups & Soloists',
  description: 'Browse K-Pop artist profiles and their latest news on KPOP Daily. Groups, soloists, and all your favorite K-Pop idols.',
  keywords: ['K-Pop artists', 'K-Pop groups', 'K-Pop idols', 'BTS', 'BLACKPINK', 'aespa', 'IVE', 'Stray Kids', 'TWICE', 'SEVENTEEN'],
  alternates: { canonical: 'https://kpop.andxo.com/artists' },
  openGraph: {
    title: 'K-Pop Artists | KPOP Daily',
    description: 'Browse K-Pop groups, soloists and their latest coverage.',
    type: 'website',
    url: 'https://kpop.andxo.com/artists',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'K-Pop Artists – KPOP Daily' }],
  },
};

export default function ArtistsPage() {
  const articles = getAllArticles();

  const artistsWithCount = artists.map((artist) => {
    const count = articles.filter((a) =>
      artist.tags.some((tag) =>
        a.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
      )
    ).length;
    return { ...artist, count };
  }).sort((a, b) => b.count - a.count);

  const groups = artistsWithCount.filter((a) => a.type === 'group');
  const soloists = artistsWithCount.filter((a) => a.type === 'soloist');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Users className="w-8 h-8 text-pink-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Artists</h1>
          <p className="text-gray-500 mt-1">Browse artist profiles and their latest coverage</p>
        </div>
      </div>

      <section className="mb-12">
        <h2 className="text-xl font-bold text-gray-800 mb-5">Groups</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {groups.map((artist) => (
            <Link
              key={artist.slug}
              href={`/artist/${artist.slug}`}
              className="group flex flex-col items-center p-5 bg-white rounded-2xl shadow-sm hover:shadow-lg border border-gray-100 transition-all duration-200 text-center"
            >
              {/* Logo */}
              <div
                className="w-20 h-20 rounded-xl mb-3 flex items-center justify-center overflow-hidden shadow-md group-hover:scale-105 transition-transform duration-200 p-2"
                style={{
                  background: artist.brandColor
                    ? `linear-gradient(135deg, ${artist.brandColor}18, ${artist.brandColor}08)`
                    : '#F9FAFB',
                  border: artist.brandColor ? `1.5px solid ${artist.brandColor}30` : '1.5px solid #E5E7EB',
                }}
              >
                {artist.logo ? (
                  <Image
                    src={artist.logo}
                    alt={`${artist.name} logo`}
                    width={64}
                    height={64}
                    className="object-contain w-full h-full"
                    unoptimized
                  />
                ) : (
                  <span className="text-3xl">{artist.symbol ?? '🎵'}</span>
                )}
              </div>
              <p className="font-bold text-sm text-gray-900 line-clamp-1 group-hover:text-pink-600 transition-colors">
                {artist.name}
              </p>
              {artist.count > 0 ? (
                <p className="text-xs text-gray-400 mt-0.5">{artist.count} articles</p>
              ) : (
                <p className="text-xs text-gray-300 mt-0.5">No articles yet</p>
              )}
            </Link>
          ))}
        </div>
      </section>

      {soloists.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-5">Soloists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {soloists.map((artist) => (
              <Link
                key={artist.slug}
                href={`/artist/${artist.slug}`}
                className="group flex flex-col items-center p-5 bg-white rounded-2xl shadow-sm hover:shadow-lg border border-gray-100 transition-all duration-200 text-center"
              >
                <div
                  className="w-20 h-20 rounded-xl mb-3 flex items-center justify-center overflow-hidden shadow-md group-hover:scale-105 transition-transform duration-200 p-2"
                  style={{
                    background: artist.brandColor
                      ? `linear-gradient(135deg, ${artist.brandColor}18, ${artist.brandColor}08)`
                      : '#F9FAFB',
                    border: artist.brandColor ? `1.5px solid ${artist.brandColor}30` : '1.5px solid #E5E7EB',
                  }}
                >
                  {artist.logo ? (
                    <Image
                      src={artist.logo}
                      alt={`${artist.name} logo`}
                      width={64}
                      height={64}
                      className="object-contain w-full h-full"
                      unoptimized
                    />
                  ) : (
                    <span className="text-3xl">{artist.symbol ?? '🎵'}</span>
                  )}
                </div>
                <p className="font-bold text-sm text-gray-900 line-clamp-1">{artist.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{artist.count} articles</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
