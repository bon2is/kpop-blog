import Link from 'next/link';
import { Article } from '@/types';
import { getCategoryColor } from '@/lib/config';

interface BreakingNewsTickerProps {
  articles: Article[];
}

export default function BreakingNewsTicker({ articles }: BreakingNewsTickerProps) {
  if (articles.length === 0) return null;

  // Duplicate items so the scroll feels seamless
  const items = [...articles, ...articles];

  return (
    <div className="w-full bg-gray-900 text-white overflow-hidden h-10 flex items-center">
      <div
        className="flex-shrink-0 px-4 h-full flex items-center font-bold text-xs tracking-widest uppercase"
        style={{ background: 'linear-gradient(135deg, #FF6B9D, #C084FC)' }}
      >
        BREAKING
      </div>
      <div className="flex-1 overflow-hidden relative">
        <div className="flex gap-8 ticker-scroll whitespace-nowrap">
          {items.map((article, i) => {
            const color = getCategoryColor(article.category);
            return (
              <Link
                key={`${article.slug}-${i}`}
                href={`/article/${article.slug}`}
                className="inline-flex items-center gap-2 text-sm hover:text-pink-300 transition-colors flex-shrink-0"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                {article.title}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
