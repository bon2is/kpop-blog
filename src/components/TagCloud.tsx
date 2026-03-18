import Link from 'next/link';
import { getTagFrequency } from '@/lib/utils';
import { Article } from '@/types';
import { Hash } from 'lucide-react';

interface TagCloudProps {
  articles: Article[];
  maxTags?: number;
}

export default function TagCloud({ articles, maxTags = 30 }: TagCloudProps) {
  // Weight recent articles higher for "trending" feel
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentArticles = articles.filter(
    (a) => new Date(a.publishedAt).getTime() > thirtyDaysAgo
  );
  const sourcesForCloud = recentArticles.length >= 20 ? recentArticles : articles.slice(0, 100);
  const freq = getTagFrequency(sourcesForCloud.map((a) => a.tags));

  // Sort by frequency and take top N
  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTags);

  if (sorted.length === 0) return null;

  const maxCount = sorted[0][1];
  const minCount = sorted[sorted.length - 1][1];

  function getFontSize(count: number): string {
    if (maxCount === minCount) return 'text-sm';
    const ratio = (count - minCount) / (maxCount - minCount);
    if (ratio > 0.66) return 'text-lg font-bold';
    if (ratio > 0.33) return 'text-base font-semibold';
    return 'text-sm';
  }

  function getColor(count: number): string {
    const ratio = (count - minCount) / (maxCount - minCount + 1);
    if (ratio > 0.66) return 'text-pink-600 hover:text-pink-700';
    if (ratio > 0.33) return 'text-purple-500 hover:text-purple-600';
    return 'text-gray-500 hover:text-gray-700';
  }

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Hash className="w-6 h-6 text-purple-500" />
          <h2 className="text-2xl font-bold text-gray-900">Trending Topics</h2>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Last 30 days</span>
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-wrap gap-3">
        {sorted.map(([tag, count]) => (
          <Link
            key={tag}
            href={`/tag/${tag.toLowerCase()}`}
            className={`transition-colors ${getFontSize(count)} ${getColor(count)}`}
          >
            #{tag}
            <span className="text-xs text-gray-400 ml-0.5">({count})</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
