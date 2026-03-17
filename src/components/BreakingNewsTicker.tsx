'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Article } from '@/types';
import { getCategoryColor } from '@/lib/config';

interface BreakingNewsTickerProps {
  articles: Article[];
}

interface ChartItem {
  rank: number;
  title: string;
  artist: string;
  youtubeUrl: string;
}

export default function BreakingNewsTicker({ articles }: BreakingNewsTickerProps) {
  const [chartTop3, setChartTop3] = useState<ChartItem[]>([]);

  useEffect(() => {
    fetch('/data/charts.json')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.unified) setChartTop3(d.unified.slice(0, 3)); })
      .catch(() => {});
  }, []);

  if (articles.length === 0) return null;

  // Build ticker items: chart top3 first, then news articles (duplicated for seamless scroll)
  const chartItems = chartTop3.map((s) => ({ type: 'chart' as const, song: s }));
  const newsItems = articles.map((a) => ({ type: 'news' as const, article: a }));
  const allItems = [...chartItems, ...newsItems];
  const items = [...allItems, ...allItems]; // duplicate for seamless loop

  return (
    <div className="w-full bg-gray-900 text-white overflow-hidden h-10 flex items-center">
      <div
        className="flex-shrink-0 px-4 h-full flex items-center font-bold text-xs tracking-widest uppercase"
        style={{ background: 'linear-gradient(135deg, #FF6B9D, #C084FC)' }}
      >
        LIVE
      </div>
      <div className="flex-1 overflow-hidden relative">
        <div className="flex gap-8 ticker-scroll whitespace-nowrap">
          {items.map((item, i) => {
            if (item.type === 'chart') {
              return (
                <a
                  key={`chart-${item.song.rank}-${i}`}
                  href={item.song.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm hover:text-pink-300 transition-colors flex-shrink-0"
                >
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-pink-500/30 text-pink-300">
                    #{item.song.rank} CHART
                  </span>
                  <span className="font-semibold">{item.song.title}</span>
                  <span className="text-gray-400 text-xs">— {item.song.artist}</span>
                </a>
              );
            }
            const color = getCategoryColor(item.article.category);
            return (
              <Link
                key={`news-${item.article.slug}-${i}`}
                href={`/article/${item.article.slug}`}
                className="inline-flex items-center gap-2 text-sm hover:text-pink-300 transition-colors flex-shrink-0"
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                {item.article.title}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
