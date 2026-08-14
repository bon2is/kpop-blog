import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

interface ArticleMeta {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  category: string;
  tags: string[];
  author: string;
  thumbnail?: string;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const postsDirectory = path.join(process.cwd(), 'content/posts');
  const rawArticles: ArticleMeta[] = [];

  if (fs.existsSync(postsDirectory)) {
    const files = fs.readdirSync(postsDirectory);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const filePath = path.join(postsDirectory, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { data } = matter(fileContent);

      rawArticles.push({
        slug: file.replace(/\.md$/, ''),
        title: data.title || '',
        excerpt: data.excerpt || '',
        publishedAt: data.publishedAt || '',
        category: data.category || '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        author: data.author || 'KPOP Daily',
        thumbnail: data.thumbnail,
      });
    }
  }

  const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
  const filteredArticles = rawArticles.filter((article) => {
    const pubTime = new Date(article.publishedAt).getTime();
    return !isNaN(pubTime) && pubTime <= twelveHoursAgo;
  });

  filteredArticles.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  const top100 = filteredArticles.slice(0, 100);

  const siteUrl = 'https://kpop.andxo.com';
  const feedUrl = `${siteUrl}/api/syndication-kpop-2026`;

  const itemsXml = top100
    .map((item) => {
      const itemUrl = `${siteUrl}/article/${item.slug}/`;
      const pubDate = new Date(item.publishedAt).toUTCString();

      let thumbnailXml = '';
      if (item.thumbnail) {
        const imageUrl = item.thumbnail.startsWith('http')
          ? item.thumbnail
          : `${siteUrl}${item.thumbnail.startsWith('/') ? '' : '/'}${item.thumbnail}`;

        let mimeType = 'image/jpeg';
        if (imageUrl.endsWith('.png')) mimeType = 'image/png';
        else if (imageUrl.endsWith('.webp')) mimeType = 'image/webp';
        else if (imageUrl.endsWith('.gif')) mimeType = 'image/gif';

        thumbnailXml = `
      <enclosure url="${escapeXml(imageUrl)}" type="${mimeType}" length="0" />
      <media:content url="${escapeXml(imageUrl)}" medium="image" type="${mimeType}" />
      <media:thumbnail url="${escapeXml(imageUrl)}" />`;
      }

      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${itemUrl}</link>
      <guid isPermaLink="true">${itemUrl}</guid>
      <description>${escapeXml(item.excerpt)}</description>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(item.category)}</category>
      <author>${escapeXml(item.author)}</author>${thumbnailXml}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>KPOP Daily</title>
    <link>${siteUrl}</link>
    <description>Discover K-Pop and K-Drama news with AI-curated summaries and original commentary.</description>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
${itemsXml}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
