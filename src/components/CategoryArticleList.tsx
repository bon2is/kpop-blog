'use client';

import { useState } from 'react';
import ArticleCard from '@/components/ArticleCard';
import { InFeedAd } from '@/components/AdBanner';
import type { Article } from '@/types';

const PAGE_SIZE = 12;

interface Props {
  articles: Article[];
  categoryColor: string;
}

export default function CategoryArticleList({ articles, categoryColor }: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visible = articles.slice(0, visibleCount);
  const hasMore = visibleCount < articles.length;

  return (
    <>
      {/* Featured Article */}
      {articles[0] && (
        <div className="mb-8">
          <ArticleCard article={articles[0]} featured />
        </div>
      )}

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {visible.slice(1).map((article, index) => (
          <>
            <ArticleCard key={article.slug} article={article} />
            {(index + 1) % 6 === 0 && index < visible.length - 2 && (
              <div key={`ad-${index}`} className="md:col-span-2">
                <InFeedAd className="my-2" />
              </div>
            )}
          </>
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="mt-10 text-center">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="inline-flex items-center gap-2 px-8 py-4 font-semibold rounded-full text-white transition-all shadow-lg hover:shadow-xl"
            style={{
              background: `linear-gradient(135deg, ${categoryColor}, ${categoryColor}cc)`,
            }}
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
