'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { ArticleListItem } from '@/types';
import { TrendingUp } from 'lucide-react';
import { getCategoryColor } from '@/lib/config';

interface TrendingSectionProps {
  articles: ArticleListItem[];
}

interface ArticleWithViews extends ArticleListItem {
  views: number;
}

export default function TrendingSection({ articles }: TrendingSectionProps) {
  const [trending, setTrending] = useState<ArticleWithViews[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem('kpop_views');
      const viewMap: Record<string, number> = raw ? JSON.parse(raw) : {};

      const withViews = articles
        .map((a) => ({ ...a, views: viewMap[a.slug] || 0 }))
        .sort((a, b) => b.views - a.views || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, 5);

      setTrending(withViews);
    } catch {
      setTrending(articles.slice(0, 5).map((a) => ({ ...a, views: 0 })));
    }
  }, [articles]);

  // Server-side: show most recent 5 as fallback
  const fallback = articles.slice(0, 5);

  const displayList = mounted ? trending : fallback;

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-6 h-6 text-pink-500" />
        <h2 className="text-2xl font-bold text-gray-900">Trending Now</h2>
        {mounted && <span className="text-xs text-gray-400 ml-auto">Based on your reads</span>}
      </div>
      <div className="space-y-3">
        {displayList.map((article, i) => {
          const color = getCategoryColor(article.category);
          return (
            <Link
              key={article.slug}
              href={`/article/${article.slug}`}
              className="flex items-center gap-4 p-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-all group"
            >
              {/* Rank number */}
              <span
                className="text-2xl font-black w-8 text-center flex-shrink-0"
                style={{ color: i === 0 ? '#FF6B9D' : i === 1 ? '#C084FC' : i === 2 ? '#60A5FA' : '#D1D5DB' }}
              >
                {i + 1}
              </span>
              {/* Thumbnail */}
              {article.thumbnail ? (
                <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 relative">
                  <Image
                    src={article.thumbnail}
                    alt={article.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div
                  className="w-16 h-12 rounded-lg flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${color}30, ${color}60)` }}
                />
              )}
              {/* Title + meta */}
              <div className="flex-1 min-w-0">
                <span
                  className="text-xs font-semibold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  {article.category.toUpperCase()}
                </span>
                <p className="text-sm font-semibold text-gray-900 line-clamp-1 mt-0.5 group-hover:text-pink-600 transition-colors">
                  {article.title}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
