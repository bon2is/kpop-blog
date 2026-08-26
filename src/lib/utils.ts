import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatDate(dateString: string): string {
  const date = parseISO(dateString);
  return format(date, 'MMMM d, yyyy');
}

export function formatRelativeDate(dateString: string): string {
  const date = parseISO(dateString);
  return formatDistanceToNow(date, { addSuffix: true });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

// Canonical URL slug for a tag. Tags like "Stray Kids", "(G)I-DLE", "BTS"
// must produce stable lowercase-hyphenated slugs used IDENTICALLY by
// generateStaticParams, internal links, canonicals, and the sitemap —
// Cloudflare Pages asset lookup is case- and space-sensitive, so any
// mismatch between the built directory name and the link URL 404s.
export function tagSlug(tag: string): string {
  return slugify(tag);
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + '...';
}

export function estimateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

export function generateExcerpt(content: string, maxLength: number = 160): string {
  // Remove markdown syntax
  const plainText = content
    .replace(/#+\s/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();

  return truncate(plainText, maxLength);
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface TocHeading {
  level: number;
  text: string;
  id: string;
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function extractHeadings(markdown: string): TocHeading[] {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const headings: TocHeading[] = [];
  let match;
  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = slugifyHeading(text);
    headings.push({ level, text, id });
  }
  return headings;
}

export function getTagFrequency(tagsList: string[][]): Record<string, number> {
  const freq: Record<string, number> = {};
  for (const tags of tagsList) {
    for (const tag of tags) {
      freq[tag] = (freq[tag] || 0) + 1;
    }
  }
  return freq;
}
