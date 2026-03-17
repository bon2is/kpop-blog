'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Article } from '@/types';
import { BarChart3, Eye, ThumbsUp, TrendingUp, Clock } from 'lucide-react';
import { getCategoryColor } from '@/lib/config';
import { formatRelativeDate } from '@/lib/utils';

interface ChartClientProps {
  articles: Article[];
  allArticles: Article[];
}

type ChartTab = 'views' | 'likes' | 'recent';

interface ScoredArticle extends Article {
  views: number;
  likes: number;
}

export default function ChartClient({ articles, allArticles }: ChartClientProps) {
  const [tab, setTab] = useState<ChartTab>('views');
  const [scored, setScored] = useState<ScoredArticle[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const views: Record<string, number> = JSON.parse(localStorage.getItem('kpop_views') || '{}');
      const reactions: Record<string, { likes: number; dislikes: number }> = JSON.parse(
        localStorage.getItem('kpop_reactions_counts') || '{}'
      );
      const result = articles.map((a) => ({
        ...a,
        views: views[a.slug] || 0,
        likes: reactions[a.slug]?.likes || 0,
      }));
      setScored(result);
    } catch {
      setScored(articles.map((a) => ({ ...a, views: 0, likes: 0 })));
    }
  }, [articles]);

  const displayList: ScoredArticle[] = mounted
    ? [...scored].sort((a, b) => {
        if (tab === 'views') return b.views - a.views || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        if (tab === 'likes') return b.likes - a.likes || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }).slice(0, 20)
    : articles.slice(0, 20).map((a) => ({ ...a, views: 0, likes: 0 }));

  const tabs: { key: ChartTab; label: string; icon: React.ReactNode }[] = [
    { key: 'views', label: 'Most Read', icon: <Eye className="w-4 h-4" /> },
    { key: 'likes', label: 'Most Liked', icon: <ThumbsUp className="w-4 h-4" /> },
    { key: 'recent', label: 'Latest', icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <BarChart3 className="w-8 h-8 text-pink-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">K-Pop Charts</h1>
          <p className="text-gray-500 mt-0.5">Top articles ranked by your activity</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {!mounted && (
        <p className="text-sm text-gray-400 mb-4 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4" />
          Rankings are personalized based on your reading history
        </p>
      )}

      {/* Chart List */}
      <div className="space-y-3">
        {displayList.map((article, i) => {
          const color = getCategoryColor(article.category);
          const isTop3 = i < 3;
          return (
            <Link
              key={article.slug}
              href={`/article/${article.slug}`}
              className={`flex items-center gap-4 p-4 bg-white rounded-xl border transition-all hover:shadow-md ${
                isTop3 ? 'border-pink-100 hover:border-pink-200' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              {/* Rank */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${
                  i === 0
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-400 text-white'
                    : i === 1
                    ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white'
                    : i === 2
                    ? 'bg-gradient-to-br from-amber-500 to-yellow-600 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {i + 1}
              </div>

              {/* Thumbnail */}
              {article.thumbnail ? (
                <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 relative">
                  <Image src={article.thumbnail} alt={article.title} fill className="object-cover" unoptimized />
                </div>
              ) : (
                <div className="w-16 h-12 rounded-lg flex-shrink-0" style={{ background: `${color}30` }} />
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <span
                  className="text-xs font-semibold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  {article.category.toUpperCase()}
                </span>
                <p className="text-sm font-semibold text-gray-900 line-clamp-1 mt-0.5">
                  {article.title}
                </p>
                <p className="text-xs text-gray-400">{formatRelativeDate(article.publishedAt)}</p>
              </div>

              {/* Score */}
              <div className="flex-shrink-0 text-right">
                {tab === 'views' && (
                  <span className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                    <Eye className="w-3.5 h-3.5 text-gray-400" />
                    {article.views}
                  </span>
                )}
                {tab === 'likes' && (
                  <span className="flex items-center gap-1 text-sm font-semibold text-pink-600">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    {article.likes}
                  </span>
                )}
                {tab === 'recent' && (
                  <span className="text-xs text-gray-400">
                    {formatRelativeDate(article.publishedAt)}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
