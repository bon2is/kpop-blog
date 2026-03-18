import Link from 'next/link';
import { categories } from '@/lib/config';

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <p className="text-7xl mb-6">🎵</p>
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Page Not Found</h1>
      <p className="text-gray-600 mb-10 text-lg">
        This page went on hiatus. Let&apos;s get you back to the K-Pop news!
      </p>

      <div className="flex flex-wrap gap-3 justify-center mb-10">
        <Link
          href="/"
          className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-full hover:from-pink-600 hover:to-purple-600 transition-all shadow-md"
        >
          ← Back to Home
        </Link>
        <Link
          href="/articles"
          className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-full hover:bg-gray-200 transition-all"
        >
          All Articles
        </Link>
        <Link
          href="/search"
          className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-full hover:bg-gray-200 transition-all"
        >
          Search
        </Link>
      </div>

      <div>
        <p className="text-sm text-gray-500 mb-4 font-medium">Browse by Category</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.slice(0, 8).map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-105"
              style={{
                backgroundColor: `${cat.color}18`,
                color: cat.color,
                border: `1px solid ${cat.color}30`,
              }}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
