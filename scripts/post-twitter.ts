import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { TwitterApi } from 'twitter-api-v2';
import { withUtm } from './lib/social-url';

// Twitter API Configuration (OAuth 1.0a User Context)
const TWITTER_APP_KEY = process.env.TWITTER_APP_KEY;
const TWITTER_APP_SECRET = process.env.TWITTER_APP_SECRET;
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN;
const TWITTER_ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpop.andxo.com';

const CONTENT_DIR = path.join(process.cwd(), 'content/posts');
const POSTED_FILE = path.join(process.cwd(), 'content/.twitter-posted.json');

interface ArticleMetadata {
  title: string;
  excerpt: string;
  summary: string;
  category: string;
  tags: string[];
  publishedAt: string;
  thumbnail?: string;
  slug: string;
}

interface PostedRecord {
  slugs: string[];
  lastUpdated: string;
}

// Category emojis
const CATEGORY_EMOJI: Record<string, string> = {
  news: '\u{1F525}',
  music: '\u{1F3B5}',
  drama: '\u{1F3AC}',
  celebrity: '\u2B50',
  audition: '\u{1F3A4}',
  fashion: '\u{1F457}',
  variety: '\u{1F3AD}',
};

// Group-specific hashtags
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

function loadPostedSlugs(): Set<string> {
  try {
    if (fs.existsSync(POSTED_FILE)) {
      const data: PostedRecord = JSON.parse(fs.readFileSync(POSTED_FILE, 'utf-8'));
      return new Set(data.slugs || []);
    }
  } catch (error) {
    console.error('Error loading posted slugs:', error);
  }
  return new Set();
}

function savePostedSlugs(slugs: Set<string>): void {
  const data: PostedRecord = {
    slugs: Array.from(slugs),
    lastUpdated: new Date().toISOString(),
  };
  fs.writeFileSync(POSTED_FILE, JSON.stringify(data, null, 2));
}

function getRecentArticles(): ArticleMetadata[] {
  const articles: ArticleMetadata[] = [];
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(CONTENT_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const { data } = matter(content);

      const publishedAt = new Date(data.publishedAt);
      if (publishedAt >= oneDayAgo) {
        articles.push({
          title: data.title,
          excerpt: data.excerpt,
          summary: data.summary,
          category: data.category,
          tags: data.tags || [],
          publishedAt: data.publishedAt,
          thumbnail: data.thumbnail,
          slug: file.replace('.md', ''),
        });
      }
    }

    articles.sort((a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  } catch (error) {
    console.error('Error reading articles:', error);
  }

  return articles;
}

function generateHashtags(article: ArticleMetadata): string[] {
  const hashtags: Set<string> = new Set(['#KPOP', '#KPOPDaily']);

  const titleLower = article.title.toLowerCase();
  for (const [group, tags] of Object.entries(GROUP_HASHTAGS)) {
    if (titleLower.includes(group) || article.tags.some((t) => t.toLowerCase().includes(group))) {
      tags.forEach((tag) => hashtags.add(tag));
    }
  }

  // Limit to 4 hashtags for Twitter (keep tweets clean)
  return Array.from(hashtags).slice(0, 4);
}

// Twitter counts URLs as 23 chars. Total limit: 280 chars.
// Format: emoji + title + \n\n + link + \n\n + hashtags
function createTweetText(article: ArticleMetadata): string {
  const emoji = CATEGORY_EMOJI[article.category] || CATEGORY_EMOJI['news'];
  const hashtags = generateHashtags(article);
  const articleUrl = withUtm(`${SITE_URL}/article/${article.slug}`, { source: 'twitter' });

  const hashtagStr = hashtags.join(' ');
  // URL counts as 23 chars on Twitter regardless of actual length
  const URL_LENGTH = 23;
  // emoji(2) + space(1) + \n\n(2) + url(23) + \n\n(2) + hashtags
  const overhead = 2 + 1 + 2 + URL_LENGTH + 2 + hashtagStr.length;
  const maxTitleLength = 280 - overhead - 1; // -1 safety margin

  let title = article.title;
  if (title.length > maxTitleLength) {
    title = title.slice(0, maxTitleLength - 3) + '...';
  }

  return `${emoji} ${title}

${articleUrl}

${hashtagStr}`;
}

async function postTweet(
  client: TwitterApi,
  article: ArticleMetadata
): Promise<boolean> {
  console.log(`\nPosting to Twitter: ${article.title.slice(0, 50)}...`);

  const text = createTweetText(article);
  console.log(`  Tweet length: ${text.length} chars`);

  try {
    const result = await client.v2.tweet(text);
    if (result.data?.id) {
      console.log(`  Tweet posted: ${result.data.id}`);
      return true;
    } else {
      console.error('  Failed to post tweet:', result);
      return false;
    }
  } catch (error: any) {
    console.error('  Error posting tweet:', error?.message || error);
    return false;
  }
}

async function main(): Promise<void> {
  console.log('=== TWITTER AUTO-POSTING ===');
  console.log(`Time: ${new Date().toISOString()}`);

  if (!TWITTER_APP_KEY || !TWITTER_APP_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
    console.log('\nTwitter credentials not configured. Skipping.');
    console.log('Set TWITTER_APP_KEY, TWITTER_APP_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET');
    console.log('\nTo get credentials:');
    console.log('1. Go to https://developer.x.com/en/portal/dashboard');
    console.log('2. Create a project and app');
    console.log('3. Enable OAuth 1.0a with Read and Write permissions');
    console.log('4. Generate access token and secret');
    return;
  }

  const client = new TwitterApi({
    appKey: TWITTER_APP_KEY,
    appSecret: TWITTER_APP_SECRET,
    accessToken: TWITTER_ACCESS_TOKEN,
    accessSecret: TWITTER_ACCESS_SECRET,
  });

  const postedSlugs = loadPostedSlugs();
  console.log(`Previously posted: ${postedSlugs.size} tweets`);

  const recentArticles = getRecentArticles();
  console.log(`Recent articles (24h): ${recentArticles.length}`);

  const newArticles = recentArticles.filter((a) => !postedSlugs.has(a.slug));
  console.log(`New articles to tweet: ${newArticles.length}`);

  if (newArticles.length === 0) {
    console.log('No new articles to tweet.');
    return;
  }

  let postedCount = 0;

  for (const article of newArticles) {
    const success = await postTweet(client, article);

    if (success) {
      postedSlugs.add(article.slug);
      postedCount++;
    }

    // Rate limiting (be conservative with free tier)
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  savePostedSlugs(postedSlugs);
  console.log(`\nDone! Tweeted ${postedCount} articles.`);
}

main().catch(console.error);
