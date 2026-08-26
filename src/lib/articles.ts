import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Article, ArticleListItem, Category } from '@/types';
import { estimateReadingTime, tagSlug } from '@/lib/utils';

const contentDirectory = path.join(process.cwd(), 'content/posts');

// 모듈 레벨 캐시: 빌드 시 수백 개 페이지가 getAllArticles를 호출하고,
// ISR 런타임에서도 하나의 람다가 여러 페이지를 렌더링할 수 있다.
// 프로세스 수명 동안 1,452개 마크다운을 한 번만 읽어 파싱하도록 캐시한다.
let articlesCache: Article[] | null = null;

export function getAllArticles(): Article[] {
  if (articlesCache) {
    return articlesCache;
  }

  if (!fs.existsSync(contentDirectory)) {
    return [];
  }

  const files = fs.readdirSync(contentDirectory);
  const articles: Article[] = [];

  for (const file of files) {
    if (!file.endsWith('.md')) continue;

    const filePath = path.join(contentDirectory, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);

    articles.push({
      slug: file.replace('.md', ''),
      title: data.title,
      excerpt: data.excerpt,
      content: content,
      summary: data.summary,
      commentary: data.commentary,
      originalTitle: data.originalTitle,
      category: data.category as Category,
      tags: data.tags || [],
      publishedAt: data.publishedAt,
      updatedAt: data.updatedAt || data.publishedAt,
      thumbnail: data.thumbnail,
      isAIGenerated: data.isAIGenerated ?? false,
      source: data.source,
      sourceUrl: data.sourceUrl,
      author: data.author || 'KPOP Daily',
      readingTime: estimateReadingTime(content),
    });
  }

  // Sort by published date (newest first)
  articlesCache = articles.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  return articlesCache;
}

// Strip fields that list/search/browse UIs never render before serializing
// to client components. With ~2k articles this saves significant payload.
export function toListItems(articles: Article[]): ArticleListItem[] {
  return articles.map(
    ({
      content: _content,
      summary: _summary,
      commentary: _commentary,
      originalTitle: _originalTitle,
      updatedAt: _updatedAt,
      author: _author,
      ...rest
    }) => rest
  );
}

export function getArticleBySlug(slug: string): Article | undefined {  const articles = getAllArticles();
  return articles.find((article) => article.slug === slug);
}

export function getArticlesByCategory(category: Category): Article[] {
  const articles = getAllArticles();
  return articles.filter((article) => article.category === category);
}

export function getRecentArticles(count: number = 10): Article[] {
  const articles = getAllArticles();
  return articles.slice(0, count);
}

export function getRelatedArticles(article: Article, count: number = 4): Article[] {
  const articles = getAllArticles();
  const articleTagsLower = article.tags.map((t) => t.toLowerCase());

  return articles
    .filter((a) => a.slug !== article.slug)
    .map((a) => {
      const aTagsLower = a.tags.map((t) => t.toLowerCase());
      const sharedTags = aTagsLower.filter((t) => articleTagsLower.includes(t)).length;
      const sameCategory = a.category === article.category ? 1 : 0;
      return { article: a, score: sharedTags * 2 + sameCategory };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ article: a }) => a);
}

export function getAllCategories(): Category[] {
  const articles = getAllArticles();
  const categories = new Set<Category>();
  articles.forEach((article) => categories.add(article.category));
  return Array.from(categories);
}

export function getAllTags(): string[] {
  const articles = getAllArticles();
  const tags = new Set<string>();
  articles.forEach((article) => article.tags.forEach((tag) => tags.add(tag)));
  return Array.from(tags).sort();
}

// Tag pages are addressed by tagSlug(tag) — the same slug used by internal
// links, canonicals, and the sitemap. Never match raw tag names here.
export function getArticlesByTag(slug: string): Article[] {
  const articles = getAllArticles();
  return articles.filter((article) =>
    article.tags.some((tag) => tagSlug(tag) === slug.toLowerCase())
  );
}

// Reverse lookup: display name for a tag slug (most frequent casing wins).
export function getOriginalTag(slug: string): string | undefined {
  const counts: Record<string, number> = {};
  for (const article of getAllArticles()) {
    for (const tag of article.tags) {
      if (tagSlug(tag) === slug.toLowerCase()) {
        counts[tag] = (counts[tag] ?? 0) + 1;
      }
    }
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best?.[0];
}

export function getAdjacentArticles(slug: string): {
  prev: Article | null;
  next: Article | null;
} {
  const articles = getAllArticles();
  const idx = articles.findIndex((a) => a.slug === slug);
  return {
    prev: idx > 0 ? articles[idx - 1] : null,
    next: idx < articles.length - 1 ? articles[idx + 1] : null,
  };
}

// Returns tags that frequently co-occur with the given tag, sorted by co-occurrence count
export function getRelatedTags(slug: string, limit = 8): string[] {
  const articles = getAllArticles();
  const slugLower = slug.toLowerCase();
  const coCount: Record<string, number> = {};

  for (const article of articles) {
    const slugs = article.tags.map((t) => tagSlug(t));
    if (!slugs.includes(slugLower)) continue;
    for (const t of article.tags) {
      if (tagSlug(t) === slugLower) continue;
      coCount[t] = (coCount[t] ?? 0) + 1;
    }
  }

  return Object.entries(coCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([t]) => t);
}

export function searchArticles(query: string): Article[] {
  const articles = getAllArticles();
  const lowerQuery = query.toLowerCase();
  return articles.filter(
    (article) =>
      article.title.toLowerCase().includes(lowerQuery) ||
      article.excerpt.toLowerCase().includes(lowerQuery) ||
      article.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}
