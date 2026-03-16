import 'dotenv/config';
import Parser from 'rss-parser';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import * as cheerio from 'cheerio';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fetch = require('node-fetch');

// Types for extracted media
interface ExtractedMedia {
  youtubeLinks: string[];
  externalLinks: { url: string; text: string }[];
}

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Fetch and parse original article to extract YouTube links and external links
async function fetchOriginalArticleMedia(articleUrl: string, sourceDomain: string): Promise<ExtractedMedia> {
  const result: ExtractedMedia = { youtubeLinks: [], externalLinks: [] };

  try {
    console.log(`  Fetching original article for media extraction...`);
    const response = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KpopDailyBot/1.0)',
      },
      timeout: 10000,
    });

    if (!response.ok) {
      console.log(`  Could not fetch original article: ${response.status}`);
      return result;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Find all links in the article content
    // Common article content selectors
    const contentSelectors = [
      'article', '.article-content', '.entry-content', '.post-content',
      '.news-content', '.story-body', 'main', '.content'
    ];

    // Find the best content container
    let contentSelector = 'body';
    for (const selector of contentSelectors) {
      if ($(selector).length > 0) {
        contentSelector = selector;
        break;
      }
    }

    // Extract all links
    const seenYouTube = new Set<string>();
    const seenExternal = new Set<string>();
    const sourceDomainLower = sourceDomain.toLowerCase();

    $(contentSelector).first().find('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();

      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      // Check for YouTube links
      const youtubeId = extractYouTubeId(href);
      if (youtubeId && !seenYouTube.has(youtubeId)) {
        seenYouTube.add(youtubeId);
        result.youtubeLinks.push(`https://www.youtube.com/watch?v=${youtubeId}`);
        console.log(`    Found YouTube: ${youtubeId}`);
        return;
      }

      // Check for external links (not source site, not social media share buttons)
      try {
        const urlObj = new URL(href, articleUrl);
        const domain = urlObj.hostname.toLowerCase();

        // Skip source site links
        if (domain.includes(sourceDomainLower) || sourceDomainLower.includes(domain)) return;

        // Skip common social/sharing links
        const skipDomains = [
          'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'pinterest.com',
          'linkedin.com', 'tumblr.com', 'reddit.com', 'whatsapp.com', 'telegram.org',
          'line.me', 'kakaotalk.com', 'share.', 'addthis.com', 'sharethis.com'
        ];
        if (skipDomains.some(d => domain.includes(d))) return;

        // Skip internal anchors and media files
        if (urlObj.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|pdf|mp3|mp4)$/i)) return;

        // Add unique external links with meaningful text
        const fullUrl = urlObj.href;
        if (!seenExternal.has(fullUrl) && text.length > 2 && text.length < 200) {
          seenExternal.add(fullUrl);
          result.externalLinks.push({ url: fullUrl, text });
          console.log(`    Found external link: ${text.slice(0, 30)}...`);
        }
      } catch {
        // Invalid URL, skip
      }
    });

    // Also check for embedded YouTube iframes
    $(contentSelector).first().find('iframe[src]').each((_, el) => {
      const src = $(el).attr('src') || '';
      const youtubeId = extractYouTubeId(src);
      if (youtubeId && !seenYouTube.has(youtubeId)) {
        seenYouTube.add(youtubeId);
        result.youtubeLinks.push(`https://www.youtube.com/watch?v=${youtubeId}`);
        console.log(`    Found embedded YouTube: ${youtubeId}`);
      }
    });

    console.log(`  Extracted: ${result.youtubeLinks.length} YouTube links, ${result.externalLinks.length} external links`);
  } catch (error) {
    console.error(`  Error fetching original article:`, error);
  }

  return result;
}

// Get source domain from URL
function getSourceDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

const IMAGES_DIR = path.join(process.cwd(), 'public/images/posts');

// Generate context-aware image prompt (cinematic editorial style)
async function generateImagePrompt(
  title: string,
  summary: string,
  category: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an expert at creating image prompts for K-Pop news article thumbnails.
Create CINEMATIC, PHOTOREALISTIC editorial images that visually represent the article's theme.

STYLE:
- Cinematic editorial photography, magazine cover quality
- Professional studio or event lighting (dramatic, vibrant, high contrast)
- Sharp focus, rich colors, visually striking composition
- 16:9 widescreen, suitable for news article header

RULES:
1. NO real people, faces, or celebrities — focus on SCENES, OBJECTS, ATMOSPHERE, and SILHOUETTES
2. Match the article topic closely: awards → grand stage with trophies and lights; tour → packed concert arena with lightsticks; comeback → sleek recording studio with neon; fashion → high-end runway or editorial setup
3. Use specific visual elements: lighting type, color palette, key props, environment
4. Avoid generic/vague descriptions — be concrete and cinematic

EXAMPLES:
- Award ceremony: "Cinematic wide shot of a grand award ceremony stage, empty golden trophy under a single dramatic spotlight, confetti frozen mid-air, deep blue and gold color palette, professional event photography, sharp and vivid"
- World tour: "Cinematic aerial shot of a packed stadium concert at night, thousands of glowing lightsticks in pink and white creating waves, massive LED stage in the center, smoke and laser beams, high contrast editorial photography"
- Comeback/Album: "Sleek modern recording studio at night, neon-lit mixing console in purple and blue, vinyl records and microphone in sharp focus, moody cinematic lighting, professional product photography aesthetic"
- Fashion/Red carpet: "Luxury fashion editorial, elegant empty red carpet flanked by press cameras and blinding flashbulbs, velvet ropes, golden lighting, high-end magazine photography style"
- Fan meeting: "Wide shot of a bright arena filled with colorful fan banners and light sticks, empty stage with a lone microphone stand in warm spotlight, anticipatory atmosphere, vivid editorial photography"

Return ONLY the image prompt. Keep it under 120 words. Be specific and cinematic.`
        },
        {
          role: 'user',
          content: `Create a cinematic editorial image prompt for this K-Pop news article:
Title: ${title}
Summary: ${summary}
Category: ${category}

Return ONLY the image prompt. No faces or real people. Focus on the scene and atmosphere.`
        }
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const prompt = response.choices[0]?.message?.content?.trim();
    if (prompt) {
      return prompt;
    }
  } catch (error) {
    console.error('  Error generating image prompt:', error);
  }

  // Fallback prompts by category (cinematic editorial style)
  const fallbacks: Record<string, string> = {
    music: 'Cinematic wide shot of a packed stadium concert at night, thousands of glowing pink and white lightsticks creating waves across the crowd, massive LED stage blazing with light, smoke and laser beams cutting through the air, high contrast editorial photography, sharp and vivid.',
    drama: 'Cinematic shot of a sleek Seoul rooftop at golden hour, city skyline glowing with warm light, empty bench with soft bokeh background, romantic and sophisticated atmosphere, editorial photography, rich color grading.',
    celebrity: 'Luxury red carpet editorial, elegant velvet rope barrier flanked by blinding camera flashbulbs, golden spotlights and deep shadows, high-end fashion magazine photography style, sharp focus and rich contrast.',
    audition: 'Cinematic shot of a modern dance practice studio at night, mirrored walls reflecting dramatic overhead lighting, empty dance floor with a single spotlight, polished hardwood floor, professional editorial atmosphere.',
    fashion: 'High-end fashion editorial, minimalist white studio with dramatic side lighting, couture clothing on a sleek display, bold color accents, sharp magazine-quality photography, sophisticated and stylish.',
    variety: 'Cinematic shot of a vibrant Korean TV variety show stage, colorful neon set design with bold graphics, bright studio lights, playful and energetic atmosphere, professional broadcast photography.',
    news: 'Cinematic editorial shot of Seoul cityscape at dusk, Han River reflecting city lights, modern glass skyscrapers in the background, clean and professional atmosphere, rich color grading, sharp focus.',
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

// Generate AI image using Cloudflare Workers AI (flux-1-schnell)
async function generateAIImage(
  category: string,
  title: string,
  summary: string,
  slug: string
): Promise<string | undefined> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    console.log('  Cloudflare credentials not configured, skipping image generation');
    return undefined;
  }

  try {
    console.log(`  Generating context-aware image prompt...`);
    const imagePrompt = await generateImagePrompt(title, summary, category);
    console.log(`  Image prompt: ${imagePrompt.slice(0, 80)}...`);
    console.log(`  Generating image with Cloudflare Workers AI (flux-1-schnell)...`);

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: imagePrompt, num_steps: 8 }),
      }
    );

    if (!response.ok) {
      console.error(`  Cloudflare AI error: ${response.status} ${response.statusText}`);
      return undefined;
    }

    const result = await response.json() as { success: boolean; result?: { image: string } };

    if (!result.success || !result.result?.image) {
      console.error('  Cloudflare AI returned no image');
      return undefined;
    }

    // result.result.image is base64-encoded PNG
    const imageBuffer = Buffer.from(result.result.image, 'base64');

    const imagesDir = path.join(process.cwd(), 'public/images/posts');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const filename = `${slug}.webp`;
    const outputPath = path.join(imagesDir, filename);

    await sharp(imageBuffer)
      .resize(1200, 630, { fit: 'cover', position: 'center' })
      .webp({ quality: 85 })
      .toFile(outputPath);

    const publicPath = `/images/posts/${filename}`;
    console.log(`  Image saved: ${publicPath}`);
    return publicPath;

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

const CATEGORIES = ['news', 'music', 'celebrity', 'audition', 'fashion', 'variety'];

const CONTENT_DIR = path.join(process.cwd(), 'content/posts');
const PROCESSED_FILE = path.join(process.cwd(), 'content/.processed.json');

// Initialize Groq via OpenAI-compatible endpoint
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || '',
  baseURL: 'https://api.groq.com/openai/v1',
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

// Extract tags from content using word boundary matching
function extractTags(title: string, content: string): string[] {
  const text = `${title} ${content}`;
  const tags: Set<string> = new Set();

  // Common K-Pop group/artist names with word boundary regex
  const groups: Array<{ name: string; pattern: RegExp }> = [
    { name: 'BTS', pattern: /\bBTS\b/ },
    { name: 'BLACKPINK', pattern: /\bBLACKPINK\b/i },
    { name: 'TWICE', pattern: /\bTWICE\b/ },
    { name: 'EXO', pattern: /\bEXO\b/ },
    { name: 'NCT', pattern: /\bNCT\b/ },
    { name: 'Red Velvet', pattern: /\bRed Velvet\b/i },
    { name: 'SEVENTEEN', pattern: /\bSEVENTEEN\b/i },
    { name: 'Stray Kids', pattern: /\bStray Kids\b/i },
    { name: 'ITZY', pattern: /\bITZY\b/i },
    { name: 'aespa', pattern: /\baespa\b/i },
    { name: 'NewJeans', pattern: /\bNewJeans\b/i },
    { name: 'LE SSERAFIM', pattern: /\bLE SSERAFIM\b/i },
    { name: 'IVE', pattern: /\bIVE\b(?!\w)/ },  // strict: "IVE" not followed by word chars
    { name: 'NMIXX', pattern: /\bNMIXX\b/i },
    { name: 'TXT', pattern: /\bTXT\b/ },
    { name: 'ENHYPEN', pattern: /\bENHYPEN\b/i },
    { name: 'GOT7', pattern: /\bGOT7\b/i },
    { name: 'MONSTA X', pattern: /\bMONSTA X\b/i },
    { name: 'ATEEZ', pattern: /\bATEEZ\b/i },
    { name: 'THE BOYZ', pattern: /\bTHE BOYZ\b/i },
    { name: 'TREASURE', pattern: /\bTREASURE\b/ },
    { name: '(G)I-DLE', pattern: /\(G\)I-DLE/i },
    { name: 'Kep1er', pattern: /\bKep1er\b/i },
    { name: 'MAMAMOO', pattern: /\bMAMAMOO\b/i },
    { name: 'BIGBANG', pattern: /\bBIGBANG\b/i },
    { name: '2NE1', pattern: /\b2NE1\b/i },
    { name: 'Girls Generation', pattern: /\bGirls.? Generation\b/i },
    { name: 'SNSD', pattern: /\bSNSD\b/ },
    { name: 'Super Junior', pattern: /\bSuper Junior\b/i },
    { name: 'SHINee', pattern: /\bSHINee\b/i },
    { name: 'RIIZE', pattern: /\bRIIZE\b/i },
    { name: 'BABYMONSTER', pattern: /\bBABYMONSTER\b/i },
    { name: 'ILLIT', pattern: /\bILLIT\b/i },
    { name: 'TWS', pattern: /\bTWS\b/ },
    { name: 'ZEROBASEONE', pattern: /\bZEROBASEONE\b/i },
    { name: 'BOYNEXTDOOR', pattern: /\bBOYNEXTDOOR\b/i },
    { name: 'Taemin', pattern: /\bTaemin\b/i },
    { name: 'IU', pattern: /\bIU\b(?!\w)/ },
    { name: 'BIBI', pattern: /\bBIBI\b/ },
  ];

  // Check for group mentions using regex word boundaries
  groups.forEach(({ name, pattern }) => {
    if (pattern.test(text)) {
      tags.add(name);
    }
  });

  // Add event-based tags using word boundaries
  if (/\bcomeback\b/i.test(text)) tags.add('Comeback');
  if (/\bdebut\b/i.test(text)) tags.add('Debut');
  if (/\bconcert\b/i.test(text)) tags.add('Concert');
  if (/\bawards?\b/i.test(text)) tags.add('Awards');
  if (/\bcharts?\b/i.test(text)) tags.add('Charts');
  if (/\balbum\b/i.test(text)) tags.add('Album');
  if (/\bmusic video\b|\bMV\b/i.test(text)) tags.add('MV');
  if (/\btour\b/i.test(text)) tags.add('Tour');
  if (/\bK-Drama\b|\bkdrama\b|\bdrama\b/i.test(text)) tags.add('K-Drama');

  return Array.from(tags).slice(0, 5);
}

// Merge extracted tags with AI-generated tags, deduplicated, max 5
function mergeTags(extractedTags: string[], aiTags: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  // Extracted tags first (higher precision from regex matching)
  for (const tag of extractedTags) {
    const key = tag.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(tag);
    }
  }

  // Then AI tags
  for (const tag of aiTags) {
    const key = tag.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(tag);
    }
  }

  return merged.slice(0, 5);
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
// Generates well-structured multi-paragraph content for readability
async function generateSafeContent(
  title: string,
  content: string,
  source: string,
  extractedMedia?: ExtractedMedia
): Promise<{
  title: string;
  excerpt: string;
  summary: string;
  commentary: string;
  content: string;
  aiTags?: string[];
} | null> {
  try {
    const prompt = `You are a K-Pop news analyst writing for a blog. Create ORIGINAL content about this news story.

STRUCTURE YOUR RESPONSE WITH CLEAR PARAGRAPHS:
1. summary: A factual summary of the news (2-3 sentences)
2. commentary: Your ORIGINAL analysis split into 3-4 SHORT paragraphs (use "\\n\\n" to separate paragraphs). Each paragraph should be 2-3 sentences. Cover:
   - Why this news matters
   - Context in the K-Pop industry
   - What this means for fans or the artist's career
3. tags: An array of 3-5 relevant keyword tags for this article. Include:
   - Artist/group names mentioned (e.g., "BTS", "BLACKPINK", "IVE")
   - Topic keywords (e.g., "Comeback", "Concert", "Album", "Charts", "Awards", "Debut", "Tour", "K-Drama", "Fashion", "Variety")
   - Only include tags that are genuinely relevant to the article content

Original Title: ${title}
Original Content Snippet: ${content.slice(0, 500)}
Source: ${source}

Respond in JSON format with these exact keys: title, excerpt, summary, commentary, tags
CRITICAL: In the commentary field, use "\\n\\n" to create paragraph breaks. This makes the content readable.`;

    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await openai.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are a K-Pop industry analyst. Write engaging, well-structured content with multiple short paragraphs. Use "\\n\\n" in the commentary field to separate paragraphs. Respond with valid JSON only.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.8,
          max_tokens: 1200,
        });
        break;
      } catch (err: any) {
        if (err?.status === 429 && attempt < 2) {
          console.log(`  Rate limit hit, retrying in ${(attempt + 1) * 5}s...`);
          await new Promise(r => setTimeout(r, (attempt + 1) * 5000));
        } else {
          throw err;
        }
      }
    }
    if (!response) return null;

    const responseText = response.choices[0]?.message?.content?.trim();
    if (!responseText) return null;

    // Parse JSON response with fallback handling
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = safeJSONParse(jsonMatch[0]);
    if (!parsed) return null;

    // Process commentary to ensure proper paragraph breaks
    let commentary = parsed.commentary || '';
    // Convert escaped newlines to actual newlines
    commentary = commentary.replace(/\\n\\n/g, '\n\n').replace(/\\n/g, '\n');

    // Build content sections
    let contentParts: string[] = [];

    // Add summary
    contentParts.push(parsed.summary);

    // Add YouTube embeds if available
    if (extractedMedia?.youtubeLinks && extractedMedia.youtubeLinks.length > 0) {
      contentParts.push('');
      contentParts.push('---');
      contentParts.push('');
      for (const ytLink of extractedMedia.youtubeLinks) {
        contentParts.push(ytLink);
        contentParts.push('');
      }
    }

    contentParts.push('---');
    contentParts.push('');
    contentParts.push('## Our Take');
    contentParts.push('');
    contentParts.push(commentary);

    // Add external links if available
    if (extractedMedia?.externalLinks && extractedMedia.externalLinks.length > 0) {
      contentParts.push('');
      contentParts.push('---');
      contentParts.push('');
      contentParts.push('### Related Links');
      contentParts.push('');
      for (const link of extractedMedia.externalLinks.slice(0, 5)) {
        contentParts.push(`- [${link.text}](${link.url})`);
      }
    }

    const structuredContent = contentParts.join('\n');

    // Extract AI-generated tags
    const aiTags: string[] = Array.isArray(parsed.tags)
      ? parsed.tags.map((t: string) => String(t).trim()).filter(Boolean)
      : [];

    return {
      title: parsed.title,
      excerpt: parsed.excerpt,
      summary: parsed.summary,
      commentary: commentary,
      content: structuredContent,
      aiTags,
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

  // Filter out negative news and excluded categories
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
    'military', 'enlist', 'enlisted', 'army',  // Optional: exclude military news
    // Exclude drama-related content
    'drama', 'kdrama', 'k-drama', 'actor', 'actress', 'acting role', 'starring in',
    'cast in', 'new role', 'lead role', 'cameo'
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

  // KPOP-only filter: Must contain K-Pop related keywords
  const kpopKeywords = [
    // Group names
    'bts', 'blackpink', 'twice', 'newjeans', 'aespa', 'ive', 'le sserafim',
    'stray kids', 'seventeen', 'nct', 'exo', 'red velvet', 'itzy', 'txt', 'enhypen',
    'got7', 'monsta x', 'ateez', 'the boyz', 'treasure', 'g i-dle', 'gi-dle', 'gidle',
    'mamamoo', 'bigbang', '2ne1', 'girls generation', 'snsd', 'super junior', 'shinee',
    'riize', 'zerobaseone', 'boynextdoor', 'xikers', 'kiss of life', 'babymonster',
    'nmixx', 'kep1er', 'fromis', 'wjsn', 'oh my girl', 'loona', 'everglow', 'dreamcatcher',
    'billlie', 'viviz', 'weeekly', 'lightsum', 'lapillus', 'ador', 'hybe', 'jyp', 'sm', 'yg',
    'katseye', 'illit', 'unis', 'badvillain', 'fifty fifty', 'csr', 'tripleS',
    // K-Pop specific terms
    'k-pop', 'kpop', 'idol', 'idols', 'comeback', 'debut', 'trainee', 'fandom',
    'music show', 'inkigayo', 'music bank', 'music core', 'mcountdown', 'show champion',
    'melon', 'genie', 'bugs', 'flo', 'vibe', 'hanteo', 'circle chart', 'gaon',
    'golden disc', 'mama', 'mma', 'sma', 'tma', 'aaa', 'gda',
    'lightstick', 'fanchant', 'fan meeting', 'fan concert'
  ];

  const kpopItems = positiveItems.filter((item) => {
    const text = `${item.title || ''} ${item.contentSnippet || item.content || ''}`.toLowerCase();
    const hasKpopContent = kpopKeywords.some(keyword => text.includes(keyword));
    if (!hasKpopContent) {
      console.log(`  Skipping non-KPOP: ${item.title?.slice(0, 50)}...`);
    }
    return hasKpopContent;
  });
  console.log(`KPOP-only items: ${kpopItems.length}`);

  if (kpopItems.length === 0) {
    console.log('No new KPOP articles to process.');
    return;
  }

  // Priority scoring for breaking news and popular content
  const priorityKeywords = {
    high: [
      'exclusive', 'breaking', 'first', 'official', 'confirms', 'announced', 'reveals',
      'wins', 'winner', 'award', 'chart', 'billboard', 'record', 'milestone', 'historic',
      'comeback', 'debut', 'new album', 'mv', 'music video', 'teaser', 'trailer',
      'world tour', 'concert', 'sold out', 'million', 'billion',
      'collaboration', 'featuring', 'collab', 'pre-order', 'release'
    ],
    medium: [
      'interview', 'behind', 'preview', 'highlight', 'performance', 'stage',
      'photoshoot', 'magazine', 'cover', 'brand', 'ambassador',
      'variety', 'show', 'episode', 'fan meeting', 'vlive', 'weverse'
    ]
  };

  // Top K-Pop groups for higher priority (viral potential)
  const topGroups = [
    'bts', 'blackpink', 'twice', 'newjeans', 'aespa', 'ive', 'le sserafim',
    'stray kids', 'seventeen', 'nct', 'exo', 'red velvet', 'itzy', 'txt', 'enhypen',
    'riize', 'zerobaseone', 'boynextdoor', 'katseye', 'illit', 'babymonster'
  ];

  const scoredItems = kpopItems.map((item) => {
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

    // Top groups bonus (+5 points for viral potential)
    for (const group of topGroups) {
      if (text.includes(group)) {
        score += 5;
        break; // Only count once
      }
    }

    // Recency bonus: newer articles get slight boost
    if (item.pubDate) {
      const ageHours = (Date.now() - new Date(item.pubDate).getTime()) / (1000 * 60 * 60);
      if (ageHours < 6) score += 3;  // Very recent
      else if (ageHours < 12) score += 2;  // Recent
      else if (ageHours < 24) score += 1;  // Today
    }

    return { item, score };
  });

  // Sort by score (highest first)
  scoredItems.sort((a, b) => b.score - a.score);

  console.log('Top scored KPOP articles:');
  scoredItems.slice(0, 10).forEach((s, i) => {
    console.log(`  ${i + 1}. [${s.score}pts] ${s.item.title?.slice(0, 50)}...`);
  });

  // Process top 2 high-priority KPOP items only
  const itemsToProcess = scoredItems.slice(0, 3).map(s => s.item);
  let processedCount = 0;

  for (const item of itemsToProcess) {
    if (!item.title || !item.link) continue;

    console.log(`\nProcessing: ${item.title}`);

    try {
      const originalContent = item.contentSnippet || item.content || item.title;
      const sourceDomain = getSourceDomain(item.link);

      // Fetch original article to extract YouTube links and external links
      const extractedMedia = await fetchOriginalArticleMedia(item.link, sourceDomain);

      // Generate safe content (summary + commentary) with extracted media
      const safeContent = await generateSafeContent(
        item.title,
        originalContent,
        item.creator || 'Unknown',
        extractedMedia
      );

      if (!safeContent) {
        console.log('  Skipped: Content generation failed');
        continue;
      }

      // Detect category
      const category = detectCategory(safeContent.title, safeContent.content);
      const slug = generateSlug(safeContent.title);

      // Generate AI image (copyright-free, context-aware) and save locally
      const thumbnail = await generateAIImage(category, safeContent.title, safeContent.summary, slug);
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
        tags: mergeTags(
          extractTags(safeContent.title, safeContent.content),
          safeContent.aiTags || []
        ),
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
