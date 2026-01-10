export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  summary?: string;           // Brief factual summary (new)
  commentary?: string;        // Our original analysis (new)
  originalTitle?: string;     // Original article title (new)
  category: Category;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  thumbnail?: string;
  isAIGenerated?: boolean;    // Flag for AI-generated thumbnail (new)
  source: string;
  sourceUrl: string;
  author: string;
}

export type Category =
  | 'news'
  | 'music'
  | 'drama'
  | 'celebrity'
  | 'audition'
  | 'fashion'
  | 'variety';

export interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  categories?: string[];
  creator?: string;
  enclosure?: {
    url: string;
  };
}

export interface SiteConfig {
  name: string;
  description: string;
  url: string;
  ogImage: string;
  links: {
    twitter: string;
    instagram: string;
  };
}

export interface CategoryInfo {
  name: string;
  slug: Category;
  description: string;
  color: string;
}
