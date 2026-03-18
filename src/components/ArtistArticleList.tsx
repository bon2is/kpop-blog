'use client';

import React, { useState } from 'react';
import ArticleCard from '@/components/ArticleCard';
import { InFeedAd } from '@/components/AdBanner';
import type { Article } from '@/types';

const PAGE_SIZE = 12;

interface Props {
  articles: Article[];
  brandColor?: string;
}

export default function ArtistArticleList({ articles, brandColor }: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visible = articles.slice(0, visibleCount);
  const hasMore = visibleCount < articles.length;

  if (articles.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visible.map((article, index) => (
          <React.Fragment key={article.slug}>
            <ArticleCard article={article} />
            {(index + 1) % 9 === 0 && index < visible.length - 1 && (
              <div className="md:col-span-2 lg:col-span-3">
                <InFeedAd className="my-2" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {hasMore && (
        <div className="mt-10 text-center">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="inline-flex items-center gap-2 px-8 py-4 font-semibold rounded-full text-white transition-all shadow-lg hover:shadow-xl hover:scale-105"
            style={{
              background: brandColor
                ? `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)`
                : 'linear-gradient(135deg, #EC4899, #A855F7)',
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
