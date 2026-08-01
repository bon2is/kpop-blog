/**
 * post-pinterest.ts
 * Auto-posts K-Pop articles to Pinterest using the Pinterest API v5.
 *
 * Setup:
 * 1. Create an app at https://developers.pinterest.com/
 * 2. Generate an access token with boards:read, pins:read, pins:write permissions
 * 3. Set PINTEREST_ACCESS_TOKEN and PINTEREST_BOARD_ID in GitHub Secrets
 *
 * Usage: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/post-pinterest.ts
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const PINTEREST_ACCESS_TOKEN = process.env.PINTEREST_ACCESS_TOKEN;
const PINTEREST_BOARD_ID = process.env.PINTEREST_BOARD_ID;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpop.andxo.com';

const CONTENT_DIR = path.join(process.cwd(), 'content/posts');
const POSTED_FILE = path.join(process.cwd(), 'content/.pinterest-posted.json');

const MAX_POSTS_PER_RUN = 3;

interface ArticleMeta {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  publishedAt: string;
  thumbnail?: string;
}

interface PostedRecord {
  slugs: string[];
  lastUpdated: string;
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  music: '🎵 K-Pop Music Update | Your daily dose of comebacks, MVs, and chart-topping hits from your favorite K-Pop artists.',
  drama: '🎬 K-Drama Alert | The latest casting news, trailers, and episode updates from Korea\'s hottest dramas.',
  celebrity: '⭐ K-Pop Idol News | Stay up to date with your favorite idols — schedules, appearances, and exclusive updates.',
  news: '🔥 K-Pop Breaking News | The K-Pop story everyone is talking about today.',
  audition: '🎤 K-Pop Debut Buzz | New groups, survival shows, and the next generation of K-Pop stars.',
  fashion: '👗 K-Pop Style | Iconic looks, runway moments, and trendsetting fashion from K-Pop\'s biggest names.',
  variety: '🎭 K-Pop Variety Moments | The funniest and most wholesome moments from Korean variety shows.',
};

const CATEGORY_HASHTAGS: Record<string, string[]> = {
  music: ['#KPopMusic', '#KPopComeback', '#KPopMV', '#KPopCharts', '#KoreanPop'],
  drama: ['#KDrama', '#KoreanDrama', '#KDramaRecommendation', '#KDramaAddict'],
  celebrity: ['#KPopIdol', '#KoreanCelebrity', '#HallyuStar', '#KPopStar'],
  news: ['#KPopNews', '#KPopUpdate', '#Hallyu', '#KoreanNews'],
  audition: ['#KPopDebut', '#NewKPopGroup', '#KPopAudition', '#KPopTrainee'],
  fashion: ['#KPopFashion', '#KoreanFashion', '#KPopStyle', '#KPopOOTD'],
  variety: ['#KPopVariety', '#KoreanVariety', '#KPopMoments'],
};

const SEA_HASHTAGS = ['#KPopIndonesia', '#KPopPhilippines', '#KPopThailand', '#KPopFan'];
const BASE_HASHTAGS = ['#KPOP', '#KPOPDaily', '#KoreanEntertainment', '#KoreanPop', '#Hallyu'];

function loadPostedSlugs(): Set<string> {
  try {
    if (fs.existsSync(POSTED_FILE)) {
      const data: PostedRecord = JSON.parse(fs.readFileSync(POSTED_FILE, 'utf-8'));
      return new Set(data.slugs || []);
    }
  } catch {
    // ignore
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

function getUnpostedArticles(): ArticleMeta[] {
  const postedSlugs = loadPostedSlugs();
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'));
  const articles: ArticleMeta[] = [];

  for (const file of files) {
    const slug = file.replace('.md', '');
    if (postedSlugs.has(slug)) continue;

    const { data } = matter(fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8'));
    // Only post articles with thumbnails for better Pinterest engagement
    if (!data.thumbnail) continue;

    articles.push({
      slug,
      title: data.title || '',
      excerpt: data.excerpt || '',
      category: data.category || 'news',
      tags: data.tags || [],
      publishedAt: data.publishedAt || new Date().toISOString(),
      thumbnail: data.thumbnail,
    });
  }

  // Sort newest first
  return articles.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

function buildPinDescription(article: ArticleMeta): string {
  const categoryDesc = CATEGORY_DESCRIPTIONS[article.category] || CATEGORY_DESCRIPTIONS['news'];
  const categoryTags = CATEGORY_HASHTAGS[article.category] || CATEGORY_HASHTAGS['news'];

  // Article-specific tags (up to 6), normalized to hashtag format
  const articleTags = article.tags
    .slice(0, 6)
    .map((t) => `#${t.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')}`)
    .filter((t) => t.length > 2);

  // Combine all hashtags, dedup, join (Pinterest allows ~800 chars total)
  const allTags = Array.from(new Set([...articleTags, ...categoryTags, ...SEA_HASHTAGS, ...BASE_HASHTAGS]));
  const hashtags = allTags.join(' ');

  // Pinterest supports up to ~800 chars — expand excerpt from 200 → 350
  const maxExcerptLen = 350;
  const excerpt =
    article.excerpt.length > maxExcerptLen
      ? article.excerpt.slice(0, maxExcerptLen - 3) + '...'
      : article.excerpt;

  const cta = '→ Read the full story at kpop.andxo.com';

  return `${categoryDesc}\n\n${excerpt}\n\n${cta}\n\n${hashtags}`;
}

async function createPin(article: ArticleMeta): Promise<boolean> {
  if (!PINTEREST_ACCESS_TOKEN || !PINTEREST_BOARD_ID) {
    console.error('Missing Pinterest credentials');
    return false;
  }

  const imageUrl = `${SITE_URL}${article.thumbnail}`;
  const articleUrl = `${SITE_URL}/article/${article.slug}/`;
  const description = buildPinDescription(article);

  try {
    const response = await fetch('https://api.pinterest.com/v5/pins', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINTEREST_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        board_id: PINTEREST_BOARD_ID,
        title: article.title.slice(0, 100),
        description,
        link: articleUrl,
        media_source: {
          source_type: 'image_url',
          url: imageUrl,
        },
      }),
    });

    const data = await response.json();

    if (data.id) {
      console.log(`  ✓ Pin created: ${data.id}`);
      return true;
    } else {
      console.error('  ✗ Failed:', JSON.stringify(data));
      return false;
    }
  } catch (error) {
    console.error('  ✗ Error:', error);
    return false;
  }
}

async function main(): Promise<void> {
  console.log('Starting Pinterest auto-posting...');
  console.log(`Time: ${new Date().toISOString()}`);

  if (!PINTEREST_ACCESS_TOKEN || !PINTEREST_BOARD_ID) {
    console.log('\n⚠️  Pinterest credentials not configured.');
    console.log('Set PINTEREST_ACCESS_TOKEN and PINTEREST_BOARD_ID environment variables.');
    console.log('\nSetup steps:');
    console.log('1. Create an app at https://developers.pinterest.com/');
    console.log('2. Get access token with pins:write and boards:read permissions');
    console.log('3. Get your board ID from Pinterest board URL');
    console.log('4. Add PINTEREST_ACCESS_TOKEN and PINTEREST_BOARD_ID to GitHub Secrets');
    return;
  }

  const postedSlugs = loadPostedSlugs();
  const articles = getUnpostedArticles();

  console.log(`Unposted articles with thumbnails: ${articles.length}`);

  if (articles.length === 0) {
    console.log('No new articles to post.');
    return;
  }

  const toPost = articles.slice(0, MAX_POSTS_PER_RUN);
  let postedCount = 0;

  for (const article of toPost) {
    console.log(`\nPosting: ${article.title.slice(0, 60)}...`);
    const success = await createPin(article);

    if (success) {
      postedSlugs.add(article.slug);
      postedCount++;
    }

    // Pinterest rate limit: 3 requests per second
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  savePostedSlugs(postedSlugs);
  console.log(`\nDone! Posted ${postedCount} pins to Pinterest.`);
}

main().catch(console.error);
