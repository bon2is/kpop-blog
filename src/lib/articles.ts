import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Article, Category } from '@/types';
import { estimateReadingTime } from '@/lib/utils';
import { getArtistByTag } from '@/lib/artists';

const contentDirectory = path.join(process.cwd(), 'content/posts');

let articlesCache: Article[] | null = null;
let tagDocFreqCache: Map<string, number> | null = null;

export function getAllArticles(): Article[] {
  if (articlesCache) return articlesCache;

  if (!fs.existsSync(contentDirectory)) {
    articlesCache = [];
    return articlesCache;
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

  articles.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  articlesCache = articles;
  return articlesCache;
}

function getTagDocFrequency(): Map<string, number> {
  if (tagDocFreqCache) return tagDocFreqCache;

  const freq = new Map<string, number>();
  for (const article of getAllArticles()) {
    const seen = new Set<string>();
    for (const tag of article.tags) {
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }
  tagDocFreqCache = freq;
  return tagDocFreqCache;
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

const ARTIST_TAG_WEIGHT = 5;
const SAME_CATEGORY_WEIGHT = 1;
const RECENCY_WINDOW_DAYS = 90;
const RECENCY_BONUS = 2;

export function getRelatedArticles(article: Article, count: number = 4): Article[] {
  const articles = getAllArticles();
  const docFreq = getTagDocFrequency();
  const totalDocs = articles.length || 1;

  const sourceTags = article.tags.map((t) => t.toLowerCase());
  const sourceTagSet = new Set(sourceTags);
  const sourceArtistTags = new Set(
    sourceTags.filter((t) => getArtistByTag(t) !== undefined)
  );

  const now = Date.now();
  const recencyCutoff = now - RECENCY_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  return articles
    .filter((a) => a.slug !== article.slug)
    .map((a) => {
      let score = 0;

      for (const rawTag of a.tags) {
        const tag = rawTag.toLowerCase();
        if (!sourceTagSet.has(tag)) continue;

        if (sourceArtistTags.has(tag)) {
          score += ARTIST_TAG_WEIGHT;
        } else {
          const df = docFreq.get(tag) ?? 1;
          // IDF: log(N/df). Common tags (df near N) → ~0; rare tags → ~7+
          const idf = Math.max(0.5, Math.log(totalDocs / df));
          score += idf;
        }
      }

      if (a.category === article.category) {
        score += SAME_CATEGORY_WEIGHT;
      }

      const publishedTs = new Date(a.publishedAt).getTime();
      if (!Number.isNaN(publishedTs) && publishedTs >= recencyCutoff) {
        score += RECENCY_BONUS;
      }

      return { article: a, score };
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
