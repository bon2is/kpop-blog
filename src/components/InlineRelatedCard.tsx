'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import type { ArticleSummary } from '@/types';
import { getCategoryColor } from '@/lib/config';

interface InlineRelatedCardProps {
  article: ArticleSummary;
}

function trackClick(slug: string) {
  if (typeof window === 'undefined') return;
  const w = window as Window & { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag !== 'function') return;
  w.gtag('event', 'related_inline_click', {
    event_category: 'engagement',
    event_label: slug,
  });
}

export default function InlineRelatedCard({ article }: InlineRelatedCardProps) {
  const categoryColor = getCategoryColor(article.category);

  return (
    <aside
      aria-label="Recommended reading"
      className="not-prose my-10 rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50/60 via-white to-purple-50/40 p-1"
    >
      <Link
        href={`/article/${article.slug}`}
        onClick={() => trackClick(article.slug)}
        className="group flex flex-col sm:flex-row gap-4 rounded-xl bg-white p-4 hover:shadow-md transition-shadow"
      >
        {article.thumbnail && (
          <div className="relative w-full sm:w-40 aspect-[16/10] sm:aspect-square flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
            <Image
              src={article.thumbnail}
              alt={article.title}
              fill
              sizes="(max-width: 640px) 100vw, 160px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-pink-600">
              You might also like
            </span>
            <span
              className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: categoryColor }}
            >
              {article.category}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-pink-600 transition-colors">
            {article.title}
          </h3>
          {article.excerpt && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2 leading-snug">
              {article.excerpt}
            </p>
          )}
          <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-pink-600 opacity-0 group-hover:opacity-100 transition-opacity">
            Read more <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </Link>
    </aside>
  );
}
