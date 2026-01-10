'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import ArticleCard from '@/components/ArticleCard';
import { Search } from 'lucide-react';
import { Article } from '@/types';

interface SearchClientProps {
  articles: Article[];
}

function SearchResults({ articles }: SearchClientProps) {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  // Filter articles client-side
  const filteredArticles = useMemo(() => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    return articles.filter(
      (article) =>
        article.title.toLowerCase().includes(lowerQuery) ||
        article.excerpt.toLowerCase().includes(lowerQuery) ||
        article.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
        (article.summary && article.summary.toLowerCase().includes(lowerQuery))
    );
  }, [articles, query]);

  if (!query) {
    return (
      <div className="text-center py-20">
        <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Search Articles</h2>
        <p className="text-gray-500">Enter a search term to find articles</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Search Results for &quot;{query}&quot;
        </h1>
        <p className="text-gray-500">
          {filteredArticles.length} {filteredArticles.length === 1 ? 'article' : 'articles'} found
        </p>
      </div>

      {filteredArticles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50 rounded-2xl">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 mb-2">No Results Found</h2>
          <p className="text-gray-500 mb-6">
            We couldn&apos;t find any articles matching &quot;{query}&quot;
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
          >
            Back to Home
          </Link>
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
            <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full mx-auto"></div>
          </div>
        }
      >
        <SearchResults articles={articles} />
      </Suspense>
    </div>
  );
}
