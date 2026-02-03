import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

/**
 * Post backlog articles to Threads
 * Posts older articles that haven't been posted yet
 * Designed to run periodically to catch up on unposted content
 */

// Configuration
const THREADS_USER_ID = process.env.THREADS_USER_ID;
const THREADS_ACCESS_TOKEN = process.env.THREADS_ACCESS_TOKEN;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpop.andxo.com';
const CONTENT_DIR = path.join(process.cwd(), 'content/posts');
const POSTED_FILE = path.join(process.cwd(), 'content/.threads-posted.json');

// How many backlog posts per run (avoid spam)
const MAX_BACKLOG_POSTS = 2;

// Category config
const CATEGORY_CONFIG: Record<string, { emoji: string; ctas: string[] }> = {
  news: {
    emoji: '🔥',
    ctas: ['Thoughts? 👇', 'What do you think? 💬', 'Share if you\'re a fan! 🔄', 'Is this real?! 😱'],
  },
  music: {
    emoji: '🎵',
    ctas: ['Are you excited? 🎧', 'What\'s your favorite track? 💜', 'How do you feel about this comeback? 🔥', 'Ready to stream? 📱'],
  },
  drama: {
    emoji: '🎬',
    ctas: ['Are you watching this? 📺', 'The chemistry looks amazing! 💕', 'Predict the next episode! 🤔', 'Who\'s watching live? ✋'],
  },
  celebrity: {
    emoji: '⭐',
    ctas: ['Follow for more updates! 💫', 'Never seen this side before 😍', 'Absolutely perfect, agree? 🙌', 'Stan material right here 💖'],
  },
  audition: {
    emoji: '🎤',
    ctas: ['Future star in the making! 🌟', 'Drop your support below! 📝', 'Who are you rooting for? 👀', 'Next big thing? ⭐'],
  },
  fashion: {
    emoji: '👗',
    ctas: ['Rate this look! 💅', 'Fashion score out of 10? 🔟', 'Would you wear this? 💖', 'Airport fashion goals 👑'],
  },
  variety: {
    emoji: '🎭',
    ctas: ['This moment is legendary 😂', 'Entertainment king/queen! 🤣', 'Try not to laugh challenge 😆', 'Save this clip! 📸'],
  },
};

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
  'illit': '#ILLIT',
  'babymonster': '#BABYMONSTER',
  'red velvet': '#RedVelvet #ReVeluv',
  'tws': '#TWS',
  'boynextdoor': '#BOYNEXTDOOR',
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

function generateHashtags(title: string, category: string, tags: string[]): string {
  const hashtags: Set<string> = new Set(['#KPOP', '#KPOPDaily']);

  if (category === 'news') hashtags.add('#KPOPNews');
  if (category === 'music') hashtags.add('#KPOPMusic');
  if (category === 'drama') hashtags.add('#KDrama');

  const titleLower = title.toLowerCase();
  for (const [group, groupHashtags] of Object.entries(GROUP_HASHTAGS)) {
    if (titleLower.includes(group) || tags.some(t => t.toLowerCase().includes(group))) {
      groupHashtags.split(' ').forEach(tag => hashtags.add(tag));
    }
  }

  return Array.from(hashtags).slice(0, 6).join(' ');
}

function createPostText(data: ArticleData, slug: string): string {
  const config = CATEGORY_CONFIG[data.category] || CATEGORY_CONFIG['news'];
  const cta = config.ctas[Math.floor(Math.random() * config.ctas.length)];
  const hashtags = generateHashtags(data.title, data.category, data.tags || []);

  let title = data.title;
  if (title.length > 100) title = title.slice(0, 97) + '...';

  let summary = (data.summary || data.excerpt || '') as string;
  if (summary.length > 100) summary = summary.slice(0, 97) + '...';

  return `${config.emoji} ${title}

${summary}

${cta}

🔗 ${SITE_URL}/article/${slug}

${hashtags}`;
}

async function createMediaContainer(text: string, imageUrl?: string): Promise<string | null> {
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
    const result = await response.json();
    return result.id || null;
  } catch (error) {
    console.error('Error creating container:', error);
    return null;
  }
}

async function publishThread(containerId: string): Promise<boolean> {
  try {
    const response = await fetch(
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
    const result = await response.json();
    return !!result.id;
  } catch (error) {
    console.error('Error publishing:', error);
    return false;
  }
}

async function postArticle(file: string, postedSlugs: Set<string>): Promise<boolean> {
  const filePath = path.join(CONTENT_DIR, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const { data } = matter(content);
  const slug = file.replace('.md', '');

  console.log(`\nPosting: ${(data.title as string).slice(0, 50)}...`);

  const postText = createPostText(data as ArticleData, slug);
  const imageUrl = data.thumbnail ? `${SITE_URL}${data.thumbnail}` : undefined;

  let containerId = await createMediaContainer(postText, imageUrl);

  if (!containerId && imageUrl) {
    console.log('  Image failed, trying text only...');
    containerId = await createMediaContainer(postText);
  }

  if (!containerId) {
    console.log('  ❌ Failed to create container');
    return false;
  }

  await new Promise(resolve => setTimeout(resolve, 3000));

  const success = await publishThread(containerId);

  if (success) {
    console.log('  ✅ Posted!');
    postedSlugs.add(slug);
    return true;
  } else {
    console.log('  ❌ Failed to publish');
    return false;
  }
}

async function main() {
  console.log('=== THREADS BACKLOG POSTING ===');
  console.log(`Time: ${new Date().toISOString()}`);

  if (!THREADS_USER_ID || !THREADS_ACCESS_TOKEN) {
    console.log('❌ Missing Threads credentials');
    return;
  }

  const postedSlugs = loadPostedSlugs();
  console.log(`Previously posted: ${postedSlugs.size} articles`);

  // Get all articles
  const allFiles = fs.readdirSync(CONTENT_DIR)
    .filter(f => f.endsWith('.md'))
    .map(file => {
      const content = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
      const { data } = matter(content);
      return { file, publishedAt: new Date(data.publishedAt as string) };
    })
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

  // Filter unposted articles
  const unposted = allFiles.filter(({ file }) => !postedSlugs.has(file.replace('.md', '')));
  console.log(`Unposted articles: ${unposted.length}`);

  if (unposted.length === 0) {
    console.log('All articles have been posted!');
    return;
  }

  // Post up to MAX_BACKLOG_POSTS
  const toPost = unposted.slice(0, MAX_BACKLOG_POSTS);
  console.log(`Posting ${toPost.length} backlog article(s)...`);

  let posted = 0;
  for (const { file } of toPost) {
    const success = await postArticle(file, postedSlugs);
    if (success) posted++;

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Save updated posted list
  savePostedSlugs(postedSlugs);

  console.log(`\n=== DONE: Posted ${posted}/${toPost.length} articles ===`);
  console.log(`Remaining unposted: ${unposted.length - posted}`);
}

main().catch(console.error);
