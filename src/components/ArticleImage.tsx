'use client';

import { ExternalLink, Image as ImageIcon } from 'lucide-react';
import { Category } from '@/types';

interface ArticleImageProps {
  category: Category;
  sourceUrl: string;
  source: string;
  title: string;
  featured?: boolean;
}

// Category gradient colors
const categoryGradients: Record<Category, string> = {
  news: 'from-rose-500 via-pink-500 to-purple-500',
  music: 'from-violet-500 via-purple-500 to-fuchsia-500',
  drama: 'from-blue-500 via-indigo-500 to-violet-500',
  celebrity: 'from-amber-400 via-orange-500 to-pink-500',
  audition: 'from-emerald-400 via-teal-500 to-cyan-500',
  fashion: 'from-pink-400 via-rose-500 to-red-500',
  variety: 'from-yellow-400 via-amber-500 to-orange-500',
  award: 'from-yellow-400 via-yellow-500 to-amber-600',
  comeback: 'from-green-400 via-emerald-500 to-teal-500',
  tour: 'from-blue-400 via-blue-500 to-indigo-500',
};

// Category icons (emoji style)
const categoryIcons: Record<Category, string> = {
  news: '📰',
  music: '🎵',
  drama: '🎬',
  celebrity: '⭐',
  audition: '🎤',
  fashion: '👗',
  variety: '🎭',
  award: '🏆',
  comeback: '🎤',
  tour: '🎪',
};

export default function ArticleImage({
  category,
  sourceUrl,
  source,
  title,
  featured = false,
}: ArticleImageProps) {
  const gradient = categoryGradients[category] || categoryGradients.news;
  const icon = categoryIcons[category] || '📰';

  return (
    <div
      className={`relative w-full bg-gradient-to-br ${gradient} ${
        featured ? 'aspect-[16/9]' : 'aspect-[16/10]'
      } rounded-lg overflow-hidden`}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, white 1px, transparent 1px),
                           radial-gradient(circle at 75% 75%, white 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }} />
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-white">
        {/* Category Icon */}
        <span className={`${featured ? 'text-6xl' : 'text-4xl'} mb-3 drop-shadow-lg`}>
          {icon}
        </span>

        {/* View Original Link */}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`
            flex items-center gap-2 px-4 py-2
            bg-white/20 backdrop-blur-sm rounded-full
            hover:bg-white/30 transition-all
            ${featured ? 'text-sm' : 'text-xs'}
          `}
        >
          <ImageIcon className={`${featured ? 'w-4 h-4' : 'w-3 h-3'}`} />
          <span>View at {source}</span>
          <ExternalLink className={`${featured ? 'w-3 h-3' : 'w-2.5 h-2.5'}`} />
        </a>
      </div>

      {/* Bottom gradient overlay for text readability */}
      {featured && (
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
      )}
    </div>
  );
}

// Smaller version for article cards
export function ArticleImageCompact({
  category,
  sourceUrl,
  source,
}: {
  category: Category;
  sourceUrl: string;
  source: string;
}) {
  const gradient = categoryGradients[category] || categoryGradients.news;
  const icon = categoryIcons[category] || '📰';

  return (
    <div className={`relative w-full h-full bg-gradient-to-br ${gradient}`}>
      {/* Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
          backgroundSize: '16px 16px',
        }} />
      </div>

      {/* Icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-5xl opacity-80">{icon}</span>
      </div>

      {/* Source badge */}
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/30 backdrop-blur-sm rounded text-white text-xs hover:bg-black/50 transition-colors"
      >
        <ExternalLink className="w-2.5 h-2.5" />
        {source}
      </a>
    </div>
  );
}
