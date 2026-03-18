/**
 * generate-feeds.ts
 * Generates RSS feed (feed.xml) and Google News sitemap (news-sitemap.xml)
 * in the public/ directory for the static export.
 *
 * Usage: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/generate-feeds.ts
 * Run before `next build` to include feeds in the static output.
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const SITE_URL = 'https://kpop.andxo.com';
const SITE_NAME = 'KPOP Daily';
const SITE_DESC = 'Discover K-Pop and K-Drama news with AI-curated summaries and original commentary.';
const POSTS_DIR = path.join(process.cwd(), 'content/posts');
const PUBLIC_DIR = path.join(process.cwd(), 'public');

interface ArticleMeta {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  updatedAt: string;
  category: string;
  tags: string[];
  author: string;
  thumbnail?: string;
}

function loadArticles(): ArticleMeta[] {
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));
  const articles: ArticleMeta[] = [];

  for (const file of files) {
    const filePath = path.join(POSTS_DIR, file);
    const { data } = matter(fs.readFileSync(filePath, 'utf-8'));
    articles.push({
      slug: file.replace('.md', ''),
      title: data.title || '',
      excerpt: data.excerpt || '',
      publishedAt: data.publishedAt || new Date().toISOString(),
      updatedAt: data.updatedAt || data.publishedAt || new Date().toISOString(),
      category: data.category || 'news',
      tags: data.tags || [],
      author: data.author || SITE_NAME,
      thumbnail: data.thumbnail,
    });
  }

  return articles.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateRSS(articles: ArticleMeta[]): string {
  const items = articles.slice(0, 100).map((a) => {
    const imageUrl = a.thumbnail ? `${SITE_URL}${a.thumbnail}` : null;
    const tagLines = a.tags.slice(0, 5).map((t) => `      <category>${escapeXml(t)}</category>`).join('\n');
    return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${SITE_URL}/article/${a.slug}/</link>
      <guid isPermaLink="true">${SITE_URL}/article/${a.slug}/</guid>
      <description>${escapeXml(a.excerpt)}</description>
      <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>
      <category>${escapeXml(a.category)}</category>
${tagLines}
      <author>${escapeXml(a.author)}</author>${imageUrl ? `
      <enclosure url="${imageUrl}" type="image/webp" length="0" />
      <media:content url="${imageUrl}" medium="image" />
      <media:thumbnail url="${imageUrl}" />` : ''}
    </item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESC)}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <managingEditor>hello@andxo.com (${escapeXml(SITE_NAME)})</managingEditor>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE_URL}/og-image.png</url>
      <title>${escapeXml(SITE_NAME)}</title>
      <link>${SITE_URL}</link>
    </image>
${items.join('\n')}
  </channel>
</rss>`;
}

function generateNewsSitemap(articles: ArticleMeta[]): string {
  // Google News sitemap: only articles from last 2 days
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const recentArticles = articles.filter(
    (a) => new Date(a.publishedAt) >= twoDaysAgo
  );

  const urls = recentArticles.map((a) => `  <url>
    <loc>${SITE_URL}/article/${a.slug}/</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(SITE_NAME)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${new Date(a.publishedAt).toISOString()}</news:publication_date>
      <news:title>${escapeXml(a.title)}</news:title>
      <news:keywords>${escapeXml(a.tags.join(', '))}</news:keywords>
    </news:news>
  </url>`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls.join('\n')}
</urlset>`;
}

async function pingSitemaps(): Promise<void> {
  const sitemapUrl = encodeURIComponent(`${SITE_URL}/sitemap.xml`);
  const newsSitemapUrl = encodeURIComponent(`${SITE_URL}/news-sitemap.xml`);
  const pingTargets = [
    `https://www.google.com/ping?sitemap=${sitemapUrl}`,
    `https://www.bing.com/ping?sitemap=${sitemapUrl}`,
    `https://www.google.com/ping?sitemap=${newsSitemapUrl}`,
  ];

  console.log('\nPinging search engines...');
  for (const url of pingTargets) {
    try {
      const res = await fetch(url, { method: 'GET' });
      console.log(`  ${res.ok ? '✓' : '✗'} ${url.split('?')[0]} (${res.status})`);
    } catch {
      console.log(`  ✗ Failed: ${url.split('?')[0]}`);
    }
  }
}

async function main() {
  const articles = loadArticles();
  console.log(`Loaded ${articles.length} articles.`);

  // Generate RSS feed
  const rss = generateRSS(articles);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'feed.xml'), rss, 'utf-8');
  console.log(`✓ Generated feed.xml (${articles.slice(0, 100).length} items)`);

  // Generate Google News sitemap
  const newsSitemap = generateNewsSitemap(articles);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'news-sitemap.xml'), newsSitemap, 'utf-8');
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const recentCount = articles.filter((a) => new Date(a.publishedAt) >= twoDaysAgo).length;
  console.log(`✓ Generated news-sitemap.xml (${recentCount} recent articles)`);

  // Ping search engines
  await pingSitemaps();
}

main();
