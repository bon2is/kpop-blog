'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import ArticleCard from '@/components/ArticleCard';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { ArticleSummary } from '@/types';
import type { Category } from '@/types';
import { categories } from '@/lib/config';

const SEARCH_PAGE_SIZE = 24;

interface SearchClientProps {
  articles: ArticleSummary[];
}

type SortOption = 'relevance' | 'newest' | 'oldest';

function SearchResults({ articles }: SearchClientProps) {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(SEARCH_PAGE_SIZE);

  // Reset visible count whenever query/filters change
  useEffect(() => { setVisibleCount(SEARCH_PAGE_SIZE); }, [query, selectedCategory, sortBy]);

  const filteredArticles = useMemo(() => {
    let results = articles;

    // Text search with relevance scoring
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      const withScore = results.map((a) => {
        let score = 0;
        const titleL = a.title.toLowerCase();
        const excerptL = a.excerpt.toLowerCase();
        // Exact title match
        if (titleL === lowerQuery) score += 100;
        // Title starts with query
        else if (titleL.startsWith(lowerQuery)) score += 50;
        // Title contains query
        else if (titleL.includes(lowerQuery)) score += 30;
        // Tag exact match
        if (a.tags.some((t) => t.toLowerCase() === lowerQuery)) score += 40;
        // Tag contains query
        else if (a.tags.some((t) => t.toLowerCase().includes(lowerQuery))) score += 20;
        // Excerpt contains query
        if (excerptL.includes(lowerQuery)) score += 10;
        return { article: a, score };
      });

      results = withScore
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ article }) => article);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      results = results.filter((a) => a.category === selectedCategory);
    }

    // Sort (overrides relevance if explicitly chosen)
    if (sortBy === 'newest') {
      results = [...results].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    } else if (sortBy === 'oldest') {
      results = [...results].sort(
        (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
      );
    }

    return results;
  }, [articles, query, selectedCategory, sortBy]);

  const activeFilterCount = (selectedCategory !== 'all' ? 1 : 0) + (sortBy !== 'relevance' ? 1 : 0);

  if (!query) {
    return (
      <div className="text-center py-20">
        <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Search Articles</h2>
        <p className="text-gray-500">Enter a search term to find articles</p>
        <div className="mt-8 flex flex-wrap gap-2 justify-center">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105"
              style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          Results for &quot;{query}&quot;
        </h1>
        <p className="text-gray-500">
          {filteredArticles.length} {filteredArticles.length === 1 ? 'article' : 'articles'} found
        </p>
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
            showFilters || activeFilterCount > 0
              ? 'bg-pink-50 border-pink-300 text-pink-700'
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-pink-600 text-white text-xs flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Active filter chips */}
        {selectedCategory !== 'all' && (
          <button
            onClick={() => setSelectedCategory('all')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-pink-100 text-pink-700"
          >
            {categories.find((c) => c.slug === selectedCategory)?.name}
            <X className="w-3 h-3" />
          </button>
        )}
        {sortBy !== 'relevance' && (
          <button
            onClick={() => setSortBy('relevance')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-purple-100 text-purple-700"
          >
            {sortBy === 'newest' ? 'Newest first' : 'Oldest first'}
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {showFilters && (
        <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Category</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => setSelectedCategory(cat.slug as Category)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                  style={
                    selectedCategory === cat.slug
                      ? { backgroundColor: cat.color, color: 'white' }
                      : { backgroundColor: `${cat.color}20`, color: cat.color }
                  }
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Sort by</p>
            <div className="flex gap-2">
              {(['relevance', 'newest', 'oldest'] as SortOption[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setSortBy(opt)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${
                    sortBy === opt
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt === 'relevance' ? 'Relevance' : opt === 'newest' ? 'Newest first' : 'Oldest first'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {filteredArticles.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.slice(0, visibleCount).map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
          {visibleCount < filteredArticles.length && (
            <div className="mt-10 text-center">
              <button
                onClick={() => setVisibleCount((c) => c + SEARCH_PAGE_SIZE)}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-full hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
              >
                Show More Results
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <p className="mt-3 text-sm text-gray-500">
                {filteredArticles.length - visibleCount} more results
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 bg-gray-50 rounded-2xl">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 mb-2">No Results Found</h2>
          <p className="text-gray-500 mb-6">
            No articles match &quot;{query}&quot;{selectedCategory !== 'all' ? ` in ${selectedCategory}` : ''}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            {selectedCategory !== 'all' && (
              <button
                onClick={() => setSelectedCategory('all')}
                className="px-5 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-colors"
              >
                Clear category filter
              </button>
            )}
            <Link
              href="/"
              className="inline-block px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

export default function SearchClient({ articles }: SearchClientProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Suspense
        fallback={
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full mx-auto" />
          </div>
        }
      >
        <SearchResults articles={articles} />
      </Suspense>
    </div>
  );
}
