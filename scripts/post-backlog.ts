import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { TwitterApi } from 'twitter-api-v2';
import { BskyAgent, RichText } from '@atproto/api';

/**
 * Post backlog articles to all social platforms (Threads, Twitter, Bluesky)
 * Posts older articles that haven't been posted yet
 * Designed to run periodically to catch up on unposted content
 * Each platform tracks independently — one failing doesn't block others
 */

// Configuration
const THREADS_USER_ID = process.env.THREADS_USER_ID;
const THREADS_ACCESS_TOKEN = process.env.THREADS_ACCESS_TOKEN;
const TWITTER_APP_KEY = process.env.TWITTER_APP_KEY;
const TWITTER_APP_SECRET = process.env.TWITTER_APP_SECRET;
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN;
const TWITTER_ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET;
const BLUESKY_IDENTIFIER = process.env.BLUESKY_IDENTIFIER;
const BLUESKY_PASSWORD = process.env.BLUESKY_PASSWORD;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpop.andxo.com';
const CONTENT_DIR = path.join(process.cwd(), 'content/posts');

const THREADS_POSTED_FILE = path.join(process.cwd(), 'content/.threads-posted.json');
const TWITTER_POSTED_FILE = path.join(process.cwd(), 'content/.twitter-posted.json');
const BLUESKY_POSTED_FILE = path.join(process.cwd(), 'content/.bluesky-posted.json');

// How many backlog posts per run per platform
const MAX_BACKLOG_POSTS = 2;

// Shared config
const CATEGORY_CONFIG: Record<string, { emoji: string; ctas: string[] }> = {
  news: {
    emoji: '\u{1F525}',
    ctas: ['Thoughts?', 'What do you think?', 'Share if you\'re a fan!', 'Is this real?!'],
  },
  music: {
    emoji: '\u{1F3B5}',
    ctas: ['Are you excited?', 'What\'s your favorite track?', 'How do you feel about this comeback?', 'Ready to stream?'],
  },
  drama: {
    emoji: '\u{1F3AC}',
    ctas: ['Are you watching this?', 'The chemistry looks amazing!', 'Predict the next episode!', 'Who\'s watching live?'],
  },
  celebrity: {
    emoji: '\u2B50',
    ctas: ['Follow for more updates!', 'Never seen this side before', 'Absolutely perfect, agree?', 'Stan material right here'],
  },
  audition: {
    emoji: '\u{1F3A4}',
    ctas: ['Future star in the making!', 'Drop your support below!', 'Who are you rooting for?', 'Next big thing?'],
  },
  fashion: {
    emoji: '\u{1F457}',
    ctas: ['Rate this look!', 'Fashion score out of 10?', 'Would you wear this?', 'Airport fashion goals'],
  },
  variety: {
    emoji: '\u{1F3AD}',
    ctas: ['This moment is legendary', 'Entertainment royalty!', 'Try not to laugh challenge', 'Save this clip!'],
  },
};

const GROUP_HASHTAGS: Record<string, string[]> = {
  'bts': ['#BTS', '#ARMY'],
  'blackpink': ['#BLACKPINK', '#BLINK'],
  'twice': ['#TWICE', '#ONCE'],
  'newjeans': ['#NewJeans'],
  'aespa': ['#aespa'],
  'ive': ['#IVE', '#DIVE'],
  'le sserafim': ['#LESSERAFIM'],
  'stray kids': ['#StrayKids', '#STAY'],
  'seventeen': ['#SEVENTEEN', '#CARAT'],
  'nct': ['#NCT'],
  'exo': ['#EXO'],
  'itzy': ['#ITZY'],
  'txt': ['#TXT', '#MOA'],
  'enhypen': ['#ENHYPEN', '#ENGENE'],
  'riize': ['#RIIZE'],
  'boynextdoor': ['#BOYNEXTDOOR'],
  'babymonster': ['#BABYMONSTER'],
  'red velvet': ['#RedVelvet'],
  'illit': ['#ILLIT'],
  'tws': ['#TWS'],
  'zerobaseone': ['#ZEROBASEONE', '#ZB1'],
  'g-dragon': ['#GDRAGON'],
  'ateez': ['#ATEEZ'],
  'nct wish': ['#NCTWISH'],
};

interface PostedRecord {
  slugs: string[];
  lastUpdated: string;
}

interface ArticleData {
  title: string;
  summary?: string;
  excerpt?: string;
  category: string;
  tags?: string[];
  thumbnail?: string;
  publishedAt: string;
}

// ── Shared utilities ──────────────────────────────────────────────

function loadPostedSlugs(filePath: string): Set<string> {
  try {
    if (fs.existsSync(filePath)) {
      const data: PostedRecord = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return new Set(data.slugs || []);
    }
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
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

function getRandomCTA(category: string): string {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['news'];
  return config.ctas[Math.floor(Math.random() * config.ctas.length)];
}

function generateHashtags(title: string, tags: string[], maxCount: number): string[] {
  const hashtags: Set<string> = new Set(['#KPOP', '#KPOPDaily']);
  const titleLower = title.toLowerCase();
  for (const [group, groupTags] of Object.entries(GROUP_HASHTAGS)) {
    if (titleLower.includes(group) || tags.some(t => t.toLowerCase().includes(group))) {
      groupTags.forEach(tag => hashtags.add(tag));
    }
  }
  return Array.from(hashtags).slice(0, maxCount);
}

function getAllArticlesSorted(): { file: string; data: ArticleData }[] {
  return fs.readdirSync(CONTENT_DIR)
    .filter(f => f.endsWith('.md'))
    .map(file => {
      const content = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
      const { data } = matter(content);
      return { file, data: data as ArticleData };
    })
    .sort((a, b) => new Date(b.data.publishedAt).getTime() - new Date(a.data.publishedAt).getTime());
}

// ── Threads posting ───────────────────────────────────────────────

function createThreadsText(data: ArticleData, slug: string): string {
  const config = CATEGORY_CONFIG[data.category] || CATEGORY_CONFIG['news'];
  const cta = getRandomCTA(data.category);
  const hashtags = generateHashtags(data.title, data.tags || [], 6).join(' ');

  let title = data.title;
  if (title.length > 100) title = title.slice(0, 97) + '...';

  let summary = (data.summary || data.excerpt || '') as string;
  if (summary.length > 100) summary = summary.slice(0, 97) + '...';

  return `${config.emoji} ${title}

${summary}

${cta}

\u{1F517} ${SITE_URL}/article/${slug}

${hashtags}`;
}

async function postToThreads(data: ArticleData, slug: string): Promise<boolean> {
  const text = createThreadsText(data, slug);
  const imageUrl = data.thumbnail ? `${SITE_URL}${data.thumbnail}` : undefined;

  const params: Record<string, string> = {
    media_type: imageUrl ? 'IMAGE' : 'TEXT',
    text,
    access_token: THREADS_ACCESS_TOKEN!,
  };
  if (imageUrl) params.image_url = imageUrl;

  try {
    const response = await fetch(
      `https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params),
      }
    );
    let containerId = (await response.json()).id;

    // Fallback to text-only
    if (!containerId && imageUrl) {
      params.media_type = 'TEXT';
      delete params.image_url;
      const retry = await fetch(
        `https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(params),
        }
      );
      containerId = (await retry.json()).id;
    }

    if (!containerId) return false;

    await new Promise(resolve => setTimeout(resolve, 3000));

    const pubResponse = await fetch(
      `https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          creation_id: containerId,
          access_token: THREADS_ACCESS_TOKEN!,
        }),
      }
    );
    return !!(await pubResponse.json()).id;
  } catch (error) {
    console.error('    Threads error:', error);
    return false;
  }
}

// ── Twitter posting ───────────────────────────────────────────────

function createTweetText(data: ArticleData, slug: string): string {
  const config = CATEGORY_CONFIG[data.category] || CATEGORY_CONFIG['news'];
  const hashtags = generateHashtags(data.title, data.tags || [], 4).join(' ');
  const articleUrl = `${SITE_URL}/article/${slug}`;

  const URL_LENGTH = 23;
  const overhead = 4 + URL_LENGTH + 2 + hashtags.length;
  const maxTitleLength = 280 - overhead - 1;

  let title = data.title;
  if (title.length > maxTitleLength) {
    title = title.slice(0, maxTitleLength - 3) + '...';
  }

  return `${config.emoji} ${title}

${articleUrl}

${hashtags}`;
}

async function postToTwitter(
  client: TwitterApi,
  data: ArticleData,
  slug: string
): Promise<boolean> {
  const text = createTweetText(data, slug);
  try {
    const result = await client.v2.tweet(text);
    return !!result.data?.id;
  } catch (error: any) {
    console.error('    Twitter error:', error?.message || error);
    return false;
  }
}

// ── Bluesky posting ───────────────────────────────────────────────

function createBlueskyText(data: ArticleData, slug: string): string {
  const config = CATEGORY_CONFIG[data.category] || CATEGORY_CONFIG['news'];
  const cta = getRandomCTA(data.category);
  const hashtags = generateHashtags(data.title, data.tags || [], 5).join(' ');
  const articleUrl = `${SITE_URL}/article/${slug}`;

  const overhead = 4 + cta.length + 2 + articleUrl.length + 2 + hashtags.length;
  const maxTitleLength = 300 - overhead - 5;

  let title = data.title;
  if (title.length > maxTitleLength) {
    title = title.slice(0, maxTitleLength - 3) + '...';
  }

  return `${config.emoji} ${title}

${cta}

${articleUrl}

${hashtags}`;
}

async function postToBluesky(
  agent: BskyAgent,
  data: ArticleData,
  slug: string
): Promise<boolean> {
  const text = createBlueskyText(data, slug);
  const rt = new RichText({ text });
  await rt.detectFacets(agent);

  const articleUrl = `${SITE_URL}/article/${slug}`;
  let embed: any = {
    $type: 'app.bsky.embed.external',
    external: {
      uri: articleUrl,
      title: data.title,
      description: (data.excerpt || data.summary || '').slice(0, 200),
    },
  };

  // Try to upload thumbnail
  if (data.thumbnail) {
    try {
      const imgResponse = await fetch(`${SITE_URL}${data.thumbnail}`);
      if (imgResponse.ok) {
        const arrayBuffer = await imgResponse.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        if (uint8Array.length <= 1_000_000) {
          const mimeType = imgResponse.headers.get('content-type') || 'image/webp';
          const uploadResult = await agent.uploadBlob(uint8Array, { encoding: mimeType });
          embed.external.thumb = uploadResult.data.blob;
        }
      }
    } catch (e) {
      // Continue without thumbnail
    }
  }

  try {
    const result = await agent.post({
      text: rt.text,
      facets: rt.facets,
      embed,
      createdAt: new Date().toISOString(),
    });
    return !!result?.uri;
  } catch (error: any) {
    // Retry without embed
    try {
      const result = await agent.post({
        text: rt.text,
        facets: rt.facets,
        createdAt: new Date().toISOString(),
      });
      return !!result?.uri;
    } catch (retryError: any) {
      console.error('    Bluesky error:', retryError?.message || retryError);
      return false;
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log('=== SOCIAL MEDIA BACKLOG POSTING ===');
  console.log(`Time: ${new Date().toISOString()}`);

  const allArticles = getAllArticlesSorted();
  console.log(`Total articles: ${allArticles.length}`);

  // Platform availability flags
  const threadsEnabled = !!(THREADS_USER_ID && THREADS_ACCESS_TOKEN);
  const twitterEnabled = !!(TWITTER_APP_KEY && TWITTER_APP_SECRET && TWITTER_ACCESS_TOKEN && TWITTER_ACCESS_SECRET);
  const blueskyEnabled = !!(BLUESKY_IDENTIFIER && BLUESKY_PASSWORD);

  console.log(`Platforms: Threads=${threadsEnabled} Twitter=${twitterEnabled} Bluesky=${blueskyEnabled}`);

  if (!threadsEnabled && !twitterEnabled && !blueskyEnabled) {
    console.log('No social media credentials configured. Skipping.');
    return;
  }

  // Initialize Twitter client
  let twitterClient: TwitterApi | null = null;
  if (twitterEnabled) {
    twitterClient = new TwitterApi({
      appKey: TWITTER_APP_KEY!,
      appSecret: TWITTER_APP_SECRET!,
      accessToken: TWITTER_ACCESS_TOKEN!,
      accessSecret: TWITTER_ACCESS_SECRET!,
    });
  }

  // Initialize Bluesky agent
  let blueskyAgent: BskyAgent | null = null;
  if (blueskyEnabled) {
    blueskyAgent = new BskyAgent({ service: 'https://bsky.social' });
    try {
      await blueskyAgent.login({
        identifier: BLUESKY_IDENTIFIER!,
        password: BLUESKY_PASSWORD!,
      });
      console.log(`Bluesky logged in: ${BLUESKY_IDENTIFIER}`);
    } catch (error: any) {
      console.error('Bluesky login failed:', error?.message);
      blueskyAgent = null;
    }
  }

  // ── Threads backlog ──
  if (threadsEnabled) {
    console.log('\n--- Threads Backlog ---');
    const threadsSlugs = loadPostedSlugs(THREADS_POSTED_FILE);
    const threadsUnposted = allArticles.filter(({ file }) => !threadsSlugs.has(file.replace('.md', '')));
    console.log(`Unposted on Threads: ${threadsUnposted.length}`);

    let threadsPosted = 0;
    for (const { file, data } of threadsUnposted.slice(0, MAX_BACKLOG_POSTS)) {
      const slug = file.replace('.md', '');
      console.log(`  Posting: ${data.title.slice(0, 50)}...`);
      const success = await postToThreads(data, slug);
      if (success) {
        threadsSlugs.add(slug);
        threadsPosted++;
        console.log('    \u2705 Threads');
      } else {
        console.log('    \u274C Threads');
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    savePostedSlugs(THREADS_POSTED_FILE, threadsSlugs);
    console.log(`Threads: posted ${threadsPosted}`);
  }

  // ── Twitter backlog ──
  if (twitterClient) {
    console.log('\n--- Twitter Backlog ---');
    const twitterSlugs = loadPostedSlugs(TWITTER_POSTED_FILE);
    const twitterUnposted = allArticles.filter(({ file }) => !twitterSlugs.has(file.replace('.md', '')));
    console.log(`Unposted on Twitter: ${twitterUnposted.length}`);

    let twitterPosted = 0;
    for (const { file, data } of twitterUnposted.slice(0, MAX_BACKLOG_POSTS)) {
      const slug = file.replace('.md', '');
      console.log(`  Posting: ${data.title.slice(0, 50)}...`);
      const success = await postToTwitter(twitterClient, data, slug);
      if (success) {
        twitterSlugs.add(slug);
        twitterPosted++;
        console.log('    \u2705 Twitter');
      } else {
        console.log('    \u274C Twitter');
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    savePostedSlugs(TWITTER_POSTED_FILE, twitterSlugs);
    console.log(`Twitter: posted ${twitterPosted}`);
  }

  // ── Bluesky backlog ──
  if (blueskyAgent) {
    console.log('\n--- Bluesky Backlog ---');
    const blueskySlugs = loadPostedSlugs(BLUESKY_POSTED_FILE);
    const blueskyUnposted = allArticles.filter(({ file }) => !blueskySlugs.has(file.replace('.md', '')));
    console.log(`Unposted on Bluesky: ${blueskyUnposted.length}`);

    let blueskyPosted = 0;
    for (const { file, data } of blueskyUnposted.slice(0, MAX_BACKLOG_POSTS)) {
      const slug = file.replace('.md', '');
      console.log(`  Posting: ${data.title.slice(0, 50)}...`);
      const success = await postToBluesky(blueskyAgent, data, slug);
      if (success) {
        blueskySlugs.add(slug);
        blueskyPosted++;
        console.log('    \u2705 Bluesky');
      } else {
        console.log('    \u274C Bluesky');
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    savePostedSlugs(BLUESKY_POSTED_FILE, blueskySlugs);
    console.log(`Bluesky: posted ${blueskyPosted}`);
  }

  console.log('\n=== BACKLOG POSTING COMPLETE ===');
}

main().catch(console.error);
