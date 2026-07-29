/**
 * post-social.ts
 * Combined social media posting script.
 * Runs Twitter and Pinterest auto-posting sequentially.
 *
 * Usage: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/post-social.ts
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { TwitterApi } from 'twitter-api-v2';

// ── Config ──
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpop.andxo.com';
const CONTENT_DIR = path.join(process.cwd(), 'content/posts');

// ── Twitter Config ──
const TWITTER_APP_KEY = process.env.TWITTER_APP_KEY;
const TWITTER_APP_SECRET = process.env.TWITTER_APP_SECRET;
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN;
const TWITTER_ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET;

// ── Pinterest Config ──
const PINTEREST_ACCESS_TOKEN = process.env.PINTEREST_ACCESS_TOKEN;
const PINTEREST_BOARD_ID = process.env.PINTEREST_BOARD_ID;

const TWITTER_POSTED_FILE = path.join(process.cwd(), 'content/.twitter-posted.json');
const PINTEREST_POSTED_FILE = path.join(process.cwd(), 'content/.pinterest-posted.json');

interface ArticleMeta {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  publishedAt: string;
  thumbnail?: string;
}

interface PostedRecord {
  slugs: string[];
  lastUpdated: string;
}

function loadPostedSlugs(filePath: string): Set<string> {
  try {
    if (fs.existsSync(filePath)) {
      const data: PostedRecord = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return new Set(data.slugs || []);
    }
  } catch {
    // ignore
  }
  return new Set();
}

function savePostedSlugs(filePath: string, slugs: Set<string>): void {
  const data: PostedRecord = {
    slugs: Array.from(slugs),
    lastUpdated: new Date().toISOString(),
  };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getRecentArticles(): ArticleMeta[] {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const articles: ArticleMeta[] = [];

  try {
    const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const { data } = matter(fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8'));
      const publishedAt = new Date(data.publishedAt);
      if (publishedAt >= oneDayAgo) {
        articles.push({
          slug: file.replace('.md', ''),
          title: data.title || '',
          excerpt: data.excerpt || '',
          category: data.category || 'news',
          tags: data.tags || [],
          publishedAt: data.publishedAt,
          thumbnail: data.thumbnail,
        });
      }
    }
    articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  } catch (error) {
    console.error('Error reading articles:', error);
  }
  return articles;
}

// ── Twitter ──
async function postToTwitter(): Promise<void> {
  console.log('\n=== TWITTER ===');
  if (!TWITTER_APP_KEY || !TWITTER_APP_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
    console.log('Twitter credentials not configured. Skipping.');
    return;
  }

  const client = new TwitterApi({
    appKey: TWITTER_APP_KEY,
    appSecret: TWITTER_APP_SECRET,
    accessToken: TWITTER_ACCESS_TOKEN,
    accessSecret: TWITTER_ACCESS_SECRET,
  });

  const postedSlugs = loadPostedSlugs(TWITTER_POSTED_FILE);
  const articles = getRecentArticles().filter((a) => !postedSlugs.has(a.slug));
  console.log(`New articles to tweet: ${articles.length}`);

  let count = 0;
  for (const article of articles) {
    const url = `${SITE_URL}/article/${article.slug}`;
    const text = `🔥 ${article.title.slice(0, 220)}\n\n${url}\n\n#KPOP #KPOPDaily`;
    try {
      const result = await client.v2.tweet(text);
      if (result.data?.id) {
        console.log(`  ✓ Tweeted: ${result.data.id}`);
        postedSlugs.add(article.slug);
        count++;
      }
    } catch (error: any) {
      console.error(`  ✗ Tweet failed: ${error?.message || error}`);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }

  savePostedSlugs(TWITTER_POSTED_FILE, postedSlugs);
  console.log(`Tweeted ${count} articles.`);
}

// ── Pinterest ──
async function postToPinterest(): Promise<void> {
  console.log('\n=== PINTEREST ===');
  if (!PINTEREST_ACCESS_TOKEN || !PINTEREST_BOARD_ID) {
    console.log('Pinterest credentials not configured. Skipping.');
    return;
  }

  const postedSlugs = loadPostedSlugs(PINTEREST_POSTED_FILE);
  const articles = getRecentArticles()
    .filter((a) => !postedSlugs.has(a.slug) && a.thumbnail);
  console.log(`New articles to pin: ${articles.length}`);

  let count = 0;
  for (const article of articles.slice(0, 3)) {
    const articleUrl = `${SITE_URL}/article/${article.slug}/`;
    const imageUrl = `${SITE_URL}${article.thumbnail}`;
    try {
      const response = await fetch('https://api.pinterest.com/v5/pins', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PINTEREST_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          board_id: PINTEREST_BOARD_ID,
          title: article.title.slice(0, 100),
          description: `${article.excerpt}\n\n#KPOPDaily #KPOP`,
          link: articleUrl,
          media_source: { source_type: 'image_url', url: imageUrl },
        }),
      });
      const data = await response.json();
      if (data.id) {
        console.log(`  ✓ Pin created: ${data.id}`);
        postedSlugs.add(article.slug);
        count++;
      } else {
        console.error(`  ✗ Pin failed:`, JSON.stringify(data));
      }
    } catch (error) {
      console.error(`  ✗ Pin error:`, error);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  savePostedSlugs(PINTEREST_POSTED_FILE, postedSlugs);
  console.log(`Pinned ${count} articles.`);
}

async function main(): Promise<void> {
  console.log('=== SOCIAL MEDIA AUTO-POSTING ===');
  console.log(`Time: ${new Date().toISOString()}`);

  await postToTwitter();
  await postToPinterest();

  console.log('\n=== SOCIAL POSTING COMPLETE ===');
}

main().catch(console.error);
