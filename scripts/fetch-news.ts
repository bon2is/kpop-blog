import Parser from 'rss-parser';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fetch = require('node-fetch');

// Category-based image prompts for AI generation
const CATEGORY_PROMPTS: Record<string, string[]> = {
  music: [
    'kpop concert stage colorful lights crowd',
    'music studio microphone neon lights aesthetic',
    'concert venue stage spotlights purple pink',
    'vinyl records headphones aesthetic music vibes',
  ],
  drama: [
    'korean drama scene romantic aesthetic lighting',
    'film set camera lights cinematic mood',
    'movie theater aesthetic red velvet seats',
    'dramatic sunset cityscape korean style',
  ],
  celebrity: [
    'red carpet event glamorous lights bokeh',
    'fashion photoshoot studio lighting elegant',
    'celebrity interview studio professional setup',
    'awards show stage golden lights sparkle',
  ],
  audition: [
    'dance practice room mirror wooden floor',
    'singing audition microphone spotlight stage',
    'trainee practice room korean style',
    'talent show stage colorful lights audience',
  ],
  fashion: [
    'korean street fashion aesthetic urban style',
    'fashion runway show colorful lights models',
    'stylish outfit aesthetic photography',
    'designer clothing display elegant boutique',
  ],
  variety: [
    'tv show studio colorful set design',
    'entertainment show stage fun lighting',
    'game show set vibrant colors',
    'talk show studio modern design aesthetic',
  ],
  news: [
    'breaking news studio professional setup',
    'press conference microphones media event',
    'newspaper headlines coffee morning aesthetic',
    'social media trending colorful abstract',
  ],
};

// Generate AI image URL using Pollinations (FREE, no API key needed)
function generateAIImageUrl(category: string, title: string): string {
  const prompts = CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS.news;
  // Use title hash for variety
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const basePrompt = prompts[hash % prompts.length];

  // Extract meaningful keywords from title
  const titleWords = title.toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(' ')
    .filter(w => w.length > 3 && !['with', 'from', 'that', 'this', 'will', 'have', 'been', 'their', 'about'].includes(w))
    .slice(0, 4)
    .join(' ');

  // Create unique prompt with more variety
  const styles = ['cinematic', 'professional', 'vibrant', 'elegant', 'modern', 'artistic'];
  const style = styles[hash % styles.length];

  const fullPrompt = `${basePrompt}, ${titleWords}, ${style} style, 4k quality`;

  // Use seed based on title hash for unique but consistent images
  const seed = hash % 100000;

  // Pollinations.ai - completely free AI image generation
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=800&height=450&seed=${seed}&nologo=true`;
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
  category: string;
  tags: string[];
  publishedAt: string;
  source: string;
  sourceUrl: string;
  thumbnail?: string;
}

// Configuration
const RSS_SOURCES = [
  {
    name: 'AllKPop',
    url: 'https://www.allkpop.com/rss',
    enabled: true,
  },
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

// AI Rewriting function
async function rewriteArticle(
  title: string,
  content: string,
  source: string
): Promise<{ title: string; excerpt: string; content: string } | null> {
  try {
    const prompt = `You are a professional K-Pop news writer. Rewrite the following article in a fresh, engaging way while maintaining all factual information. The article should be:
1. Written in a conversational but professional tone
2. SEO-friendly with natural keyword placement
3. Around 300-500 words
4. Include relevant context about the artists/events mentioned
5. Completely original wording (avoid plagiarism)

Original Title: ${title}
Original Content: ${content}
Source: ${source}

Respond in JSON format:
{
  "title": "New engaging title",
  "excerpt": "A compelling 2-3 sentence summary (max 160 characters)",
  "content": "The full rewritten article in paragraphs, separated by \\n\\n"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a K-Pop news writer. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const responseText = response.choices[0]?.message?.content?.trim();
    if (!responseText) return null;

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error rewriting article:', error);
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

      for (const item of feed.items.slice(0, 10)) {
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
category: "${article.category}"
tags: ${JSON.stringify(article.tags)}
publishedAt: "${article.publishedAt}"
updatedAt: "${new Date().toISOString()}"
source: "${article.source}"
sourceUrl: "${article.sourceUrl}"
${article.thumbnail ? `thumbnail: "${article.thumbnail}"` : ''}
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

  // Fetch RSS feeds
  const items = await fetchRSSFeeds();
  console.log(`Total items fetched: ${items.length}`);

  // Filter new items
  const newItems = items.filter((item) => item.link && !processedUrls.has(item.link));
  console.log(`New items to process: ${newItems.length}`);

  if (newItems.length === 0) {
    console.log('No new articles to process.');
    return;
  }

  // Process new items (limit to 10 per run to manage API costs)
  const itemsToProcess = newItems.slice(0, 10);
  let processedCount = 0;

  for (const item of itemsToProcess) {
    if (!item.title || !item.link) continue;

    console.log(`\nProcessing: ${item.title}`);

    try {
      const originalContent = item.contentSnippet || item.content || item.title;

      // Rewrite with AI
      const rewritten = await rewriteArticle(
        item.title,
        originalContent,
        item.creator || 'Unknown'
      );

      if (!rewritten) {
        console.log('  Skipped: AI rewriting failed');
        continue;
      }

      // Detect category first for image selection
      const category = detectCategory(rewritten.title, rewritten.content);
      const slug = `${generateSlug(rewritten.title)}-${generateId(item.link)}`;

      // Generate AI image using Pollinations.ai (FREE!)
      const thumbnail = generateAIImageUrl(category, rewritten.title);
      console.log(`  AI image generated`);

      // Create article
      const article: ProcessedArticle = {
        slug,
        title: rewritten.title,
        excerpt: rewritten.excerpt,
        content: rewritten.content,
        category,
        tags: extractTags(rewritten.title, rewritten.content),
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        source: item.creator || 'Unknown',
        sourceUrl: item.link,
        thumbnail,
      };

      // Save article
      saveArticle(article);
      processedUrls.add(item.link);
      processedCount++;

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
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
