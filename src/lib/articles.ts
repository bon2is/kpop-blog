import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Article, Category } from '@/types';
import { estimateReadingTime } from '@/lib/utils';

const contentDirectory = path.join(process.cwd(), 'content/posts');

export function getAllArticles(): Article[] {
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
  return articles.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function getArticleBySlug(slug: string): Article | undefined {
  const articles = getAllArticles();
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

export function getArticlesByTag(tag: string): Article[] {
  const articles = getAllArticles();
  return articles.filter((article) =>
    article.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase())
  );
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
export function getRelatedTags(tag: string, limit = 8): string[] {
  const articles = getAllArticles();
  const tagLower = tag.toLowerCase();
  const coCount: Record<string, number> = {};

  for (const article of articles) {
    const tagsLower = article.tags.map((t) => t.toLowerCase());
    if (!tagsLower.includes(tagLower)) continue;
    for (const t of article.tags) {
      if (t.toLowerCase() === tagLower) continue;
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
