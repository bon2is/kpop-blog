'use client';

import { useEffect, useState, useCallback } from 'react';
import { Eye, ThumbsUp, ThumbsDown } from 'lucide-react';
import { trackEvent } from './GoogleAnalytics';

// --- localStorage helpers ---

function getStorageItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStorageItem(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded or private browsing - silently ignore
  }
}

// --- View Counter ---

interface ViewCounterProps {
  slug: string;
  compact?: boolean; // compact mode for article cards
}

export function ViewCounter({ slug, compact = false }: ViewCounterProps) {
  const [views, setViews] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const allViews: Record<string, number> = getStorageItem('kpop_views', {});
    const currentViews = allViews[slug] || 0;
    setViews(currentViews);
  }, [slug]);

  if (!mounted) {
    return compact ? (
      <span className="flex items-center gap-1 text-xs text-gray-400">
        <Eye className="w-3 h-3" />
        <span>—</span>
      </span>
    ) : null;
  }

  if (compact) {
    return (
      <span className="flex items-center gap-1 text-xs text-gray-500">
        <Eye className="w-3 h-3" />
        <span>{views > 0 ? views.toLocaleString() : '0'}</span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-sm text-gray-500">
      <Eye className="w-4 h-4" />
      <span>{views > 0 ? views.toLocaleString() : '0'} views</span>
    </span>
  );
}

// Separate component to record the view (only on article detail page)
export function ViewRecorder({ slug }: { slug: string }) {
  useEffect(() => {
    // Record view after a short delay to avoid counting bounces
    const timer = setTimeout(() => {
      const allViews: Record<string, number> = getStorageItem('kpop_views', {});
      allViews[slug] = (allViews[slug] || 0) + 1;
      setStorageItem('kpop_views', allViews);

      // Track in GA
      trackEvent('article_view', 'engagement', slug);
    }, 1500);

    return () => clearTimeout(timer);
  }, [slug]);

  return null;
}

// --- Like / Dislike ---

type Reaction = 'like' | 'dislike' | null;

interface LikeDislikeProps {
  slug: string;
}

export function LikeDislike({ slug }: LikeDislikeProps) {
  const [counts, setCounts] = useState({ likes: 0, dislikes: 0 });
  const [userReaction, setUserReaction] = useState<Reaction>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Load counts
    const allCounts: Record<string, { likes: number; dislikes: number }> =
      getStorageItem('kpop_reactions_counts', {});
    if (allCounts[slug]) {
      setCounts(allCounts[slug]);
    }

    // Load user's reaction
    const userReactions: Record<string, Reaction> =
      getStorageItem('kpop_reactions_user', {});
    setUserReaction(userReactions[slug] || null);
  }, [slug]);

  const handleReaction = useCallback(
    (reaction: 'like' | 'dislike') => {
      const allCounts: Record<string, { likes: number; dislikes: number }> =
        getStorageItem('kpop_reactions_counts', {});
      const userReactions: Record<string, Reaction> =
        getStorageItem('kpop_reactions_user', {});

      const current = allCounts[slug] || { likes: 0, dislikes: 0 };
      const prevReaction = userReactions[slug] || null;

      if (prevReaction === reaction) {
        // Undo reaction
        if (reaction === 'like') current.likes = Math.max(0, current.likes - 1);
        else current.dislikes = Math.max(0, current.dislikes - 1);
        userReactions[slug] = null;
        setUserReaction(null);
        trackEvent('reaction_undo', 'engagement', `${slug}_${reaction}`);
      } else {
        // Undo previous reaction if exists
        if (prevReaction === 'like') current.likes = Math.max(0, current.likes - 1);
        if (prevReaction === 'dislike') current.dislikes = Math.max(0, current.dislikes - 1);

        // Apply new reaction
        if (reaction === 'like') current.likes += 1;
        else current.dislikes += 1;
        userReactions[slug] = reaction;
        setUserReaction(reaction);
        trackEvent(`article_${reaction}`, 'engagement', slug);
      }

      allCounts[slug] = current;
      setCounts({ ...current });
      setStorageItem('kpop_reactions_counts', allCounts);
      setStorageItem('kpop_reactions_user', userReactions);
    },
    [slug]
  );

  if (!mounted) {
    return (
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-400 text-sm" disabled>
          <ThumbsUp className="w-4 h-4" /> —
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-400 text-sm" disabled>
          <ThumbsDown className="w-4 h-4" /> —
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => handleReaction('like')}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
          userReaction === 'like'
            ? 'bg-pink-100 text-pink-600 ring-2 ring-pink-300'
            : 'bg-gray-100 text-gray-600 hover:bg-pink-50 hover:text-pink-500'
        }`}
        aria-label="Like this article"
      >
        <ThumbsUp className={`w-4 h-4 ${userReaction === 'like' ? 'fill-pink-600' : ''}`} />
        {counts.likes}
      </button>
      <button
        onClick={() => handleReaction('dislike')}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
          userReaction === 'dislike'
            ? 'bg-gray-300 text-gray-700 ring-2 ring-gray-400'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        aria-label="Dislike this article"
      >
        <ThumbsDown className={`w-4 h-4 ${userReaction === 'dislike' ? 'fill-gray-700' : ''}`} />
        {counts.dislikes}
      </button>
    </div>
  );
}
