import 'dotenv/config';
import Parser from 'rss-parser';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fetch = require('node-fetch');

const IMAGES_DIR = path.join(process.cwd(), 'public/images/posts');

// Generate context-aware image prompt using GPT (Studio Ghibli style)
async function generateImagePrompt(
  openai: OpenAI,
  title: string,
  summary: string,
  category: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert at creating DALL-E image prompts for K-pop/K-drama news article thumbnails in STUDIO GHIBLI ANIME STYLE.

BASE STYLE (ALWAYS include this):
"A hand-drawn anime illustration in the distinct style of Studio Ghibli, rendered with warm watercolor textures and soft, natural lighting."

RULES:
1. Create a SPECIFIC, VISUAL scene that represents the article's content
2. NEVER include real celebrity names or group names - instead describe a "stylized Korean celebrity" or "young Korean idol" with relevant visual characteristics
3. Include: expression (happy/shy/surprised/determined), location/background, and atmosphere
4. The overall atmosphere should be nostalgic, peaceful, and heartwarming - signature Ghibli feel
5. Be CONCRETE about visual elements: clothing, setting details, weather, lighting

TEMPLATE TO FOLLOW:
"A hand-drawn anime illustration in the distinct style of Studio Ghibli, rendered with warm watercolor textures and soft, natural lighting. The image is a header graphic for a Korean entertainment news article. It features [character description with expression] located in [specific location/background]. The overall atmosphere is [mood description]."

GOOD EXAMPLES:
- Drama romance: "...features a stylized young Korean actress with long flowing hair and a shy, hopeful expression, standing on a rooftop garden overlooking Seoul at sunset. Cherry blossom petals drift past as city lights begin to twinkle below. The overall atmosphere is nostalgic and romantically hopeful."
- Concert/Comeback: "...features a stylized K-pop idol with bright eyes and an excited expression, standing backstage with stage lights glowing behind curtains. Sparkles and confetti float in the air. The overall atmosphere is magical and anticipatory."
- Injury news: "...features a young dancer sitting by a window in a practice room, looking contemplative with a gentle, resilient expression. Soft afternoon light streams through, casting warm shadows. The overall atmosphere is bittersweet but hopeful."
- Award/Rankings: "...features a stylized Korean celebrity holding a golden trophy with a joyful, tearful expression. They stand on a grand stage with warm spotlights and floating golden particles. The overall atmosphere is triumphant and emotional."

BAD EXAMPLES:
- "Abstract neon lights" ❌
- No character or scene description ❌
- Realistic photo style ❌`
        },
        {
          role: 'user',
          content: `Create a DALL-E prompt for this K-pop news article in Studio Ghibli anime style:
Title: ${title}
Summary: ${summary}
Category: ${category}

Return ONLY the complete image prompt following the template. Make it specific and visual with Ghibli aesthetics.`
        }
      ],
      temperature: 0.8,
      max_tokens: 300,
    });

    const prompt = response.choices[0]?.message?.content?.trim();
    if (prompt) {
      return prompt;
    }
  } catch (error) {
    console.error('  Error generating image prompt:', error);
  }

  // Fallback prompts by category (Ghibli style)
  const fallbacks: Record<string, string> = {
    music: 'A hand-drawn anime illustration in the distinct style of Studio Ghibli, rendered with warm watercolor textures and soft, natural lighting. A stylized K-pop idol with sparkling eyes stands on a magical concert stage, surrounded by floating lightsticks glowing like fireflies. The overall atmosphere is dreamy and euphoric.',
    drama: 'A hand-drawn anime illustration in the distinct style of Studio Ghibli, rendered with warm watercolor textures and soft, natural lighting. Two silhouettes share an umbrella on a rainy Seoul street at twilight, neon signs reflecting on wet pavement. The overall atmosphere is nostalgic and romantically melancholic.',
    celebrity: 'A hand-drawn anime illustration in the distinct style of Studio Ghibli, rendered with warm watercolor textures and soft, natural lighting. A stylized Korean celebrity in elegant attire walks a red carpet with golden light streaming down. The overall atmosphere is glamorous yet warmly inviting.',
    audition: 'A hand-drawn anime illustration in the distinct style of Studio Ghibli, rendered with warm watercolor textures and soft, natural lighting. A young trainee practices alone in a sunlit dance studio, determination in their eyes as dust particles float in the warm light. The overall atmosphere is hopeful and inspiring.',
    fashion: 'A hand-drawn anime illustration in the distinct style of Studio Ghibli, rendered with warm watercolor textures and soft, natural lighting. A stylish figure walks through a trendy Seoul neighborhood with boutiques and cafes, autumn leaves swirling around. The overall atmosphere is chic yet cozy.',
    variety: 'A hand-drawn anime illustration in the distinct style of Studio Ghibli, rendered with warm watercolor textures and soft, natural lighting. A colorful TV studio set with whimsical decorations and warm stage lights, empty but inviting. The overall atmosphere is fun and magical.',
    news: 'A hand-drawn anime illustration in the distinct style of Studio Ghibli, rendered with warm watercolor textures and soft, natural lighting. A cozy newsroom with screens showing entertainment content, warm desk lamps glowing. The overall atmosphere is professional yet warmly nostalgic.',
  };

  return fallbacks[category] || fallbacks['news'];
}

// Download and save image locally as optimized WebP
async function downloadAndSaveImage(
  imageUrl: string,
  slug: string
): Promise<string | undefined> {
  try {
    // Ensure images directory exists
    if (!fs.existsSync(IMAGES_DIR)) {
      fs.mkdirSync(IMAGES_DIR, { recursive: true });
    }

    // Download image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const buffer = await response.buffer();

    // Convert to WebP with optimization (quality 85, effort 6)
    const filename = `${slug}.webp`;
    const filepath = path.join(IMAGES_DIR, filename);

    await sharp(buffer)
      .webp({ quality: 85, effort: 6 })
      .toFile(filepath);

    const originalSize = buffer.length;
    const newSize = fs.statSync(filepath).size;
    const savings = (((originalSize - newSize) / originalSize) * 100).toFixed(0);

    console.log(`  Image saved: ${filename} (${savings}% smaller than original)`);

    // Return the public URL path
    return `/images/posts/${filename}`;
  } catch (error) {
    console.error('  Error downloading/saving image:', error);
    return undefined;
  }
}

// Generate AI image using DALL-E with context-aware prompt
async function generateAIImage(
  openai: OpenAI,
  category: string,
  title: string,
  summary: string,
  slug: string
): Promise<string | undefined> {
  try {
    // Generate context-specific prompt using GPT
    console.log(`  Generating context-aware image prompt...`);
    const imagePrompt = await generateImagePrompt(openai, title, summary, category);

    // Add quality and style modifiers
    const finalPrompt = `${imagePrompt}. High quality photograph or digital art, 16:9 aspect ratio, professional lighting, suitable for news article thumbnail.`;

    console.log(`  Image prompt: ${imagePrompt.slice(0, 80)}...`);
    console.log(`  Generating DALL-E image for category: ${category}`);

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: finalPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    const imageUrl = response.data[0]?.url;
    if (imageUrl) {
      console.log('  AI image generated successfully');

      // Download and save locally
      const localPath = await downloadAndSaveImage(imageUrl, slug);
      if (localPath) {
        return localPath;
      }

      // Fallback to temporary URL if download fails
      console.log('  Warning: Using temporary URL (will expire in ~1 hour)');
      return imageUrl;
    }

    return undefined;
  } catch (error) {
    console.error('  Error generating AI image:', error);
    return undefined;
  }
}

// Types
interface RSSItem {
  title?: string;
  link?: string;
  pubDate?: string;
  content?: string;
  contentSnippet?: string;
  categories?: string[];
  creator?: string;
  enclosure?: { url?: string };
  'media:content'?: { $?: { url?: string } };
}

interface ProcessedArticle {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  summary: string;           // Brief summary (2-3 sentences)
  commentary: string;        // Our analysis/commentary
  originalTitle: string;     // Original article title for reference
  category: string;
  tags: string[];
  publishedAt: string;
  source: string;
  sourceUrl: string;
  thumbnail?: string;
  isAIGenerated: boolean;    // Flag for AI-generated thumbnail
}

// Configuration
// RSS Sources - Last verified: 2026-01-10
// Disabled sources are kept for reference in case they become available again
const RSS_SOURCES = [
  {
    name: 'Soompi',
    url: 'https://www.soompi.com/feed',
    enabled: true,
  },
  {
    name: 'Koreaboo',
    url: 'https://www.koreaboo.com/feed/',
    enabled: true,
  },
  {
    name: 'Korea Herald',
    url: 'https://www.koreaherald.com/rss/020200000000.xml',
    enabled: true,
  },
  // Disabled: RSS feed returning 404 as of 2026-01-10
  {
    name: 'AllKPop',
    url: 'https://www.allkpop.com/rss',
    enabled: false,
  },
  // Disabled: RSS feed returning 404 as of 2026-01-10
  {
    name: 'KpopStarz',
    url: 'https://www.kpopstarz.com/rss/category/5/kpop.xml',
    enabled: false,
  },
];

const CATEGORIES = ['news', 'music', 'drama', 'celebrity', 'audition', 'fashion', 'variety'];

const CONTENT_DIR = path.join(process.cwd(), 'content/posts');
const PROCESSED_FILE = path.join(process.cwd(), 'content/.processed.json');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Utility functions
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .slice(0, 60)
    .trim();
}

function generateId(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex').slice(0, 12);
}

function loadProcessedUrls(): Set<string> {
  try {
    if (fs.existsSync(PROCESSED_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROCESSED_FILE, 'utf-8'));
      return new Set(data.urls || []);
    }
  } catch (error) {
    console.error('Error loading processed URLs:', error);
  }
  return new Set();
}

function saveProcessedUrls(urls: Set<string>): void {
  const data = { urls: Array.from(urls), lastUpdated: new Date().toISOString() };
  fs.writeFileSync(PROCESSED_FILE, JSON.stringify(data, null, 2));
}

// Load existing article titles for duplicate detection
function loadExistingTitles(): string[] {
  const titles: string[] = [];
  try {
    if (!fs.existsSync(CONTENT_DIR)) return titles;

    const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
      // Extract title and originalTitle from frontmatter
      const titleMatch = content.match(/^title:\s*"(.+?)"/m);
      const originalMatch = content.match(/^originalTitle:\s*"(.+?)"/m);
      if (titleMatch) titles.push(titleMatch[1].toLowerCase());
      if (originalMatch) titles.push(originalMatch[1].toLowerCase());
    }
  } catch (error) {
    console.error('Error loading existing titles:', error);
  }
  return titles;
}

// Extract key entities from title for comparison
function extractKeyEntities(title: string): Set<string> {
  const entities = new Set<string>();
  const text = title.toLowerCase();

  // K-Pop group names
  const groups = [
    'bts', 'blackpink', 'twice', 'exo', 'nct', 'red velvet', 'seventeen', 'stray kids',
    'itzy', 'aespa', 'newjeans', 'le sserafim', 'ive', 'nmixx', 'txt', 'enhypen',
    'got7', 'monsta x', 'ateez', 'the boyz', 'treasure', 'g i-dle', 'gi-dle', 'kep1er',
    'mamamoo', 'bigbang', '2ne1', 'girls generation', 'snsd', 'super junior', 'shinee',
    'riize', 'zerobaseone', 'boynextdoor', 'xikers', 'kiss of life', 'babymonster'
  ];

  // Check for group mentions
  for (const group of groups) {
    if (text.includes(group)) {
      entities.add(group);
    }
  }

  // Extract potential celebrity names (capitalized words, 2+ chars)
  const words = title.match(/[A-Z][a-z]{2,}/g) || [];
  words.forEach(w => entities.add(w.toLowerCase()));

  // Extract key event words
  const events = ['comeback', 'debut', 'concert', 'tour', 'album', 'dating', 'married', 'enlist', 'military', 'award', 'chart'];
  for (const event of events) {
    if (text.includes(event)) {
      entities.add(event);
    }
  }

  return entities;
}

// Check if article is duplicate content
function isDuplicateContent(newTitle: string, existingTitles: string[]): boolean {
  const newTitleLower = newTitle.toLowerCase();
  const newEntities = extractKeyEntities(newTitle);

  for (const existingTitle of existingTitles) {
    // Exact or near-exact match
    if (existingTitle === newTitleLower) {
      return true;
    }

    // Check entity overlap (if 70%+ entities match, likely duplicate)
    const existingEntities = extractKeyEntities(existingTitle);
    if (newEntities.size >= 2 && existingEntities.size >= 2) {
      const intersection = Array.from(newEntities).filter(x => existingEntities.has(x));
      const similarity = intersection.length / Math.min(newEntities.size, existingEntities.size);
      if (similarity >= 0.7) {
        return true;
      }
    }

    // Word-level similarity check
    const newWords = new Set(newTitleLower.split(/\s+/).filter(w => w.length > 3));
    const existingWords = new Set(existingTitle.split(/\s+/).filter(w => w.length > 3));
    if (newWords.size >= 4 && existingWords.size >= 4) {
      const wordIntersection = Array.from(newWords).filter(x => existingWords.has(x));
      const wordSimilarity = wordIntersection.length / Math.min(newWords.size, existingWords.size);
      if (wordSimilarity >= 0.6) {
        return true;
      }
    }
  }

  return false;
}

// Determine category based on content
function detectCategory(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();

  if (text.includes('audition') || text.includes('trainee') || text.includes('debut')) {
    return 'audition';
  }
  if (text.includes('drama') || text.includes('kdrama') || text.includes('actor') || text.includes('actress')) {
    return 'drama';
  }
  if (text.includes('album') || text.includes('comeback') || text.includes('music video') || text.includes('mv') || text.includes('chart')) {
    return 'music';
  }
  if (text.includes('fashion') || text.includes('style') || text.includes('outfit') || text.includes('wear')) {
    return 'fashion';
  }
  if (text.includes('variety') || text.includes('show') || text.includes('running man') || text.includes('knowing bros')) {
    return 'variety';
  }
  if (text.includes('dating') || text.includes('relationship') || text.includes('married') || text.includes('personal')) {
    return 'celebrity';
  }

  return 'news';
}

// Extract tags from content
function extractTags(title: string, content: string): string[] {
  const text = `${title} ${content}`;
  const tags: Set<string> = new Set();

  // Common K-Pop group names (add more as needed)
  const groups = [
    'BTS', 'BLACKPINK', 'TWICE', 'EXO', 'NCT', 'Red Velvet', 'SEVENTEEN', 'Stray Kids',
    'ITZY', 'aespa', 'NewJeans', 'LE SSERAFIM', 'IVE', 'NMIXX', 'TXT', 'ENHYPEN',
    'GOT7', 'MONSTA X', 'ATEEZ', 'THE BOYZ', 'TREASURE', '(G)I-DLE', 'Kep1er',
    'MAMAMOO', 'BIGBANG', '2NE1', 'Girls Generation', 'SNSD', 'Super Junior', 'SHINee'
  ];

  // Check for group mentions
  groups.forEach((group) => {
    if (text.includes(group) || text.toLowerCase().includes(group.toLowerCase())) {
      tags.add(group);
    }
  });

  // Add category-based tags
  if (text.toLowerCase().includes('comeback')) tags.add('Comeback');
  if (text.toLowerCase().includes('debut')) tags.add('Debut');
  if (text.toLowerCase().includes('concert')) tags.add('Concert');
  if (text.toLowerCase().includes('award')) tags.add('Awards');
  if (text.toLowerCase().includes('chart')) tags.add('Charts');

  return Array.from(tags).slice(0, 5);
}

// Helper function to safely parse JSON with newlines in string values
function safeJSONParse(text: string): Record<string, string> | null {
  try {
    // First try direct parse
    return JSON.parse(text);
  } catch {
    try {
      // Fix unescaped newlines inside JSON string values
      // Match content between quotes and escape newlines
      const fixed = text.replace(
        /"([^"\\]*(?:\\.[^"\\]*)*)"/g,
        (match) => {
          return match
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
        }
      );
      return JSON.parse(fixed);
    } catch {
      try {
        // More aggressive fix: replace all newlines between { and }
        const aggressive = text
          .replace(/\n(?=(?:[^"]*"[^"]*")*[^"]*$)/g, ' ')  // newlines outside quotes
          .replace(/"\s*\n\s*"/g, '" "')  // newlines between strings
          .replace(/,\s*\n\s*/g, ', ')    // newlines after commas
          .replace(/\n/g, '\\n');          // remaining newlines
        return JSON.parse(aggressive);
      } catch (e) {
        console.error('  JSON parse failed after all attempts');
        return null;
      }
    }
  }
}

// Safe Content Generation - Summary + Commentary model (Fair Use compliant)
async function generateSafeContent(
  title: string,
  content: string,
  source: string
): Promise<{
  title: string;
  excerpt: string;
  summary: string;
  commentary: string;
  content: string;
} | null> {
  try {
    const prompt = `You are a K-Pop news analyst. Create ORIGINAL commentary about this news story.

IMPORTANT: Do NOT rewrite or copy the original article. Instead:
1. Create a brief factual summary (2-3 sentences only)
2. Write your own ORIGINAL analysis/commentary (150-250 words) about why this news matters, its context in the K-Pop industry, or interesting perspectives

Original Title: ${title}
Original Content Snippet: ${content.slice(0, 500)}
Source: ${source}

Respond in JSON format with these exact keys: title, excerpt, summary, commentary
IMPORTANT: Keep all values on single lines without line breaks.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a K-Pop industry analyst providing original commentary. Never copy content - only summarize facts briefly and provide your own analysis. Respond with valid JSON only. CRITICAL: Do not use line breaks within JSON string values - keep each value as a single line of text.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 1000,
    });

    const responseText = response.choices[0]?.message?.content?.trim();
    if (!responseText) return null;

    // Parse JSON response with fallback handling
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = safeJSONParse(jsonMatch[0]);
    if (!parsed) return null;

    // Construct the content with clear sections
    const structuredContent = `${parsed.summary}

---

## Our Take

${parsed.commentary}`;

    return {
      title: parsed.title,
      excerpt: parsed.excerpt,
      summary: parsed.summary,
      commentary: parsed.commentary,
      content: structuredContent,
    };
  } catch (error) {
    console.error('Error generating safe content:', error);
    return null;
  }
}

// Fetch RSS feeds
async function fetchRSSFeeds(): Promise<RSSItem[]> {
  const parser = new Parser({
    customFields: {
      item: [['media:content', 'media:content']],
    },
  });

  const allItems: RSSItem[] = [];

  for (const source of RSS_SOURCES) {
    if (!source.enabled) continue;

    try {
      console.log(`Fetching from ${source.name}...`);
      const feed = await parser.parseURL(source.url);

      for (const item of feed.items.slice(0, 30)) {
        allItems.push({
          ...item,
          creator: source.name,
        } as RSSItem);
      }

      console.log(`  Found ${feed.items.length} items from ${source.name}`);
    } catch (error) {
      console.error(`Error fetching ${source.name}:`, error);
    }
  }

  return allItems;
}

// Save article as markdown
function saveArticle(article: ProcessedArticle): void {
  const frontmatter = `---
title: "${article.title.replace(/"/g, '\\"')}"
excerpt: "${article.excerpt.replace(/"/g, '\\"')}"
summary: "${article.summary.replace(/"/g, '\\"').replace(/\n/g, ' ')}"
commentary: "${article.commentary.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"
originalTitle: "${article.originalTitle.replace(/"/g, '\\"')}"
category: "${article.category}"
tags: ${JSON.stringify(article.tags)}
publishedAt: "${article.publishedAt}"
updatedAt: "${new Date().toISOString()}"
source: "${article.source}"
sourceUrl: "${article.sourceUrl}"
${article.thumbnail ? `thumbnail: "${article.thumbnail}"` : ''}
isAIGenerated: ${article.isAIGenerated}
author: "KPOP Daily"
---

${article.content}
`;

  const filePath = path.join(CONTENT_DIR, `${article.slug}.md`);
  fs.writeFileSync(filePath, frontmatter);
  console.log(`  Saved: ${article.slug}`);
}

// Main function
async function main(): Promise<void> {
  console.log('Starting K-Pop news fetch...');
  console.log(`Time: ${new Date().toISOString()}`);

  // Ensure directories exist
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }

  // Load processed URLs
  const processedUrls = loadProcessedUrls();
  console.log(`Previously processed: ${processedUrls.size} articles`);

  // Load existing titles for duplicate content detection
  const existingTitles = loadExistingTitles();
  console.log(`Existing article titles loaded: ${existingTitles.length}`);

  // Fetch RSS feeds
  const items = await fetchRSSFeeds();
  console.log(`Total items fetched: ${items.length}`);

  // Filter new items (not processed before)
  const newItems = items.filter((item) => item.link && !processedUrls.has(item.link));
  console.log(`New items (by URL): ${newItems.length}`);

  // Filter out duplicate content
  const uniqueItems = newItems.filter((item) => {
    if (!item.title) return false;
    if (isDuplicateContent(item.title, existingTitles)) {
      console.log(`  Skipping duplicate content: ${item.title.slice(0, 50)}...`);
      return false;
    }
    return true;
  });
  console.log(`Unique items to process: ${uniqueItems.length}`);

  // Filter out negative news (only positive/neutral content)
  const negativeKeywords = [
    'death', 'died', 'dies', 'dead', 'funeral', 'suicide', 'accident', 'crash',
    'arrested', 'arrest', 'jail', 'prison', 'charged', 'lawsuit', 'sue', 'sued',
    'scandal', 'controversy', 'accused', 'allegation', 'assault', 'abuse',
    'divorce', 'breakup', 'split', 'cheat', 'cheating', 'affair',
    'drunk', 'dui', 'drug', 'drugs', 'overdose',
    'bully', 'bullying', 'harassment', 'victim',
    'cancel', 'cancelled', 'canceled', 'boycott',
    'fail', 'flop', 'worst', 'disaster', 'tragic', 'tragedy',
    'hate', 'racist', 'racism', 'sexist', 'sexism',
    'military', 'enlist', 'enlisted', 'army'  // Optional: exclude military news
  ];

  const positiveItems = uniqueItems.filter((item) => {
    const titleLower = (item.title || '').toLowerCase();
    const contentLower = (item.contentSnippet || item.content || '').toLowerCase();
    const text = `${titleLower} ${contentLower}`;

    for (const keyword of negativeKeywords) {
      if (text.includes(keyword)) {
        console.log(`  Skipping negative news: ${item.title?.slice(0, 50)}... (keyword: ${keyword})`);
        return false;
      }
    }
    return true;
  });
  console.log(`Positive items to process: ${positiveItems.length}`);

  if (positiveItems.length === 0) {
    console.log('No new positive articles to process.');
    return;
  }

  // Priority scoring for breaking news and popular content
  const priorityKeywords = {
    high: [
      'exclusive', 'breaking', 'first', 'official', 'confirms', 'announced', 'reveals',
      'wins', 'winner', 'award', 'chart', 'billboard', 'record', 'milestone', 'historic',
      'comeback', 'debut', 'new album', 'mv', 'music video', 'teaser', 'trailer',
      'world tour', 'concert', 'sold out', 'million', 'billion',
      'collaboration', 'featuring', 'collab'
    ],
    medium: [
      'interview', 'behind', 'preview', 'highlight', 'performance', 'stage',
      'photoshoot', 'magazine', 'cover', 'brand', 'ambassador',
      'variety', 'show', 'episode', 'drama', 'cast', 'role'
    ]
  };

  // Top K-Pop groups for priority
  const topGroups = [
    'bts', 'blackpink', 'twice', 'newjeans', 'aespa', 'ive', 'le sserafim',
    'stray kids', 'seventeen', 'nct', 'exo', 'red velvet', 'itzy', 'txt', 'enhypen'
  ];

  const scoredItems = positiveItems.map((item) => {
    const text = `${item.title || ''} ${item.contentSnippet || ''}`.toLowerCase();
    let score = 0;

    // High priority keywords (+3 points each)
    for (const keyword of priorityKeywords.high) {
      if (text.includes(keyword)) score += 3;
    }

    // Medium priority keywords (+1 point each)
    for (const keyword of priorityKeywords.medium) {
      if (text.includes(keyword)) score += 1;
    }

    // Top groups bonus (+2 points)
    for (const group of topGroups) {
      if (text.includes(group)) {
        score += 2;
        break; // Only count once
      }
    }

    return { item, score };
  });

  // Sort by score (highest first)
  scoredItems.sort((a, b) => b.score - a.score);

  console.log('Top scored articles:');
  scoredItems.slice(0, 10).forEach((s, i) => {
    console.log(`  ${i + 1}. [${s.score}pts] ${s.item.title?.slice(0, 50)}...`);
  });

  // Process top 5 high-priority items
  const itemsToProcess = scoredItems.slice(0, 5).map(s => s.item);
  let processedCount = 0;

  for (const item of itemsToProcess) {
    if (!item.title || !item.link) continue;

    console.log(`\nProcessing: ${item.title}`);

    try {
      const originalContent = item.contentSnippet || item.content || item.title;

      // Generate safe content (summary + commentary)
      const safeContent = await generateSafeContent(
        item.title,
        originalContent,
        item.creator || 'Unknown'
      );

      if (!safeContent) {
        console.log('  Skipped: Content generation failed');
        continue;
      }

      // Detect category
      const category = detectCategory(safeContent.title, safeContent.content);
      const slug = `${generateSlug(safeContent.title)}-${generateId(item.link)}`;

      // Generate AI image (copyright-free, context-aware) and save locally
      const thumbnail = await generateAIImage(openai, category, safeContent.title, safeContent.summary, slug);
      console.log(`  AI thumbnail: ${thumbnail ? 'saved locally' : 'skipped'}`);

      // Create article with new structure
      const article: ProcessedArticle = {
        slug,
        title: safeContent.title,
        excerpt: safeContent.excerpt,
        content: safeContent.content,
        summary: safeContent.summary,
        commentary: safeContent.commentary,
        originalTitle: item.title,
        category,
        tags: extractTags(safeContent.title, safeContent.content),
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        source: item.creator || 'Unknown',
        sourceUrl: item.link,
        thumbnail,
        isAIGenerated: true,
      };

      // Save article
      saveArticle(article);
      processedUrls.add(item.link);
      // Add to existing titles to prevent duplicates within same batch
      existingTitles.push(article.title.toLowerCase());
      existingTitles.push(article.originalTitle.toLowerCase());
      processedCount++;

      // Rate limiting (longer for DALL-E)
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`  Error processing: ${error}`);
    }
  }

  // Save processed URLs
  saveProcessedUrls(processedUrls);

  console.log(`\nDone! Processed ${processedCount} new articles.`);
}

// Run
main().catch(console.error);
