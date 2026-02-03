import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Threads API Configuration
const THREADS_USER_ID = process.env.THREADS_USER_ID;
const THREADS_ACCESS_TOKEN = process.env.THREADS_ACCESS_TOKEN;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpop.andxo.com';
const CONTENT_DIR = path.join(process.cwd(), 'content/posts');

// Category config (same as updated post-threads.ts)
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
    ctas: ['Are you watching this? 📺', 'The chemistry looks amazing! 💕'],
  },
  celebrity: {
    emoji: '⭐',
    ctas: ['Follow for more updates! 💫', 'Never seen this side before 😍', 'Absolutely perfect, agree? 🙌', 'Stan material right here 💖'],
  },
};

const GROUP_HASHTAGS: Record<string, string> = {
  'bts': '#BTS #ARMY',
  'blackpink': '#BLACKPINK #BLINK',
  'twice': '#TWICE #ONCE',
  'illit': '#ILLIT',
  'ive': '#IVE #DIVE',
  'newjeans': '#NewJeans #Bunnies',
  'aespa': '#aespa #MY',
};

function generateHashtags(title: string, category: string, tags: string[]): string {
  const hashtags: Set<string> = new Set(['#KPOP', '#KPOPDaily']);

  if (category === 'news') hashtags.add('#KPOPNews');
  if (category === 'music') hashtags.add('#KPOPMusic');

  const titleLower = title.toLowerCase();
  for (const [group, groupHashtags] of Object.entries(GROUP_HASHTAGS)) {
    if (titleLower.includes(group) || tags.some(t => t.toLowerCase().includes(group))) {
      groupHashtags.split(' ').forEach(tag => hashtags.add(tag));
    }
  }

  return Array.from(hashtags).slice(0, 6).join(' ');
}

async function createMediaContainer(text: string, imageUrl?: string): Promise<string | null> {
  const params: Record<string, string> = {
    media_type: imageUrl ? 'IMAGE' : 'TEXT',
    text,
    access_token: THREADS_ACCESS_TOKEN!,
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
  const data = await response.json();
  console.log('Container response:', data);
  return data.id || null;
}

async function publishThread(containerId: string): Promise<boolean> {
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
  const data = await response.json();
  console.log('Publish response:', data);
  return !!data.id;
}

async function main() {
  console.log('=== TEST POST WITH NEW FORMAT ===\n');

  if (!THREADS_USER_ID || !THREADS_ACCESS_TOKEN) {
    console.log('❌ Missing Threads credentials');
    return;
  }

  // Get ILLIT tour article for test
  const targetFile = 'illit-announces-stops-for-press-start-tour-in-asia-d96aae43beff.md';
  const filePath = path.join(CONTENT_DIR, targetFile);

  if (!fs.existsSync(filePath)) {
    console.log('❌ Target file not found');
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const { data } = matter(content);
  const slug = targetFile.replace('.md', '');

  const config = CATEGORY_CONFIG[data.category as string] || CATEGORY_CONFIG['news'];
  const cta = config.ctas[Math.floor(Math.random() * config.ctas.length)];
  const hashtags = generateHashtags(data.title as string, data.category as string, (data.tags as string[]) || []);

  let title = data.title as string;
  if (title.length > 100) title = title.slice(0, 97) + '...';

  let summary = (data.summary || data.excerpt || '') as string;
  if (summary.length > 100) summary = summary.slice(0, 97) + '...';

  const postText = `${config.emoji} ${title}

${summary}

${cta}

🔗 ${SITE_URL}/article/${slug}

${hashtags}`;

  console.log('Post preview:');
  console.log('-------------------------------------------');
  console.log(postText);
  console.log('-------------------------------------------\n');

  // Post to Threads
  console.log('Posting to Threads...');

  const imageUrl = data.thumbnail ? `${SITE_URL}${data.thumbnail}` : undefined;
  console.log('Image URL:', imageUrl);

  let containerId = await createMediaContainer(postText, imageUrl);

  if (!containerId && imageUrl) {
    console.log('Image failed, trying text only...');
    containerId = await createMediaContainer(postText);
  }

  if (!containerId) {
    console.log('❌ Failed to create media container');
    return;
  }

  console.log(`Container created: ${containerId}`);
  console.log('Waiting 3 seconds for processing...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  const success = await publishThread(containerId);

  if (success) {
    console.log('\n✅ Posted successfully!');
    console.log('Check @andy.ssong on Threads');
  } else {
    console.log('\n❌ Failed to publish');
  }
}

main().catch(console.error);
