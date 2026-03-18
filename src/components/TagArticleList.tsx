'use client';

import React, { useState } from 'react';
import ArticleCard from '@/components/ArticleCard';
import { InFeedAd } from '@/components/AdBanner';
import type { Article } from '@/types';

const PAGE_SIZE = 18;

interface Props {
  articles: Article[];
}

export function TagArticleList({ articles }: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visible = articles.slice(0, visibleCount);
  const hasMore = visibleCount < articles.length;

  return (
    <>
      {/* Featured */}
      {articles[0] && (
        <div className="mb-8">
          <ArticleCard article={articles[0]} featured />
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visible.slice(1).map((article, index) => (
          <React.Fragment key={article.slug}>
            <ArticleCard article={article} />
            {(index + 1) % 9 === 0 && index < visible.length - 2 && (
              <div className="md:col-span-2 lg:col-span-3">
                <InFeedAd className="my-2" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="mt-10 text-center">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-full hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
          >
            Load More
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <p className="mt-3 text-sm text-gray-500">
            {articles.length - visibleCount} more articles
          </p>
        </div>
      )}
    </>
  );
}
