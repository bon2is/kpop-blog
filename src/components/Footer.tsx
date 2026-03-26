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
            <div className="flex flex-wrap gap-4 mt-4">
              <a
                href={siteConfig.links.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors text-sm"
                aria-label="Twitter/X"
              >
                Twitter/X
              </a>
              {siteConfig.links.discord && (
                <a
                  href={siteConfig.links.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-medium"
                  aria-label="Discord Community"
                >
                  💬 Discord
                </a>
              )}
              <a
                href="/feed.xml"
                className="text-gray-400 hover:text-white transition-colors text-sm"
                aria-label="RSS Feed"
              >
                RSS Feed
              </a>
            </div>

            {/* Discord community banner */}
            {siteConfig.links.discord && (
              <a
                href={siteConfig.links.discord}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                </svg>
                Join our K-Pop Community
              </a>
            )}
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
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
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
