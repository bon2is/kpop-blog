/**
 * post-reddit.ts
 * Posts top K-Pop articles to relevant Reddit communities.
 *
 * Strategy:
 * - Post max 2 articles per run (avoid spam detection)
 * - Target subreddits matched by category/artist
 * - Respect each subreddit's rules (flair, title format, etc.)
 * - Skip already-posted articles
 *
 * Reddit API setup:
 * 1. Go to https://www.reddit.com/prefs/apps
 * 2. Create app → "script" type
 * 3. Note client_id (under app name) and client_secret
 * 4. Set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD in .env
 *
 * Usage: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/post-reddit.ts
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { withUtm } from './lib/social-url';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpop.andxo.com';
const CONTENT_DIR = path.join(process.cwd(), 'content/posts');
const POSTED_FILE = path.join(process.cwd(), 'content/.reddit-posted.json');

const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const REDDIT_USERNAME = process.env.REDDIT_USERNAME;
const REDDIT_PASSWORD = process.env.REDDIT_PASSWORD;
const USER_AGENT = `KpopDailyBot/1.0 by /u/${REDDIT_USERNAME}`;

// Max articles to post per run (keep low to avoid spam detection)
const MAX_POSTS_PER_RUN = 2;

interface ArticleMeta {
  slug: string;
  title: string;
  excerpt: string;
  summary: string;
  category: string;
  tags: string[];
  publishedAt: string;
  thumbnail?: string;
}

// --- Subreddit routing ---
// Each subreddit entry: name, flair (null = no flair needed), title prefix rule
interface SubredditTarget {
  subreddit: string;
  flair?: string;       // flair_id or flair text (depends on sub)
  flairText?: string;   // human-readable flair for logging
  titlePrefix?: string; // some subs require "[MV]", "[News]" etc.
}

// Artist → dedicated fandom subreddit
const ARTIST_SUBREDDITS: Record<string, SubredditTarget> = {
  'bts':         { subreddit: 'bangtan',      flairText: 'News' },
  'blackpink':   { subreddit: 'BLACKPINK',    flairText: 'News' },
  'twice':       { subreddit: 'twice',        flairText: 'News' },
  'aespa':       { subreddit: 'aespa',        flairText: 'News' },
  'ive':         { subreddit: 'IVE_kpop',     flairText: 'News' },
  'newjeans':    { subreddit: 'NewJeans',     flairText: 'News' },
  'stray kids':  { subreddit: 'straykids',    flairText: 'News' },
  'seventeen':   { subreddit: 'seventeen',    flairText: 'News' },
  'nct':         { subreddit: 'NCT',          flairText: 'News' },
  'enhypen':     { subreddit: 'enhypen',      flairText: 'News' },
  'txt':         { subreddit: 'TomorrowByTogether', flairText: 'News' },
  'le sserafim': { subreddit: 'LESSERAFIM',   flairText: 'News' },
  'itzy':        { subreddit: 'itzy',         flairText: 'News' },
  'ateez':       { subreddit: 'ATEEZ',        flairText: 'News' },
  'red velvet':  { subreddit: 'red_velvet',   flairText: 'News' },
  'exo':         { subreddit: 'exo',          flairText: 'News' },
  'bigbang':     { subreddit: 'bigbang',      flairText: 'News' },
  'riize':       { subreddit: 'RIIZE',        flairText: 'News' },
};

// Category fallback subreddits
const CATEGORY_SUBREDDITS: Record<string, SubredditTarget> = {
  music:     { subreddit: 'kpop',   flairText: 'News' },
  drama:     { subreddit: 'kdrama', flairText: 'News' },
  celebrity: { subreddit: 'kpop',   flairText: 'News' },
  news:      { subreddit: 'kpop',   flairText: 'News' },
  audition:  { subreddit: 'kpop',   flairText: 'News' },
  fashion:   { subreddit: 'kpop',   flairText: 'News' },
  variety:   { subreddit: 'koreanvariety', flairText: 'Discussion' },
};

function getTargetSubreddit(article: ArticleMeta): SubredditTarget {
  const titleLower = article.title.toLowerCase();
  const tagsLower = article.tags.map(t => t.toLowerCase());

  for (const [artist, target] of Object.entries(ARTIST_SUBREDDITS)) {
    if (titleLower.includes(artist) || tagsLower.some(t => t.includes(artist))) {
      return target;
    }
  }

  return CATEGORY_SUBREDDITS[article.category] ?? { subreddit: 'kpop', flairText: 'News' };
}

// --- Scoring (same logic as post-threads.ts) ---
const HIGH_INTEREST_ARTISTS = [
  'bts', 'blackpink', 'twice', 'aespa', 'ive', 'newjeans', 'stray kids',
  'seventeen', 'nct', 'exo', 'bigbang', 'red velvet', 'txt', 'enhypen',
  'le sserafim', 'itzy', 'ateez', 'riize',
  'jungkook', 'jennie', 'lisa', 'jimin',
];
const HOOK_KEYWORDS = [
  'dating', 'relationship', 'married', 'wedding', 'break up', 'comeback',
  'new album', 'mv', 'music video', 'world tour', 'controversy', 'backlash',
  'reveals', 'shocking', 'breaks record', 'million', 'confirmed',
];

function scoreArticle(article: ArticleMeta): number {
  const titleLower = article.title.toLowerCase();
  const tagsLower = article.tags.map(t => t.toLowerCase());
  let score = 0;
  for (const artist of HIGH_INTEREST_ARTISTS) {
    if (titleLower.includes(artist) || tagsLower.some(t => t.includes(artist))) score += 30;
  }
  for (const kw of HOOK_KEYWORDS) {
    if (titleLower.includes(kw)) score += 20;
  }
  if (article.thumbnail) score += 10;
  if (article.category === 'music' || article.category === 'drama') score += 5;
  return score;
}

// --- Persistence ---
function loadPostedSlugs(): Set<string> {
  try {
    if (fs.existsSync(POSTED_FILE)) {
      const data = JSON.parse(fs.readFileSync(POSTED_FILE, 'utf-8'));
      return new Set(data.slugs || []);
    }
  } catch { /* ignore */ }
  return new Set();
}

function savePostedSlugs(slugs: Set<string>): void {
  fs.writeFileSync(POSTED_FILE, JSON.stringify({ slugs: Array.from(slugs), lastUpdated: new Date().toISOString() }, null, 2));
}

// --- Article loading ---
function getTopArticles(topN: number): ArticleMeta[] {
  const articles: ArticleMeta[] = [];
  const now = new Date();
  // Look back 48h (news sitemap window) for more candidates
  const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const { data } = matter(fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8'));
    if (new Date(data.publishedAt) >= cutoff) {
      articles.push({
        slug: file.replace('.md', ''),
        title: data.title,
        excerpt: data.excerpt,
        summary: data.summary,
        category: data.category,
        tags: data.tags || [],
        publishedAt: data.publishedAt,
        thumbnail: data.thumbnail,
      });
    }
  }

  return articles
    .sort((a, b) => scoreArticle(b) - scoreArticle(a))
    .slice(0, topN);
}

// --- Reddit API ---
async function getAccessToken(): Promise<string | null> {
  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET || !REDDIT_USERNAME || !REDDIT_PASSWORD) {
    console.error('Missing Reddit credentials. Set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD in .env');
    return null;
  }

  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({
      grant_type: 'password',
      username: REDDIT_USERNAME,
      password: REDDIT_PASSWORD,
    }),
  });

  const data = await res.json() as { access_token?: string; error?: string };
  if (data.access_token) {
    console.log('Reddit auth: OK');
    return data.access_token;
  }
  console.error('Reddit auth failed:', data.error);
  return null;
}

async function submitLink(
  token: string,
  subreddit: string,
  title: string,
  url: string,
  flairText?: string,
): Promise<boolean> {
  const body: Record<string, string> = {
    api_type: 'json',
    kind: 'link',
    sr: subreddit,
    title,
    url,
    resubmit: 'false',
    nsfw: 'false',
    spoiler: 'false',
  };

  // If flair text is provided, try to set it (works for text flairs on most subs)
  if (flairText) body.flair_text = flairText;

  const res = await fetch('https://oauth.reddit.com/api/submit', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams(body),
  });

  const data = await res.json() as { json?: { errors?: string[][]; data?: { url?: string } } };
  const errors = data?.json?.errors;

  if (errors && errors.length > 0) {
    console.error(`  Reddit submit error:`, errors);
    return false;
  }

  const postUrl = data?.json?.data?.url;
  if (postUrl) {
    console.log(`  Posted: ${postUrl}`);
    return true;
  }

  console.error('  Unexpected response:', JSON.stringify(data).slice(0, 200));
  return false;
}

// --- Main ---
async function main(): Promise<void> {
  console.log('Starting Reddit auto-posting...');
  console.log(`Time: ${new Date().toISOString()}`);

  // Auth check
  const token = await getAccessToken();
  if (!token) return;

  const postedSlugs = loadPostedSlugs();
  console.log(`Previously posted: ${postedSlugs.size} articles`);

  const topArticles = getTopArticles(10);
  console.log(`Top candidates (48h): ${topArticles.length}`);
  topArticles.forEach(a => console.log(`  [score:${scoreArticle(a)}] ${a.title.slice(0, 60)}`));

  const toPost = topArticles.filter(a => !postedSlugs.has(a.slug));
  const selected = toPost.slice(0, MAX_POSTS_PER_RUN);

  if (selected.length === 0) {
    console.log('No new articles to post to Reddit.');
    return;
  }

  let postedCount = 0;

  for (const article of selected) {
    const target = getTargetSubreddit(article);
    const articleUrl = withUtm(`${SITE_URL}/article/${article.slug}/`, { source: 'reddit' });

    console.log(`\nPosting to r/${target.subreddit}: ${article.title.slice(0, 60)}...`);

    const success = await submitLink(
      token,
      target.subreddit,
      article.title,
      articleUrl,
      target.flairText,
    );

    if (success) {
      postedSlugs.add(article.slug);
      postedCount++;
    }

    // 10s delay between posts — looks more human, avoids rate limits
    if (selected.indexOf(article) < selected.length - 1) {
      console.log('  Waiting 10s before next post...');
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  savePostedSlugs(postedSlugs);
  console.log(`\nDone! Posted ${postedCount} articles to Reddit.`);
}

main().catch(console.error);
