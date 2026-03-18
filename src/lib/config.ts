import { SiteConfig, CategoryInfo, Category } from '@/types';

export const siteConfig: SiteConfig = {
  name: 'KPOP Daily',
  description: 'Discover K-Pop and K-Drama news with AI-curated summaries and original commentary. We highlight the latest stories with unique insights and beautiful AI artwork—always linking to original sources for the full story.',
  url: 'https://kpop.andxo.com',
  ogImage: '/og-image.png',
  links: {
    twitter: 'https://twitter.com/kpopdaily',
    instagram: 'https://instagram.com/kpopdaily',
  },
};

export const categories: CategoryInfo[] = [
  {
    name: 'News',
    slug: 'news',
    description: 'Breaking news and updates from the K-Pop industry',
    color: '#FF6B9D',
    symbol: '📰',
  },
  {
    name: 'Music',
    slug: 'music',
    description: 'New releases, charts, and music show performances',
    color: '#C084FC',
    symbol: '🎵',
  },
  {
    name: 'Drama',
    slug: 'drama',
    description: 'K-Drama news, reviews, and cast updates',
    color: '#60A5FA',
    symbol: '🎬',
  },
  {
    name: 'Celebrity',
    slug: 'celebrity',
    description: 'Idol and celebrity lifestyle, interviews, and updates',
    color: '#34D399',
    symbol: '⭐',
  },
  {
    name: 'Audition',
    slug: 'audition',
    description: 'Audition opportunities and trainee news',
    color: '#FBBF24',
    symbol: '🎤',
  },
  {
    name: 'Fashion',
    slug: 'fashion',
    description: 'K-Pop fashion trends and style inspiration',
    color: '#F472B6',
    symbol: '👗',
  },
  {
    name: 'Variety',
    slug: 'variety',
    description: 'Variety shows and entertainment programs',
    color: '#A78BFA',
    symbol: '🎭',
  },
  {
    name: 'Award',
    slug: 'award',
    description: 'Award shows, ceremonies, and nominations',
    color: '#F59E0B',
    symbol: '🏆',
  },
  {
    name: 'Comeback',
    slug: 'comeback',
    description: 'New releases, comebacks, and album drops',
    color: '#10B981',
    symbol: '🔥',
  },
  {
    name: 'Tour',
    slug: 'tour',
    description: 'Concert tours, fan meetings, and live events',
    color: '#3B82F6',
    symbol: '🎪',
  },
];

export const RSS_SOURCES = [
  {
    name: 'Soompi',
    url: 'https://www.soompi.com/feed',
    enabled: true,
  },
  {
    name: 'Koreaboo',
    url: 'https://www.koreaboo.com/feed/',
    enabled: true,
  },
  {
    name: 'Korea Herald',
    url: 'https://www.koreaherald.com/rss/020200000000.xml',
    enabled: true,
  },
];

export function getCategoryBySlug(slug: string): CategoryInfo | undefined {
  return categories.find((cat) => cat.slug === slug);
}

export function getCategoryColor(category: Category): string {
  const cat = categories.find((c) => c.slug === category);
  return cat?.color || '#FF6B9D';
}
