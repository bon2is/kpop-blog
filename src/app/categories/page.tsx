import Link from 'next/link';
import { Metadata } from 'next';
import { categories } from '@/lib/config';
import { getArticlesByCategory } from '@/lib/articles';
import { Category } from '@/types';

export const metadata: Metadata = {
  title: 'All Categories',
  description: 'Browse all K-Pop news categories including news, music, drama, celebrity, audition, fashion, and variety.',
};

export default function CategoriesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">All Categories</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Explore K-Pop content by category. From breaking news to audition opportunities,
          find what interests you most.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => {
          const articleCount = getArticlesByCategory(category.slug as Category).length;

          return (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className="group block p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-all card-hover"
            >
              <div
                className="w-14 h-14 rounded-full mb-4 flex items-center justify-center text-xl font-bold"
                style={{
                  backgroundColor: `${category.color}20`,
                  color: category.color,
                }}
              >
                {category.name.charAt(0)}
              </div>
              <h2
                className="text-xl font-bold mb-2 group-hover:underline"
                style={{ color: category.color }}
              >
                {category.name}
              </h2>
              <p className="text-gray-600 text-sm mb-3">{category.description}</p>
              <p className="text-xs text-gray-400">
                {articleCount} article{articleCount !== 1 ? 's' : ''}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
