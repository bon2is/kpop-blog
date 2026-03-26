/**
 * post-discord.ts
 * Posts top K-Pop articles to a Discord channel via Webhook.
 *
 * Setup:
 * 1. Discord server → channel settings → Integrations → Webhooks → New Webhook
 * 2. Copy webhook URL → set DISCORD_WEBHOOK_URL in .env
 *
 * Usage: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/post-discord.ts
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpop.andxo.com';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const CONTENT_DIR = path.join(process.cwd(), 'content/posts');
const POSTED_FILE = path.join(process.cwd(), 'content/.discord-posted.json');

const MAX_POSTS_PER_RUN = 3;

// Brand color (pink/purple for K-Pop vibe)
const EMBED_COLOR = 0xff69b4; // hot pink

interface ArticleMeta {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  publishedAt: string;
  thumbnail?: string;
}

// --- Engagement scoring (same logic as post-threads.ts) ---
const HIGH_INTEREST_ARTISTS = [
  'bts', 'blackpink', 'twice', 'aespa', 'ive', 'newjeans', 'stray kids',
  'seventeen', 'nct', 'exo', 'bigbang', 'red velvet', 'got7', 'monsta x',
  'txt', 'enhypen', 'le sserafim', 'itzy', 'gidle', 'ateez',
  'jungkook', 'jennie', 'lisa', 'rosé', 'jimin',
];
const HOOK_KEYWORDS = [
  'dating', 'relationship', 'married', 'wedding', 'pregnant', 'break up',
  'comeback', 'new album', 'mv', 'music video', 'world tour', 'concert',
  'controversy', 'backlash', 'accused', 'responds', 'shocking', 'reveals',
  'disbands', 'leaves', 'joins', 'confirmed', 'breaks record', 'million',
];

function scoreArticle(article: ArticleMeta): number {
  const titleLower = article.title.toLowerCase();
  const tagsLower = article.tags.map((t) => t.toLowerCase());
  let score = 0;
  for (const artist of HIGH_INTEREST_ARTISTS) {
    if (titleLower.includes(artist) || tagsLower.some((t) => t.includes(artist))) score += 30;
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
  fs.writeFileSync(
    POSTED_FILE,
    JSON.stringify({ slugs: Array.from(slugs), lastUpdated: new Date().toISOString() }, null, 2),
  );
}

// --- Article loading ---
function getTopArticles(topN: number): ArticleMeta[] {
  const articles: ArticleMeta[] = [];
  const now = new Date();
  const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'));
  for (const file of files) {
    const { data } = matter(fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8'));
    if (new Date(data.publishedAt) >= cutoff) {
      articles.push({
        slug: file.replace('.md', ''),
        title: data.title,
        excerpt: data.excerpt || data.summary || '',
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

// --- Category → emoji ---
function categoryEmoji(category: string): string {
  const map: Record<string, string> = {
    music: '🎵',
    drama: '🎬',
    celebrity: '⭐',
    variety: '📺',
    fashion: '👗',
    news: '📰',
    audition: '🎤',
  };
  return map[category] ?? '📌';
}

// --- Discord Embed payload ---
function buildEmbed(article: ArticleMeta) {
  const articleUrl = `${SITE_URL}/article/${article.slug}/`;
  const tagsStr = article.tags.map((t) => `\`${t}\``).join(' ');
  const emoji = categoryEmoji(article.category);

  const embed: Record<string, unknown> = {
    title: `${emoji} ${article.title}`,
    url: articleUrl,
    description: article.excerpt
      ? article.excerpt.slice(0, 200)
      : 'Read the full article on KPop Daily.',
    color: EMBED_COLOR,
    footer: {
      text: 'KPop Daily • kpop.andxo.com',
    },
    timestamp: new Date(article.publishedAt).toISOString(),
  };

  if (tagsStr) {
    (embed as Record<string, unknown>).fields = [
      { name: 'Tags', value: tagsStr, inline: false },
    ];
  }

  if (article.thumbnail) {
    const thumbUrl = article.thumbnail.startsWith('http')
      ? article.thumbnail
      : `${SITE_URL}${article.thumbnail}`;
    embed.image = { url: thumbUrl };
  }

  return embed;
}

// --- Post to Discord ---
async function postEmbed(embed: Record<string, unknown>): Promise<boolean> {
  if (!WEBHOOK_URL) {
    console.error('Missing DISCORD_WEBHOOK_URL in .env');
    return false;
  }

  const res = await fetch(`${WEBHOOK_URL}?wait=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'KPop Daily',
      avatar_url: `${SITE_URL}/og-image.png`,
      embeds: [embed],
    }),
  });

  if (res.ok) {
    const data = await res.json() as { id?: string };
    console.log(`  Posted (message id: ${data.id})`);
    return true;
  }

  const err = await res.text();
  console.error(`  Discord error ${res.status}:`, err.slice(0, 200));
  return false;
}

// --- Main ---
async function main(): Promise<void> {
  console.log('Starting Discord auto-posting...');
  console.log(`Time: ${new Date().toISOString()}`);

  if (!WEBHOOK_URL) {
    console.error('DISCORD_WEBHOOK_URL not set. Exiting.');
    process.exit(1);
  }

  const postedSlugs = loadPostedSlugs();
  console.log(`Previously posted: ${postedSlugs.size} articles`);

  const topArticles = getTopArticles(10);
  console.log(`Top candidates (48h): ${topArticles.length}`);
  topArticles.forEach((a) => console.log(`  [score:${scoreArticle(a)}] ${a.title.slice(0, 60)}`));

  const toPost = topArticles.filter((a) => !postedSlugs.has(a.slug));
  const selected = toPost.slice(0, MAX_POSTS_PER_RUN);

  if (selected.length === 0) {
    console.log('No new articles to post to Discord.');
    return;
  }

  let postedCount = 0;

  for (const article of selected) {
    console.log(`\nPosting: ${article.title.slice(0, 60)}...`);
    const embed = buildEmbed(article);
    const success = await postEmbed(embed);
    if (success) {
      postedSlugs.add(article.slug);
      postedCount++;
    }

    // Small delay between posts
    if (selected.indexOf(article) < selected.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  savePostedSlugs(postedSlugs);
  console.log(`\nDone! Posted ${postedCount} articles to Discord.`);
}

main().catch(console.error);
