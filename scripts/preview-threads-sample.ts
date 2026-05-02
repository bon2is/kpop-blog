/**
 * Preview script: shows before/after comparison for 5 sample articles.
 * Run: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/preview-threads-sample.ts
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import OpenAI from 'openai';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpop.andxo.com';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const CONTENT_DIR = path.join(process.cwd(), 'content/posts');

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

// ─── Old logic (before) ──────────────────────────────────────────────────────

const OLD_CATEGORY_HASHTAGS: Record<string, string[]> = {
  news: ['#KPOP', '#KPOPNews', '#KoreanNews', '#Hallyu'],
  music: ['#KPOP', '#KPOPMusic', '#NewMusic', '#KPOPComeback', '#MusicVideo'],
  drama: ['#KDrama', '#KoreanDrama', '#Hallyu', '#KDramaNews'],
  celebrity: ['#KPOP', '#KPOPIdol', '#Celebrity', '#KoreanCeleb'],
};

const OLD_CATEGORY_EMOJI: Record<string, string> = {
  news: '🔥', music: '🎵', drama: '🎬', celebrity: '⭐', audition: '🎤',
  fashion: '👗', variety: '🎭',
};

function oldCreatePostText(article: ArticleMetadata): string {
  const catTags = OLD_CATEGORY_HASHTAGS[article.category] || OLD_CATEGORY_HASHTAGS['news'];
  const hashtags = [...catTags, '#KPOPDaily'].join(' ');
  const emoji = OLD_CATEGORY_EMOJI[article.category] || '🔥';
  const title = article.title.length > 100 ? article.title.slice(0, 97) + '...' : article.title;
  const summary = article.summary.length > 100 ? article.summary.slice(0, 97) + '...' : article.summary;
  const ctas = ['Thoughts? 👇', 'What do you think? 💬', 'Share if you\'re a fan! 🔄'];
  const cta = ctas[Math.floor(Math.random() * ctas.length)];
  const url = `${SITE_URL}/article/${article.slug}`;

  return `${emoji} ${title}

${summary}

${cta}

🔗 ${url}

${hashtags}`;
}

// ─── New logic (after) ───────────────────────────────────────────────────────

const BASE_HASHTAGS = ['#kpop', '#kdrama', '#kpopnews', '#kpopdaily'];

const NEW_CATEGORY_HASHTAGS: Record<string, string[]> = {
  news: ['#KPOPNews', '#KoreanNews'],
  music: ['#KPOPMusic', '#NewMusic', '#KPOPComeback'],
  drama: ['#KoreanDrama', '#KDramaNews'],
  celebrity: ['#KPOPIdol', '#Celebrity'],
  tour: ['#KPOPTour', '#KPOPConcert'],
  chart: ['#billboard', '#spotify'],
};

const GROUP_HASHTAGS: Record<string, string[]> = {
  'bts': ['#BTS', '#ARMY'],
  'blackpink': ['#BLACKPINK', '#BLINK'],
  'aespa': ['#aespa', '#MY'],
  'ive': ['#IVE', '#DIVE'],
  'newjeans': ['#NewJeans'],
  'stray kids': ['#StrayKids', '#STAY'],
  'twice': ['#TWICE', '#ONCE'],
  'jennie': ['#Jennie'],
};

function newGenerateHashtags(article: ArticleMetadata): string {
  const hashtags: Set<string> = new Set(BASE_HASHTAGS);
  const catTags = NEW_CATEGORY_HASHTAGS[article.category] || [];
  catTags.forEach((t) => hashtags.add(t));

  const titleLower = article.title.toLowerCase();
  if (titleLower.includes('chart') || titleLower.includes('billboard') || titleLower.includes('record')) {
    ['#billboard', '#spotify'].forEach((t) => hashtags.add(t));
  }

  for (const [group, tags] of Object.entries(GROUP_HASHTAGS)) {
    if (titleLower.includes(group) || article.tags.some((t) => t.toLowerCase().includes(group))) {
      tags.forEach((t) => hashtags.add(t));
      break;
    }
  }

  return Array.from(hashtags).slice(0, 8).join(' ');
}

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

async function generateHook(article: ArticleMetadata, client: OpenAI | null): Promise<string> {
  if (!client) return `🔥 ${article.title}`;

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 150,
      messages: [
        { role: 'system', content: HOOK_SYSTEM_PROMPT },
        { role: 'user', content: `Headline: "${article.title}"\nSummary: "${article.excerpt}"` },
      ],
    });
    const text = response.choices[0]?.message?.content?.trim() ?? '';
    return text || `🔥 ${article.title}`;
  } catch {
    return `🔥 ${article.title}`;
  }
}

type PostType = 'traffic' | 'conversion';

async function newBuildPost(
  article: ArticleMetadata,
  postType: PostType,
  client: OpenAI | null
): Promise<{ mainText: string; commentText: string | null }> {
  const hook = await generateHook(article, client);
  const hashtags = newGenerateHashtags(article);
  const articleUrl = `${SITE_URL}/article/${article.slug}`;

  let mainText: string;
  let commentText: string | null = null;

  if (postType === 'traffic') {
    mainText = `${hook}\n\n${hashtags}`;
  } else {
    mainText = `${hook}\n\nFull story in the comments 👇\n\n${hashtags}`;
    commentText = `🔗 Read the full story: ${articleUrl}`;
  }

  if (mainText.length > 495) mainText = mainText.slice(0, 492) + '...';
  return { mainText, commentText };
}

// ─── Loader ──────────────────────────────────────────────────────────────────

function loadArticle(filePath: string): ArticleMetadata | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(content);
    const slug = path.basename(filePath, '.md');
    return {
      title: data.title,
      excerpt: data.excerpt || '',
      summary: data.summary || '',
      category: data.category || 'news',
      tags: data.tags || [],
      publishedAt: data.publishedAt,
      thumbnail: data.thumbnail,
      slug,
    };
  } catch {
    return null;
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const samples = [
    'bts-rm-sparks-debate.md',
    'blackpink-jennies-stunning-red-carpet-appearance-at-the-40th.md',
    'bts-breaks-down.md',
    'bts-faces-backlash-over-netflix-footage.md',
    'jung-ga-ram-takes-on-unconventional-role-in-new-film-the-ult.md',
  ];

  const client = GROQ_API_KEY
    ? new OpenAI({ apiKey: GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' })
    : null;
  console.log(`\nGroq API: ${client ? 'ENABLED' : 'DISABLED (set GROQ_API_KEY to enable hooks)'}`);
  console.log('='.repeat(70));

  const postTypes: PostType[] = ['traffic', 'traffic', 'traffic', 'traffic', 'traffic', 'traffic', 'traffic', 'conversion', 'conversion', 'conversion'];
  let idx = 0;

  for (const filename of samples) {
    const filePath = path.join(CONTENT_DIR, filename);
    const article = loadArticle(filePath);
    if (!article) {
      console.log(`\n[SKIP] File not found: ${filename}`);
      continue;
    }

    const postType = postTypes[idx % 10] as PostType;
    idx++;

    const oldText = oldCreatePostText(article);
    const { mainText, commentText } = await newBuildPost(article, postType, client);

    console.log(`\n${'━'.repeat(70)}`);
    console.log(`ARTICLE: ${article.title}`);
    console.log(`TYPE: [${postType.toUpperCase()}] | CATEGORY: ${article.category}`);
    console.log(`${'━'.repeat(70)}`);

    console.log('\n❌ BEFORE (old format):');
    console.log('─'.repeat(40));
    console.log(oldText);
    console.log(`\n[Length: ${oldText.length} chars]`);

    console.log('\n✅ AFTER (new format):');
    console.log('─'.repeat(40));
    console.log(mainText);
    if (commentText) {
      console.log(`\n[COMMENT to auto-post]: ${commentText}`);
    }
    console.log(`\n[Length: ${mainText.length}/500 chars]`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('Preview complete.');
}

main().catch(console.error);
