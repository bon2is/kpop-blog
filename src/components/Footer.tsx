import Link from 'next/link';
import { siteConfig, categories } from '@/lib/config';

const TOP_ARTISTS = [
  { name: 'BTS', slug: 'bts' },
  { name: 'BLACKPINK', slug: 'blackpink' },
  { name: 'aespa', slug: 'aespa' },
  { name: 'IVE', slug: 'ive' },
  { name: 'Stray Kids', slug: 'stray-kids' },
  { name: 'SEVENTEEN', slug: 'seventeen' },
  { name: 'TWICE', slug: 'twice' },
  { name: 'NewJeans', slug: 'newjeans' },
];

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="text-2xl font-bold text-white">
              KPOP Daily
            </Link>
            <p className="mt-3 text-gray-400 text-sm max-w-xs">
              AI-curated K-Pop and K-Drama news with original commentary. Updated 4× daily.
            </p>
            {/* Social links */}
            <div className="flex gap-4 mt-4">
              <a
                href={siteConfig.links.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors text-sm"
                aria-label="Twitter/X"
              >
                Twitter/X
              </a>
              <a
                href="/feed.xml"
                className="text-gray-400 hover:text-white transition-colors text-sm"
                aria-label="RSS Feed"
              >
                RSS Feed
              </a>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Categories</h3>
            <ul className="space-y-2 text-sm">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/category/${category.slug}`}
                    className="hover:text-white transition-colors"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Artists & Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Artists</h3>
            <ul className="space-y-2 text-sm mb-6">
              {TOP_ARTISTS.map((artist) => (
                <li key={artist.slug}>
                  <Link
                    href={`/artist/${artist.slug}`}
                    className="hover:text-white transition-colors"
                  >
                    {artist.name}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Explore</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/chart" className="hover:text-white transition-colors">K-Pop Charts</Link></li>
              <li><Link href="/artists" className="hover:text-white transition-colors">All Artists</Link></li>
              <li><Link href="/articles" className="hover:text-white transition-colors">All Articles</Link></li>
              <li><Link href="/search" className="hover:text-white transition-colors">Search</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-gray-500 text-center md:text-left text-sm">
              <p>&copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
              <p className="mt-1 text-xs">
                Summaries and commentary by KPOP Daily. Original reporting credited to sources.
              </p>
            </div>
            <div className="flex gap-6 text-sm text-gray-500">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <a href="/sitemap.xml" className="hover:text-white transition-colors">
                Sitemap
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
