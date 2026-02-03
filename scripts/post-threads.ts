import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Threads API Configuration
const THREADS_USER_ID = process.env.THREADS_USER_ID;
const THREADS_ACCESS_TOKEN = process.env.THREADS_ACCESS_TOKEN;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpop.andxo.com';

const CONTENT_DIR = path.join(process.cwd(), 'content/posts');
const POSTED_FILE = path.join(process.cwd(), 'content/.threads-posted.json');

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
}

// K-Pop related hashtags by category
const CATEGORY_HASHTAGS: Record<string, string[]> = {
  news: ['#KPOP', '#KPOPNews', '#KoreanNews', '#Hallyu'],
  music: ['#KPOP', '#KPOPMusic', '#NewMusic', '#KPOPComeback', '#MusicVideo'],
  drama: ['#KDrama', '#KoreanDrama', '#Hallyu', '#KDramaNews'],
  celebrity: ['#KPOP', '#KPOPIdol', '#Celebrity', '#KoreanCeleb'],
  audition: ['#KPOPAudition', '#KPOPTrainee', '#Debut', '#KPOP'],
  fashion: ['#KPOPFashion', '#KoreanFashion', '#IdolStyle', '#KPOP'],
  variety: ['#KVariety', '#KoreanVariety', '#KPOP', '#Entertainment'],
};

// Group-specific hashtags
const GROUP_HASHTAGS: Record<string, string> = {
  'bts': '#BTS #ARMY',
  'blackpink': '#BLACKPINK #BLINK',
  'twice': '#TWICE #ONCE',
  'newjeans': '#NewJeans #Bunnies',
  'aespa': '#aespa #MY',
  'ive': '#IVE #DIVE',
  'le sserafim': '#LESSERAFIM #FEARNOT',
  'stray kids': '#StrayKids #STAY',
  'seventeen': '#SEVENTEEN #CARAT',
  'nct': '#NCT #NCTzen',
  'exo': '#EXO #EXOL',
  'itzy': '#ITZY #MIDZY',
  'txt': '#TXT #MOA',
  'enhypen': '#ENHYPEN #ENGENE',
  'riize': '#RIIZE #BRIIZE',
  'boynextdoor': '#BOYNEXTDOOR',
  'babymonster': '#BABYMONSTER',
  'red velvet': '#RedVelvet #ReVeluv',
};

// Load posted slugs
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

// Save posted slugs
function savePostedSlugs(slugs: Set<string>): void {
  const data: PostedRecord = {
    slugs: Array.from(slugs),
    lastUpdated: new Date().toISOString(),
  };
  fs.writeFileSync(POSTED_FILE, JSON.stringify(data, null, 2));
}

// Get recent articles (last 24 hours)
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

      // Only get articles from last 24 hours
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

    // Sort by publishedAt (newest first)
    articles.sort((a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  } catch (error) {
    console.error('Error reading articles:', error);
  }

  return articles;
}

// Generate hashtags for article
function generateHashtags(article: ArticleMetadata): string {
  const hashtags: Set<string> = new Set();

  // Category hashtags
  const categoryTags = CATEGORY_HASHTAGS[article.category] || CATEGORY_HASHTAGS['news'];
  categoryTags.forEach((tag) => hashtags.add(tag));

  // Group-specific hashtags from tags
  const titleLower = article.title.toLowerCase();
  for (const [group, groupHashtags] of Object.entries(GROUP_HASHTAGS)) {
    if (titleLower.includes(group) || article.tags.some((t) => t.toLowerCase().includes(group))) {
      groupHashtags.split(' ').forEach((tag) => hashtags.add(tag));
    }
  }

  // Add KPOPDaily branding
  hashtags.add('#KPOPDaily');

  // Limit to 6 hashtags for better readability
  return Array.from(hashtags).slice(0, 6).join(' ');
}

// Category-specific emojis and CTAs for engagement (English for global audience)
const CATEGORY_CONFIG: Record<string, { emoji: string; ctas: string[] }> = {
  news: {
    emoji: '🔥',
    ctas: [
      'Thoughts? 👇',
      'What do you think? 💬',
      'Share if you\'re a fan! 🔄',
      'Is this real?! 😱',
    ],
  },
  music: {
    emoji: '🎵',
    ctas: [
      'Are you excited? 🎧',
      'What\'s your favorite track? 💜',
      'How do you feel about this comeback? 🔥',
      'Ready to stream? 📱',
    ],
  },
  drama: {
    emoji: '🎬',
    ctas: [
      'Are you watching this? 📺',
      'The chemistry looks amazing! 💕',
      'Predict the next episode! 🤔',
      'Who\'s watching live? ✋',
    ],
  },
  celebrity: {
    emoji: '⭐',
    ctas: [
      'Follow for more updates! 💫',
      'Never seen this side before 😍',
      'Absolutely perfect, agree? 🙌',
      'Stan material right here 💖',
    ],
  },
  audition: {
    emoji: '🎤',
    ctas: [
      'Future star in the making! 🌟',
      'Drop your support below! 📝',
      'Who are you rooting for? 👀',
      'Next big thing? ⭐',
    ],
  },
  fashion: {
    emoji: '👗',
    ctas: [
      'Rate this look! 💅',
      'Fashion score out of 10? 🔟',
      'Would you wear this? 💖',
      'Airport fashion goals 👑',
    ],
  },
  variety: {
    emoji: '🎭',
    ctas: [
      'This moment is legendary 😂',
      'Entertainment king/queen! 🤣',
      'Try not to laugh challenge 😆',
      'Save this clip! 📸',
    ],
  },
};

// Get random CTA for category
function getRandomCTA(category: string): string {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['news'];
  return config.ctas[Math.floor(Math.random() * config.ctas.length)];
}

// Create Threads post text - optimized for engagement
function createPostText(article: ArticleMetadata): string {
  const hashtags = generateHashtags(article);
  const articleUrl = `${SITE_URL}/article/${article.slug}`;
  const config = CATEGORY_CONFIG[article.category] || CATEGORY_CONFIG['news'];
  const cta = getRandomCTA(article.category);

  // Truncate title if too long (Threads has 500 char limit)
  const maxTitleLength = 100;
  let title = article.title;
  if (title.length > maxTitleLength) {
    title = title.slice(0, maxTitleLength - 3) + '...';
  }

  // Truncate summary for better readability
  const maxSummaryLength = 100;
  let summary = article.summary;
  if (summary.length > maxSummaryLength) {
    summary = summary.slice(0, maxSummaryLength - 3) + '...';
  }

  // New engaging format with CTA
  return `${config.emoji} ${title}

${summary}

${cta}

🔗 ${articleUrl}

${hashtags}`;
}

// Create a Threads media container
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

    if (imageUrl) {
      // Image must be publicly accessible URL
      params.image_url = imageUrl;
    }

    const response = await fetch(
      `https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params),
      }
    );

    const data = await response.json();

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

// Publish the Threads post
async function publishThread(containerId: string): Promise<boolean> {
  if (!THREADS_USER_ID || !THREADS_ACCESS_TOKEN) {
    return false;
  }

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

    const data = await response.json();

    if (data.id) {
      console.log(`  Thread published: ${data.id}`);
      return true;
    } else {
      console.error('  Failed to publish thread:', data);
      return false;
    }
  } catch (error) {
    console.error('  Error publishing thread:', error);
    return false;
  }
}

// Post article to Threads
async function postToThreads(article: ArticleMetadata): Promise<boolean> {
  console.log(`\nPosting to Threads: ${article.title.slice(0, 50)}...`);

  const text = createPostText(article);

  // Get full image URL (must be publicly accessible)
  let imageUrl: string | undefined;
  if (article.thumbnail) {
    imageUrl = `${SITE_URL}${article.thumbnail}`;
  }

  // Step 1: Try with image first
  let containerId = await createMediaContainer(text, imageUrl);

  // Fallback: If image fails, try text-only post
  if (!containerId && imageUrl) {
    console.log('  Image post failed, retrying with text only...');
    containerId = await createMediaContainer(text, undefined);
  }

  if (!containerId) {
    console.error('  Failed to create post (both image and text-only attempts failed)');
    return false;
  }

  // Wait for media to be processed (required by Threads API)
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Step 2: Publish the thread
  return await publishThread(containerId);
}

// Main function
async function main(): Promise<void> {
  console.log('Starting Threads auto-posting...');
  console.log(`Time: ${new Date().toISOString()}`);

  // Check credentials
  if (!THREADS_USER_ID || !THREADS_ACCESS_TOKEN) {
    console.log('\n⚠️  Threads credentials not configured.');
    console.log('Set THREADS_USER_ID and THREADS_ACCESS_TOKEN environment variables.');
    console.log('\nTo get these credentials:');
    console.log('1. Go to Meta Developer Portal: https://developers.facebook.com/');
    console.log('2. Create an app with Threads API access');
    console.log('3. Connect your Instagram Business account');
    console.log('4. Generate a long-lived access token');
    return;
  }

  // Load already posted slugs
  const postedSlugs = loadPostedSlugs();
  console.log(`Previously posted: ${postedSlugs.size} articles`);

  // Get recent articles
  const recentArticles = getRecentArticles();
  console.log(`Recent articles (24h): ${recentArticles.length}`);

  // Filter out already posted
  const newArticles = recentArticles.filter((a) => !postedSlugs.has(a.slug));
  console.log(`New articles to post: ${newArticles.length}`);

  if (newArticles.length === 0) {
    console.log('No new articles to post to Threads.');
    return;
  }

  let postedCount = 0;

  // Post each new article
  for (const article of newArticles) {
    const success = await postToThreads(article);

    if (success) {
      postedSlugs.add(article.slug);
      postedCount++;
    }

    // Rate limiting (Threads recommends 1 request per 3 seconds minimum)
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Save posted slugs
  savePostedSlugs(postedSlugs);

  console.log(`\nDone! Posted ${postedCount} articles to Threads.`);
}

// Run
main().catch(console.error);
