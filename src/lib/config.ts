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
  },
  {
    name: 'Music',
    slug: 'music',
    description: 'New releases, charts, and music show performances',
    color: '#C084FC',
  },
  {
    name: 'Drama',
    slug: 'drama',
    description: 'K-Drama news, reviews, and cast updates',
    color: '#60A5FA',
  },
  {
    name: 'Celebrity',
    slug: 'celebrity',
    description: 'Idol and celebrity lifestyle, interviews, and updates',
    color: '#34D399',
  },
  {
    name: 'Audition',
    slug: 'audition',
    description: 'Audition opportunities and trainee news',
    color: '#FBBF24',
  },
  {
    name: 'Fashion',
    slug: 'fashion',
    description: 'K-Pop fashion trends and style inspiration',
    color: '#F472B6',
  },
  {
    name: 'Variety',
    slug: 'variety',
    description: 'Variety shows and entertainment programs',
    color: '#A78BFA',
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
