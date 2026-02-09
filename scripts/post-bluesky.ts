import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { BskyAgent, RichText } from '@atproto/api';

// Bluesky Configuration
const BLUESKY_IDENTIFIER = process.env.BLUESKY_IDENTIFIER;
const BLUESKY_PASSWORD = process.env.BLUESKY_PASSWORD;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpop.andxo.com';

const CONTENT_DIR = path.join(process.cwd(), 'content/posts');
const POSTED_FILE = path.join(process.cwd(), 'content/.bluesky-posted.json');

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

// Category CTAs
const CATEGORY_CTAS: Record<string, string[]> = {
  news: ['Thoughts?', 'What do you think?', 'Is this real?!'],
  music: ['Are you excited?', 'Ready to stream?', 'What a comeback!'],
  drama: ['Are you watching this?', 'The chemistry is amazing!'],
  celebrity: ['Follow for more updates!', 'Stan material right here'],
  audition: ['Future star in the making!', 'Who are you rooting for?'],
  fashion: ['Rate this look!', 'Fashion goals!'],
  variety: ['This moment is legendary!', 'Entertainment royalty!'],
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

  return Array.from(hashtags).slice(0, 5);
}

function getRandomCTA(category: string): string {
  const ctas = CATEGORY_CTAS[category] || CATEGORY_CTAS['news'];
  return ctas[Math.floor(Math.random() * ctas.length)];
}

// Bluesky has 300 grapheme limit. RichText auto-detects links and creates facets.
function createPostText(article: ArticleMetadata): string {
  const emoji = CATEGORY_EMOJI[article.category] || CATEGORY_EMOJI['news'];
  const hashtags = generateHashtags(article);
  const articleUrl = `${SITE_URL}/article/${article.slug}`;
  const cta = getRandomCTA(article.category);

  const hashtagStr = hashtags.join(' ');
  // Reserve room for: emoji + space + \n\n + cta + \n\n + url + \n\n + hashtags
  const overhead = 4 + cta.length + 2 + articleUrl.length + 2 + hashtagStr.length;
  const maxTitleLength = 300 - overhead - 5; // safety margin

  let title = article.title;
  if (title.length > maxTitleLength) {
    title = title.slice(0, maxTitleLength - 3) + '...';
  }

  return `${emoji} ${title}

${cta}

${articleUrl}

${hashtagStr}`;
}

async function fetchImageBlob(
  agent: BskyAgent,
  imageUrl: string
): Promise<{ ref: any; mimeType: string } | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const mimeType = response.headers.get('content-type') || 'image/webp';

    // Bluesky has a 1MB limit for blob uploads
    if (uint8Array.length > 1_000_000) {
      console.log('  Image too large for Bluesky (>1MB), skipping image');
      return null;
    }

    const uploadResult = await agent.uploadBlob(uint8Array, { encoding: mimeType });
    return { ref: uploadResult.data.blob, mimeType };
  } catch (error) {
    console.error('  Error uploading image:', error);
    return null;
  }
}

async function postToBluesky(
  agent: BskyAgent,
  article: ArticleMetadata
): Promise<boolean> {
  console.log(`\nPosting to Bluesky: ${article.title.slice(0, 50)}...`);

  const text = createPostText(article);

  // RichText auto-detects URLs and hashtags, creates facets
  const rt = new RichText({ text });
  await rt.detectFacets(agent);

  // Build embed with link card (external embed)
  const articleUrl = `${SITE_URL}/article/${article.slug}`;
  let embed: any = {
    $type: 'app.bsky.embed.external',
    external: {
      uri: articleUrl,
      title: article.title,
      description: article.excerpt || article.summary || '',
    },
  };

  // Try to attach thumbnail to the link card
  if (article.thumbnail) {
    const imageUrl = `${SITE_URL}${article.thumbnail}`;
    const blob = await fetchImageBlob(agent, imageUrl);
    if (blob) {
      embed.external.thumb = blob.ref;
    }
  }

  try {
    const result = await agent.post({
      text: rt.text,
      facets: rt.facets,
      embed,
      createdAt: new Date().toISOString(),
    });

    if (result?.uri) {
      console.log(`  Post created: ${result.uri}`);
      return true;
    } else {
      console.error('  Failed to create post:', result);
      return false;
    }
  } catch (error: any) {
    // If embed fails, retry without embed
    if (error?.message?.includes('embed')) {
      console.log('  Embed failed, retrying text-only...');
      try {
        const result = await agent.post({
          text: rt.text,
          facets: rt.facets,
          createdAt: new Date().toISOString(),
        });
        if (result?.uri) {
          console.log(`  Post created (text-only): ${result.uri}`);
          return true;
        }
      } catch (retryError: any) {
        console.error('  Retry failed:', retryError?.message || retryError);
      }
    }
    console.error('  Error posting:', error?.message || error);
    return false;
  }
}

async function main(): Promise<void> {
  console.log('=== BLUESKY AUTO-POSTING ===');
  console.log(`Time: ${new Date().toISOString()}`);

  if (!BLUESKY_IDENTIFIER || !BLUESKY_PASSWORD) {
    console.log('\nBluesky credentials not configured. Skipping.');
    console.log('Set BLUESKY_IDENTIFIER and BLUESKY_PASSWORD');
    console.log('\nTo get credentials:');
    console.log('1. Go to https://bsky.app/settings/app-passwords');
    console.log('2. Create an app password');
    console.log('3. Set BLUESKY_IDENTIFIER to your handle (e.g., yourname.bsky.social)');
    console.log('4. Set BLUESKY_PASSWORD to the app password');
    return;
  }

  const agent = new BskyAgent({ service: 'https://bsky.social' });

  try {
    await agent.login({
      identifier: BLUESKY_IDENTIFIER,
      password: BLUESKY_PASSWORD,
    });
    console.log(`Logged in as: ${BLUESKY_IDENTIFIER}`);
  } catch (error: any) {
    console.error('Failed to log in to Bluesky:', error?.message || error);
    return;
  }

  const postedSlugs = loadPostedSlugs();
  console.log(`Previously posted: ${postedSlugs.size} posts`);

  const recentArticles = getRecentArticles();
  console.log(`Recent articles (24h): ${recentArticles.length}`);

  const newArticles = recentArticles.filter((a) => !postedSlugs.has(a.slug));
  console.log(`New articles to post: ${newArticles.length}`);

  if (newArticles.length === 0) {
    console.log('No new articles to post to Bluesky.');
    return;
  }

  let postedCount = 0;

  for (const article of newArticles) {
    const success = await postToBluesky(agent, article);

    if (success) {
      postedSlugs.add(article.slug);
      postedCount++;
    }

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  savePostedSlugs(postedSlugs);
  console.log(`\nDone! Posted ${postedCount} articles to Bluesky.`);
}

main().catch(console.error);
