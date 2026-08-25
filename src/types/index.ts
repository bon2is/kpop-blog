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
  readingTime?: number;       // Pre-computed reading time in minutes
}

export type Category =
  | 'news'
  | 'music'
  | 'drama'
  | 'celebrity'
  | 'audition'
  | 'fashion'
  | 'variety'
  | 'award'
  | 'comeback'
  | 'tour';

export interface Artist {
  slug: string;
  name: string;
  type: 'group' | 'soloist';
  agency?: string;
  debut?: string;
  members?: string[];
  description?: string;
  tags: string[]; // tags used in articles for this artist
  symbol?: string;       // emoji or unicode symbol representing the group
  brandColor?: string;   // primary brand/concept color (hex)
  logo?: string;         // path to official logo image (e.g. /images/artists/bts.svg)
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    youtube?: string;
  };
}

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
    discord?: string;
  };
}

// Lightweight article type for client components (excludes heavy content fields)
export type ArticleSummary = Omit<Article, 'content' | 'summary' | 'commentary'>;

// Minimal list-item shape serialized to client bundles. Excludes fields that
// list/search/browse UIs never render (originalTitle, updatedAt, author) —
// with ~2k articles these add hundreds of KB of flight payload per page.
export type ArticleListItem = Pick<
  Article,
  | 'slug'
  | 'title'
  | 'excerpt'
  | 'category'
  | 'tags'
  | 'publishedAt'
  | 'thumbnail'
  | 'readingTime'
  | 'source'
  | 'sourceUrl'
  | 'isAIGenerated'
>;

export interface CategoryInfo {
  name: string;
  slug: Category;
  description: string;
  color: string;
  symbol?: string;
}
