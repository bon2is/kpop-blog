'use client';

import React, { useState, useMemo } from 'react';
import ArticleCard from '@/components/ArticleCard';
import { InFeedAd } from '@/components/AdBanner';
import type { ArticleListItem } from '@/types';

const PAGE_SIZE = 24;

type TimeFilter = 'all' | 'today' | 'week' | 'month';

interface Category {
  slug: string;
  name: string;
  color: string;
}

interface Props {
  articles: ArticleListItem[];
  categories: Category[];
}

const TIME_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

const DAY_MS = 86_400_000;

function withinMs(publishedAt: string, ms: number): boolean {
  return Date.now() - new Date(publishedAt).getTime() < ms;
}

export default function ArticlesBrowser({ articles, categories }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const timeFiltered = useMemo(() => {
    if (timeFilter === 'all') return articles;
    const ms = timeFilter === 'today' ? DAY_MS : timeFilter === 'week' ? 7 * DAY_MS : 30 * DAY_MS;
    return articles.filter((a) => withinMs(a.publishedAt, ms));
  }, [articles, timeFilter]);

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return timeFiltered;
    return timeFiltered.filter((a) => a.category === activeCategory);
  }, [timeFiltered, activeCategory]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  function handleCategoryChange(slug: string) {
    setActiveCategory(slug);
    setVisibleCount(PAGE_SIZE);
  }

  function handleTimeChange(t: TimeFilter) {
    setTimeFilter(t);
    setActiveCategory('all');
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <>
      {/* Time Filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TIME_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleTimeChange(opt.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              timeFilter === opt.value
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Category Filter */}
      <div className="mb-8 flex flex-wrap gap-2">
        <button
          onClick={() => handleCategoryChange('all')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            activeCategory === 'all'
              ? 'bg-pink-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({timeFiltered.length})
        </button>
        {categories.map((cat) => {
          const count = timeFiltered.filter((a) => a.category === cat.slug).length;
          if (count === 0) return null;
          const isActive = activeCategory === cat.slug;
          return (
            <button
              key={cat.slug}
              onClick={() => handleCategoryChange(cat.slug)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-105"
              style={{
                backgroundColor: isActive ? cat.color : `${cat.color}18`,
                color: isActive ? '#fff' : cat.color,
                border: `1px solid ${cat.color}${isActive ? 'ff' : '40'}`,
              }}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-6">
        Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} articles
        {(activeCategory !== 'all' || timeFilter !== 'all') && (
          <button
            onClick={() => { handleCategoryChange('all'); setTimeFilter('all'); }}
            className="ml-2 text-pink-600 hover:text-pink-700 underline"
          >
            Clear filters
          </button>
        )}
      </p>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visible.map((article, index) => (
          <React.Fragment key={article.slug}>
            <ArticleCard article={article} />
            {/* Insert ad every 12 articles */}
            {(index + 1) % 12 === 0 && index < visible.length - 1 && (
              <div className="md:col-span-2 lg:col-span-3">
                <InFeedAd />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-2xl">
          <p className="text-2xl mb-2">🔍</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No articles found</h2>
          <p className="text-gray-600">Try a different category filter.</p>
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="mt-10 text-center">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-full hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
          >
            Load More Articles
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <p className="mt-3 text-sm text-gray-500">
            {filtered.length - visibleCount} more articles remaining
          </p>
        </div>
      )}
    </>
  );
}
