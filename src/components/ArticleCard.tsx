'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Article } from '@/types';
import { formatRelativeDate, estimateReadingTime } from '@/lib/utils';
import { getCategoryColor } from '@/lib/config';
import { Clock, ExternalLink, Sparkles } from 'lucide-react';
import { ViewCounter } from './ArticleEngagement';

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
}

// Map category to CSS glow class
function getCategoryGlowClass(category: string): string {
  const map: Record<string, string> = {
    music: 'card-glow-music',
    drama: 'card-glow-drama',
    celebrity: 'card-glow-celebrity',
    fashion: 'card-glow-fashion',
  };
  return map[category] || '';
}

export default function ArticleCard({ article, featured = false }: ArticleCardProps) {
  const categoryColor = getCategoryColor(article.category);
  const glowClass = getCategoryGlowClass(article.category);

  if (featured) {
    return (
      <article className={`relative group card-hover rounded-2xl overflow-hidden bg-white shadow-lg ${glowClass}`}>
        <Link href={`/article/${article.slug}`}>
          <div className="aspect-[16/9] relative thumb-shimmer">
            {article.thumbnail ? (
              <Image
                src={article.thumbnail}
                alt={article.title}
                fill
                className="object-cover thumb-kenburns"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600" />
            )}
            {/* Sparkle particles for featured articles */}
            {article.thumbnail && (
              <>
                <span className="sparkle-badge" />
                <span className="sparkle-badge" />
                <span className="sparkle-badge" />
                <span className="sparkle-badge" />
              </>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

            {/* Image source caption — minimal */}
            {article.thumbnail && article.isAIGenerated && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/30 rounded text-white/60 text-[9px]">
                <Sparkles className="w-2 h-2" />
                AI
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3"
              style={{ backgroundColor: categoryColor }}
            >
              {article.category.toUpperCase()}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold mb-2 line-clamp-2">
              {article.title}
            </h2>
            <p className="text-gray-200 line-clamp-2 mb-3">{article.excerpt}</p>
            <div className="flex items-center text-sm text-gray-300 space-x-4">
              <span>{formatRelativeDate(article.publishedAt)}</span>
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {estimateReadingTime(article.content)} min read
              </span>
              <ViewCounter slug={article.slug} compact />
            </div>
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article className={`group card-hover rounded-xl overflow-hidden bg-white shadow-md ${glowClass}`}>
      <Link href={`/article/${article.slug}`}>
        <div className="aspect-[16/10] relative thumb-shimmer">
          {article.thumbnail ? (
            <Image
              src={article.thumbnail}
              alt={article.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              unoptimized
            />
          ) : (
            <div
              className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600"
            />
          )}
        </div>
        {/* Image source caption */}
        {article.thumbnail && (
          <div className="px-3 py-1 bg-gray-50 border-b border-gray-100">
            {article.isAIGenerated ? (
              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                <Sparkles className="w-2.5 h-2.5" />
                AI image
              </span>
            ) : (
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Image from {article.source}
              </a>
            )}
          </div>
        )}
        <div className="p-4">
          <span
            className="inline-block px-2 py-0.5 rounded text-xs font-medium mb-2"
            style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
          >
            {article.category.toUpperCase()}
          </span>
          <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-pink-600 transition-colors">
            {article.title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{article.excerpt}</p>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{formatRelativeDate(article.publishedAt)}</span>
            <div className="flex items-center gap-3">
              <ViewCounter slug={article.slug} compact />
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {estimateReadingTime(article.content)} min
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
