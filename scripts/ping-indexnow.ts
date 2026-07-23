/**
 * ping-indexnow.ts
 * Notifies IndexNow-participating search engines about newly published articles.
 *
 * IndexNow covers Bing, Yahoo (Bing-powered), Naver, Yandex, Seznam.cz and Yep.
 * Submitting to one endpoint propagates to all participants.
 * Google and Daum do NOT support IndexNow — they rely on sitemap/RSS crawling.
 *
 * The key is public (hosted at /<key>.txt) — it is an ownership proof, not a secret.
 *
 * Usage: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/ping-indexnow.ts
 * Run AFTER the new articles are live in production so crawlers get a 200.
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const SITE_URL = 'https://kpop.andxo.com';
const HOST = 'kpop.andxo.com';
// Public IndexNow key — must match public/<key>.txt hosted at the site root.
const INDEXNOW_KEY = '9503870fb86376f1c923b058f50e4615';
const KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`;
const POSTS_DIR = path.join(process.cwd(), 'content/posts');
const ENDPOINT = 'https://api.indexnow.org/indexnow';

// Only submit content published within this window (proxy for "new").
const RECENT_WINDOW_DAYS = 2;

function getRecentArticleUrls(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];

  const cutoff = Date.now() - RECENT_WINDOW_DAYS * 86400000;
  const urls: string[] = [];

  for (const file of fs.readdirSync(POSTS_DIR)) {
    if (!file.endsWith('.md')) continue;
    const { data } = matter(fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8'));
    const publishedAt = data.publishedAt ? new Date(data.publishedAt).getTime() : 0;
    if (publishedAt >= cutoff) {
      // Trailing slash matches next.config trailingSlash: true (canonical URL).
      urls.push(`${SITE_URL}/article/${file.replace('.md', '')}/`);
    }
  }

  return urls;
}

async function submit(urlList: string[]): Promise<void> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: INDEXNOW_KEY, keyLocation: KEY_LOCATION, urlList }),
  });
  // IndexNow returns 200 (accepted) or 202 (accepted, pending). Others are informative.
  console.log(`  IndexNow response: ${res.status} ${res.statusText}`);
  if (!res.ok && res.status !== 202) {
    const body = await res.text().catch(() => '');
    console.log(`  ⚠️ Non-success body: ${body.slice(0, 300)}`);
  }
}

async function main() {
  // Always include the homepage — its article list changed with new posts.
  const urlList = [`${SITE_URL}/`, ...getRecentArticleUrls()];

  if (urlList.length <= 1) {
    console.log('No recent articles to submit — skipping IndexNow ping.');
    return;
  }

  console.log(`Submitting ${urlList.length} URL(s) to IndexNow (Bing, Yahoo, Naver, ...):`);
  urlList.forEach((u) => console.log(`  - ${u}`));

  try {
    await submit(urlList);
    console.log('✓ IndexNow submission complete.');
  } catch (error: unknown) {
    // Never fail the deploy pipeline over a ping — log and move on.
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(`✗ IndexNow submission failed: ${message}`);
  }
}

main();
