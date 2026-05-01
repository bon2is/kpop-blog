import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Anthropic from '@anthropic-ai/sdk';

// Threads API Configuration
const THREADS_USER_ID = process.env.THREADS_USER_ID;
const THREADS_ACCESS_TOKEN = process.env.THREADS_ACCESS_TOKEN;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpop.andxo.com';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const CONTENT_DIR = path.join(process.cwd(), 'content/posts');
const POSTED_FILE = path.join(process.cwd(), 'content/.threads-posted.json');

// Post type: 'traffic' (70%) or 'conversion' (30%)
type PostType = 'traffic' | 'conversion';

// Types
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
  postCount: number; // tracks total posts for 7:3 ratio
}

// ─── Strategy E: Hashtag optimization ──────────────────────────────────────

// Base hashtags always included (lowercase, per strategy)
const BASE_HASHTAGS = ['#kpop', '#kdrama', '#kpopnews', '#kpopdaily'];

// Category-specific dynamic hashtags
const CATEGORY_HASHTAGS: Record<string, string[]> = {
  news: ['#KPOPNews', '#KoreanNews'],
  music: ['#KPOPMusic', '#NewMusic', '#KPOPComeback'],
  drama: ['#KoreanDrama', '#KDramaNews'],
  celebrity: ['#KPOPIdol', '#Celebrity'],
  audition: ['#KPOPAudition', '#Debut'],
  fashion: ['#KPOPFashion', '#KoreanFashion'],
  variety: ['#KVariety', '#Entertainment'],
  tour: ['#KPOPTour', '#KPOPConcert'],
  chart: ['#billboard', '#spotify'],
};

// Group-specific hashtags
const GROUP_HASHTAGS: Record<string, string[]> = {
  'bts': ['#BTS', '#ARMY'],
  'blackpink': ['#BLACKPINK', '#BLINK'],
  'twice': ['#TWICE', '#ONCE'],
  'newjeans': ['#NewJeans', '#Bunnies'],
  'aespa': ['#aespa', '#MY'],
  'ive': ['#IVE', '#DIVE'],
  'le sserafim': ['#LESSERAFIM', '#FEARNOT'],
  'stray kids': ['#StrayKids', '#STAY'],
  'seventeen': ['#SEVENTEEN', '#CARAT'],
  'nct': ['#NCT', '#NCTzen'],
  'exo': ['#EXO', '#EXOL'],
  'itzy': ['#ITZY', '#MIDZY'],
  'txt': ['#TXT', '#MOA'],
  'enhypen': ['#ENHYPEN', '#ENGENE'],
  'riize': ['#RIIZE', '#BRIIZE'],
  'boynextdoor': ['#BOYNEXTDOOR'],
  'babymonster': ['#BABYMONSTER'],
  'red velvet': ['#RedVelvet', '#ReVeluv'],
  'ateez': ['#ATEEZ', '#ATINY'],
  'gidle': ['#GIDLE', '#NEVERLAND'],
  'monsta x': ['#MONSTAX', '#MONBEBE'],
  'got7': ['#GOT7', '#IGOT7'],
  'bigbang': ['#BIGBANG', '#VIP'],
  'jungkook': ['#Jungkook'],
  'jennie': ['#Jennie'],
  'lisa': ['#Lisa'],
  'jimin': ['#Jimin'],
};

function generateHashtags(article: ArticleMetadata): string {
  const hashtags: Set<string> = new Set(BASE_HASHTAGS);

  // Category-specific tags
  const catTags = CATEGORY_HASHTAGS[article.category] || [];
  catTags.forEach((t) => hashtags.add(t));

  // Chart/performance keywords get spotify/billboard
  const titleLower = article.title.toLowerCase();
  if (
    titleLower.includes('chart') ||
    titleLower.includes('billboard') ||
    titleLower.includes('spotify') ||
    titleLower.includes('record')
  ) {
    CATEGORY_HASHTAGS['chart'].forEach((t) => hashtags.add(t));
  }

  // Group-specific hashtags
  for (const [group, tags] of Object.entries(GROUP_HASHTAGS)) {
    if (titleLower.includes(group) || article.tags.some((t) => t.toLowerCase().includes(group))) {
      tags.forEach((t) => hashtags.add(t));
      break; // one group max to keep post clean
    }
  }

  // Limit to 8 total hashtags
  return Array.from(hashtags).slice(0, 8).join(' ');
}

// ─── Strategy B + D: Claude API hook generation ────────────────────────────

const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

const HOOK_SYSTEM_PROMPT = `You are a viral K-pop social media writer. Rewrite the given headline into a 2-line Threads hook that creates curiosity and emotion.

Rules:
- Line 1: Emotional/curious hook using numbers, "nobody expected", "divided fans", "shocked", "broke the record", etc.
- Line 2: Why people should care — tease the key detail or outcome
- Include 1-2 emojis total
- Total must be under 100 characters
- If the artist is not widely known, add context like "the group behind [famous song/fact]"
- Avoid K-pop jargon (음방, 뮤뱅, 컴백 → use "new release", "comeback stage", etc.)
- Write for a global audience who may not follow K-pop
- Output ONLY the 2 lines, nothing else. No quotes, no labels.`;

async function generateHook(article: ArticleMetadata): Promise<string> {
  if (!anthropic) {
    console.log('  [Hook] No ANTHROPIC_API_KEY — using title as fallback');
    return article.title;
  }

  try {
    const userMessage = `Headline: "${article.title}"\nSummary: "${article.excerpt}"`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      system: HOOK_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';

    if (text) {
      console.log(`  [Hook] Generated: ${text.slice(0, 80)}...`);
      return text;
    }
  } catch (error) {
    console.error('  [Hook] Claude API error:', error);
  }

  // Fallback: return the original title
  return article.title;
}

// ─── Strategy A: 7:3 post type ratio ───────────────────────────────────────

function determinePostType(postCount: number): PostType {
  // Every 10th post cycle: 7 traffic, 3 conversion
  // postCount % 10: 0-6 → traffic, 7-9 → conversion
  return postCount % 10 < 7 ? 'traffic' : 'conversion';
}

// ─── Scoring (unchanged logic) ──────────────────────────────────────────────

const HIGH_INTEREST_ARTISTS = [
  'bts', 'blackpink', 'twice', 'aespa', 'ive', 'newjeans', 'stray kids',
  'seventeen', 'nct', 'exo', 'bigbang', 'red velvet', 'got7', 'monsta x',
  'txt', 'enhypen', 'le sserafim', 'itzy', 'gidle', 'ateez',
  'jungkook', 'jennie', 'lisa', 'rosé', 'jimin', 'v ', ' rm ', 'suga',
];

const HOOK_KEYWORDS = [
  'dating', 'relationship', 'married', 'wedding', 'pregnant', 'break up',
  'comeback', 'new album', 'mv', 'music video', 'world tour', 'concert',
  'controversy', 'backlash', 'accused', 'responds', 'shocking', 'reveals',
  'disbands', 'leaves', 'joins', 'confirmed', 'breaks record', 'million',
];

function scoreArticle(article: ArticleMetadata): number {
  const titleLower = article.title.toLowerCase();
  const tagsLower = article.tags.map((t) => t.toLowerCase());
  let score = 0;

  for (const artist of HIGH_INTEREST_ARTISTS) {
    if (titleLower.includes(artist) || tagsLower.some((t) => t.includes(artist))) {
      score += 30;
    }
  }

  for (const kw of HOOK_KEYWORDS) {
    if (titleLower.includes(kw)) score += 20;
  }

  if (article.thumbnail) score += 10;
  if (article.category === 'music' || article.category === 'drama') score += 5;

  return score;
}

// ─── Article loading ─────────────────────────────────────────────────────────

function loadPostedRecord(): PostedRecord {
  try {
    if (fs.existsSync(POSTED_FILE)) {
      const data = JSON.parse(fs.readFileSync(POSTED_FILE, 'utf-8'));
      return {
        slugs: data.slugs || [],
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        postCount: data.postCount ?? 0,
      };
    }
  } catch (error) {
    console.error('Error loading posted record:', error);
  }
  return { slugs: [], lastUpdated: new Date().toISOString(), postCount: 0 };
}

function savePostedRecord(record: PostedRecord): void {
  fs.writeFileSync(POSTED_FILE, JSON.stringify(record, null, 2));
}

function getRecentArticles(topN = 3): ArticleMetadata[] {
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
        const slug = file.replace('.md', '');
        articles.push({
          title: data.title,
          excerpt: data.excerpt,
          summary: data.summary,
          category: data.category,
          tags: data.tags || [],
          publishedAt: data.publishedAt,
          thumbnail: data.thumbnail,
          slug,
        });
      }
    }

    articles.sort((a, b) => {
      const scoreDiff = scoreArticle(b) - scoreArticle(a);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  } catch (error) {
    console.error('Error reading articles:', error);
  }

  return articles.slice(0, topN);
}

// ─── Strategy B+C+D: Post text builder ──────────────────────────────────────

async function buildPostText(
  article: ArticleMetadata,
  postType: PostType
): Promise<{ mainText: string; commentText: string | null }> {
  const hook = await generateHook(article);
  const hashtags = generateHashtags(article);
  const articleUrl = `${SITE_URL}/article/${article.slug}`;

  let mainText: string;
  let commentText: string | null = null;

  if (postType === 'traffic') {
    // Traffic post: hook + brief tease + hashtags (NO link in main post)
    mainText = `${hook}

${hashtags}`;
  } else {
    // Conversion post: hook + CTA to check comments + hashtags
    mainText = `${hook}

Full story in the comments 👇

${hashtags}`;

    // Link goes in the first reply comment (Strategy C)
    commentText = `🔗 Read the full story: ${articleUrl}`;
  }

  // Enforce 500-char Threads limit
  if (mainText.length > 495) {
    mainText = mainText.slice(0, 492) + '...';
  }

  return { mainText, commentText };
}

// ─── Threads API calls ───────────────────────────────────────────────────────

async function createMediaContainer(
  text: string,
  imageUrl?: string
): Promise<string | null> {
  if (!THREADS_USER_ID || !THREADS_ACCESS_TOKEN) {
    console.error('Missing Threads credentials');
    return null;
  }

  try {
    const params: Record<string, string> = {
      media_type: imageUrl ? 'IMAGE' : 'TEXT',
      text,
      access_token: THREADS_ACCESS_TOKEN,
    };

    if (imageUrl) params.image_url = imageUrl;

    const response = await fetch(
      `https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params),
      }
    );

    const data = await response.json() as { id?: string };

    if (data.id) {
      console.log(`  Media container created: ${data.id}`);
      return data.id;
    } else {
      console.error('  Failed to create media container:', data);
      return null;
    }
  } catch (error) {
    console.error('  Error creating media container:', error);
    return null;
  }
}

async function publishThread(containerId: string): Promise<string | null> {
  if (!THREADS_USER_ID || !THREADS_ACCESS_TOKEN) return null;

  try {
    const response = await fetch(
      `https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          creation_id: containerId,
          access_token: THREADS_ACCESS_TOKEN,
        }),
      }
    );

    const data = await response.json() as { id?: string };

    if (data.id) {
      console.log(`  Thread published: ${data.id}`);
      return data.id;
    } else {
      console.error('  Failed to publish thread:', data);
      return null;
    }
  } catch (error) {
    console.error('  Error publishing thread:', error);
    return null;
  }
}

// Strategy C: post a reply comment with the article link
async function postReplyComment(threadId: string, commentText: string): Promise<boolean> {
  if (!THREADS_USER_ID || !THREADS_ACCESS_TOKEN) return false;

  try {
    // Step 1: Create reply container
    const createResponse = await fetch(
      `https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          media_type: 'TEXT',
          text: commentText,
          reply_to_id: threadId,
          access_token: THREADS_ACCESS_TOKEN,
        }),
      }
    );

    const createData = await createResponse.json() as { id?: string };

    if (!createData.id) {
      console.log(`  [Comment] Could not create reply container — logging link instead:`);
      console.log(`  ${commentText}`);
      return false;
    }

    // Step 2: Wait and publish reply
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const publishResponse = await fetch(
      `https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          creation_id: createData.id,
          access_token: THREADS_ACCESS_TOKEN,
        }),
      }
    );

    const publishData = await publishResponse.json() as { id?: string };

    if (publishData.id) {
      console.log(`  [Comment] Reply posted: ${publishData.id}`);
      return true;
    } else {
      // Fallback: log the comment to stdout so it can be manually posted or queued
      console.log(`  [Comment] Reply publish failed — pending comment saved:`);
      console.log(`  ${commentText}`);
      return false;
    }
  } catch (error) {
    console.error('  [Comment] Error posting reply:', error);
    console.log(`  [Comment] Pending: ${commentText}`);
    return false;
  }
}

// ─── Main post function ──────────────────────────────────────────────────────

async function postToThreads(
  article: ArticleMetadata,
  postType: PostType
): Promise<boolean> {
  console.log(`\nPosting [${postType.toUpperCase()}]: ${article.title.slice(0, 60)}...`);

  const { mainText, commentText } = await buildPostText(article, postType);

  console.log(`  Post type: ${postType} | Chars: ${mainText.length}`);
  console.log(`  Preview: ${mainText.slice(0, 100).replace(/\n/g, ' ')}...`);

  // Try with animated WebP first, then static WebP, then text-only
  let imageUrl: string | undefined;
  if (article.thumbnail) {
    const animatedPath = article.thumbnail.replace(/\.webp$/, '-animated.webp');
    imageUrl = `${SITE_URL}${animatedPath}`;
  }

  let containerId = await createMediaContainer(mainText, imageUrl);

  if (!containerId && imageUrl) {
    console.log('  Image post failed, retrying with text only...');
    containerId = await createMediaContainer(mainText, undefined);
  }

  if (!containerId) {
    console.error('  Failed to create post');
    return false;
  }

  // Wait for media processing
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const threadId = await publishThread(containerId);
  if (!threadId) return false;

  // Strategy C: post link as reply comment on conversion posts
  if (postType === 'conversion' && commentText) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await postReplyComment(threadId, commentText);
  }

  return true;
}

// ─── Preview mode (dry run) ──────────────────────────────────────────────────

export async function previewPosts(articles: ArticleMetadata[]): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('DRY RUN — No posts will be published');
  console.log('='.repeat(60));

  let postCount = 0;
  for (const article of articles) {
    const postType = determinePostType(postCount);
    const { mainText, commentText } = await buildPostText(article, postType);
    const hashtags = generateHashtags(article);

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`ARTICLE: ${article.title}`);
    console.log(`TYPE: ${postType.toUpperCase()} | SCORE: ${scoreArticle(article)}`);
    console.log(`─`.repeat(60));
    console.log('BEFORE (original):');
    console.log(`  Title: ${article.title}`);
    console.log(`  Hashtags: ${hashtags}`);
    console.log(`─`.repeat(60));
    console.log('AFTER (new format):');
    console.log(mainText);
    if (commentText) {
      console.log(`\n[COMMENT]: ${commentText}`);
    }
    console.log(`\n  Length: ${mainText.length}/500 chars`);

    postCount++;
  }

  console.log('\n' + '='.repeat(60));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('--preview');

  console.log('Starting Threads auto-posting...');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN (preview only)' : 'LIVE'}`);
  console.log(`Claude API: ${anthropic ? 'enabled' : 'disabled (no ANTHROPIC_API_KEY)'}`);

  if (!isDryRun && (!THREADS_USER_ID || !THREADS_ACCESS_TOKEN)) {
    console.log('\n⚠️  Threads credentials not configured.');
    console.log('Set THREADS_USER_ID and THREADS_ACCESS_TOKEN environment variables.');
    console.log('\nRun with --dry-run to preview posts without credentials.');
    return;
  }

  // Load posted record
  const record = loadPostedRecord();
  const postedSlugs = new Set(record.slugs);
  console.log(`Previously posted: ${postedSlugs.size} articles (total count: ${record.postCount})`);

  // Get top 3 articles by engagement score
  const recentArticles = getRecentArticles(3);
  console.log(`Top articles selected (24h): ${recentArticles.length}`);
  recentArticles.forEach((a) => console.log(`  [score:${scoreArticle(a)}] ${a.title.slice(0, 60)}`));

  // Filter already posted
  const newArticles = recentArticles.filter((a) => !postedSlugs.has(a.slug));
  console.log(`New articles to post: ${newArticles.length}`);

  if (newArticles.length === 0) {
    if (isDryRun && recentArticles.length > 0) {
      // In dry run, preview even already-posted articles
      await previewPosts(recentArticles);
    } else {
      console.log('No new articles to post to Threads.');
    }
    return;
  }

  if (isDryRun) {
    await previewPosts(newArticles);
    return;
  }

  let postedCount = 0;

  for (const article of newArticles) {
    const postType = determinePostType(record.postCount);
    const success = await postToThreads(article, postType);

    if (success) {
      postedSlugs.add(article.slug);
      record.postCount++;
      postedCount++;
    }

    // Rate limiting (Threads recommends >= 1 req / 3s)
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Save updated record
  record.slugs = Array.from(postedSlugs);
  record.lastUpdated = new Date().toISOString();
  savePostedRecord(record);

  console.log(`\nDone! Posted ${postedCount} articles to Threads.`);
}

main().catch(console.error);
