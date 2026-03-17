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
// eslint-disable-next-line @typescript-eslint/no-require-imports
const GIF = require('sharp-gif2');

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

// ── Image Prompt Engineering ──────────────────────────────────────

// Extract K-Pop group from text
function extractKpopGroup(text: string): string | null {
  const groups: { names: string[]; key: string }[] = [
    { names: ['bts', 'bangtan', 'jimin', 'v ', 'taehyung', 'jungkook', 'suga', 'j-hope', 'rm ', 'jin '], key: 'BTS' },
    { names: ['blackpink', 'jennie', 'lisa', 'jisoo', 'rosé', 'rose '], key: 'BLACKPINK' },
    { names: ['aespa', 'karina', 'giselle', 'ningning'], key: 'aespa' },
    { names: ['newjeans', 'new jeans', 'minji', 'hanni', 'danielle', 'haerin', 'hyein'], key: 'NewJeans' },
    { names: ['ive ', "ive'", 'wonyoung', 'yujin', "ive's"], key: 'IVE' },
    { names: ['le sserafim', 'lesserafim', 'kazuha', 'sakura', 'chaewon', 'yunjin', 'eunchae'], key: 'LE SSERAFIM' },
    { names: ['twice', 'nayeon', 'jeongyeon', 'momo', 'sana', 'jihyo', 'mina', 'dahyun', 'chaeyoung', 'tzuyu'], key: 'TWICE' },
    { names: ['seventeen', 's.coups', 'jeonghan', 'joshua', 'hoshi', 'wonwoo', 'woozi', 'the8', 'dk ', 'seungkwan', 'vernon', 'dino '], key: 'SEVENTEEN' },
    { names: ['stray kids', 'straykids', 'bang chan', 'lee know', 'changbin', 'hyunjin', 'han ', 'felix', 'seungmin', 'i.n'], key: 'Stray Kids' },
    { names: ['nct', 'wayv', 'nct 127', 'nct dream', 'nct wish'], key: 'NCT' },
    { names: ['exo', 'baekhyun', 'chanyeol', 'sehun', 'suho', "d.o", 'kai ', 'chen ', 'xiumin'], key: 'EXO' },
    { names: ['itzy', 'yeji', 'ryujin', 'chaeryeong', 'yuna '], key: 'ITZY' },
    { names: ['txt', 'tomorrow x together', 'yeonjun', 'soobin', 'beomgyu', 'taehyun ', 'huening'], key: 'TXT' },
    { names: ['enhypen', 'jungwon', 'heeseung', 'sunghoon', 'sunoo', 'niki '], key: 'ENHYPEN' },
    { names: ['riize', 'shotaro', 'eunseok', 'sungchan', 'wonbin ', 'seunghan', 'sohee ', 'anton '], key: 'RIIZE' },
    { names: ['red velvet', 'irene', 'seulgi', 'wendy', 'joy ', 'yeri '], key: 'Red Velvet' },
    { names: ['ateez', 'hongjoong', 'seonghwa', 'yunho', 'yeosang', 'san ', 'mingi', 'wooyoung', 'jongho'], key: 'ATEEZ' },
    { names: ['babymonster', 'baby monster'], key: 'BABYMONSTER' },
    { names: ['zerobaseone', 'zb1'], key: 'ZEROBASEONE' },
    { names: ['boynextdoor', 'boy next door'], key: 'BOYNEXTDOOR' },
    { names: ['illit '], key: 'ILLIT' },
    { names: ['g-dragon', 'gdragon', 'bigbang', 'big bang'], key: 'BIGBANG' },
    { names: ['shinee', 'taemin', 'onew', 'minho '], key: 'SHINee' },
    { names: ['mamamoo', 'hwasa', 'solar ', 'wheein', 'moonbyul'], key: 'MAMAMOO' },
    { names: ['nmixx', 'sullyoon'], key: 'NMIXX' },
    { names: ['katseye'], key: 'KATSEYE' },
  ];
  const lower = text.toLowerCase();
  for (const g of groups) {
    if (g.names.some(n => lower.includes(n))) return g.key;
  }
  return null;
}

// Group-specific visual descriptions for DALL-E 3 (natural language, sentence form)
const GROUP_VISUALS: Record<string, { character: string; setting: string; palette: string }> = {
  'BTS': {
    character: 'a beautiful young Korean male idol with flowing dark hair, soft expressive eyes, wearing an elegant stage outfit with silver details',
    setting: 'standing in a dreamlike concert stadium surrounded by a sea of glowing purple lightsticks, cherry blossom petals drifting through the air',
    palette: 'deep violet, cobalt blue, soft lavender, silver shimmer',
  },
  'BLACKPINK': {
    character: 'a stunning young Korean female idol with sleek black hair, rose-gold jewelry, wearing a chic black outfit with pink accents',
    setting: 'surrounded by cascading pink rose petals on a luxury editorial stage, velvet drapes and golden light behind her',
    palette: 'hot pink, jet black, rose gold, cream white',
  },
  'aespa': {
    character: 'a sleek anime female idol in a chrome holographic outfit, glowing teal eyes, elegant futuristic silhouette',
    setting: 'inside a breathtaking digital metaverse portal, swirling particle effects and neon light grids stretching into infinity',
    palette: 'holographic silver, teal, metallic white, neon cyan',
  },
  'NewJeans': {
    character: 'a cute young Korean female idol with soft wavy hair, bright cheerful eyes, wearing a casual Y2K pastel outfit',
    setting: 'sitting in a cozy sunlit café surrounded by pastel daisies and retro accessories, afternoon light streaming through the window',
    palette: 'baby blue, soft pink, cream white, pastel mint',
  },
  'IVE': {
    character: 'an elegant young Korean female idol with graceful posture, wearing a pearl-white dress with champagne gold trim, confident gaze',
    setting: 'standing on a grand stage bathed in royal blue and golden light, soft mist at her feet and a beautiful aurora sky behind her',
    palette: 'royal blue, pearl white, champagne gold, soft cream',
  },
  'LE SSERAFIM': {
    character: 'a fierce young Korean female idol with sharp determined eyes, athletic posture, wearing a crimson and navy performance outfit',
    setting: 'striking a powerful pose in a dramatic arena with motion-blur energy lines, sparks flying, intense stage lighting behind her',
    palette: 'deep navy, crimson red, stark white, gold',
  },
  'TWICE': {
    character: 'an adorable young Korean female idol with bright cheerful eyes and a warm smile, wearing a colorful pastel stage outfit',
    setting: 'surrounded by heart-shaped confetti and rainbow bokeh lights on a vibrant stage, flowers and balloons everywhere',
    palette: 'candy pink, coral orange, rainbow pastels, soft white',
  },
  'SEVENTEEN': {
    character: 'a handsome young Korean male idol with a precise confident expression, wearing a crisp blue and silver uniform',
    setting: 'center stage with diamond-blue sparkles and synchronized light formations radiating behind him, grand performance energy',
    palette: 'diamond blue, sky blue, silver white, pale gold',
  },
  'Stray Kids': {
    character: 'a cool Korean male idol with sharp intense eyes, wearing an edgy dark outfit with bold graphic details',
    setting: 'in an industrial performance space with neon green light slicing through dark fog, raw powerful atmosphere',
    palette: 'dark charcoal, neon green, deep crimson, black',
  },
  'NCT': {
    character: 'a stylish young Korean male idol with a sharp cool expression, wearing a futuristic metallic outfit',
    setting: 'in a glowing neo-city skyline at night, geometric neon light patterns reflecting on wet pavement',
    palette: 'neon pink, metallic silver, electric white, deep blue',
  },
  'EXO': {
    character: 'a majestic Korean male idol with a powerful dignified presence, wearing an imperial gold-trimmed dark outfit',
    setting: 'surrounded by celestial light beams and a galaxy of stars, a supernatural golden aura radiating from behind him',
    palette: 'deep black, imperial gold, celestial deep blue, starlight white',
  },
  'ENHYPEN': {
    character: 'a mysterious young Korean male idol with dark charismatic eyes, wearing an elegant moonlit crimson and purple outfit',
    setting: 'in a gothic garden at midnight, silver moonbeams through dark trees, dark red roses floating around him',
    palette: 'deep purple, blood crimson, pale silver, midnight black',
  },
  'TXT': {
    character: 'a dreamy young Korean male idol with wonder-filled expressive eyes, wearing soft layered outfit in twilight tones',
    setting: 'in a surreal floating dreamscape where book pages swirl and giant moons glow, twilight sky shifting from orange to purple',
    palette: 'twilight sky blue, soft burnt orange, dreamy purple, cream',
  },
  'ATEEZ': {
    character: 'a charismatic Korean male idol with fierce passionate eyes, wearing a dramatic pirate-inspired costume with gold accents',
    setting: 'on a theatrical stage with grand crimson lighting and swirling stage fog, dramatic performance energy radiating outward',
    palette: 'deep orange, black, pirate gold, crimson red',
  },
  'Red Velvet': {
    character: 'a charming Korean female idol with soft glowing eyes and a sophisticated smile, wearing an elegant velvet red outfit',
    setting: 'holding a red rose bouquet in a candlelit space with velvet curtains, both playfully sweet and majestically elegant',
    palette: 'deep crimson, velvet black, blush rose, warm gold',
  },
  'RIIZE': {
    character: 'a bright fresh-faced Korean male idol with a natural cheerful expression, wearing a casual white outfit',
    setting: 'outdoors in golden hour light with sunflowers and warm sunset behind him, a fresh youthful energy',
    palette: 'warm sunset orange, fresh green, white, golden yellow',
  },
  'BIGBANG': {
    character: 'a legendary Korean male idol with an iconic cool avant-garde presence, wearing a bold artistic outfit',
    setting: 'on a legendary stage with electric yellow light beams and chrome surfaces, artistic and fearless energy',
    palette: 'chrome silver, electric yellow, black, bold white',
  },
};

// Event type detection from title + summary
function detectEventType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.match(/\b(comeback|new (song|album|mv|music video)|release|single|mini.?album|full.?album|\bep\b|repackage|title.?track)\b/)) return 'comeback';
  if (lower.match(/\b(concert|tour|world tour|show|live performance|arena|stadium|fancon|showcase)\b/)) return 'concert';
  if (lower.match(/\b(award|trophy|win|golden disc|mama|melon|gaon|grammy|daesang|bonsang|disk award)\b/)) return 'award';
  if (lower.match(/\b(drama|k-drama|kdrama|cast|confirmed|lead role|lead actor|ost|acting)\b/)) return 'drama';
  if (lower.match(/\b(dating|couple|relationship|boyfriend|girlfriend|romance|love|marry|married|wedding|engaged)\b/)) return 'romance';
  if (lower.match(/\b(military|enlist|enlistment|discharge|army service|mandatory)\b/)) return 'military';
  if (lower.match(/\b(debut|first|brand new|newly debuted|upcoming group|pre-debut)\b/)) return 'debut';
  if (lower.match(/\b(birthday|birth|born|celebrate|anniversary)\b/)) return 'birthday';
  if (lower.match(/\b(fashion|red carpet|outfit|style|wear|dressed|brand ambassador|photoshoot)\b/)) return 'fashion';
  if (lower.match(/\b(audition|trainee|survival show|competition program|boys planet|girls planet)\b/)) return 'audition';
  if (lower.match(/\b(scandal|controversy|accused|alleged|issue|criticism|backlash|controversy)\b/)) return 'scandal';
  if (lower.match(/\b(chart|billboard|gaon|circle|spotify|streaming|million views|milestone)\b/)) return 'chart';
  return 'general';
}

// Event-specific visual scene templates for DALL-E 3 (natural language)
const EVENT_VISUALS: Record<string, { scene: string; atmosphere: string }> = {
  comeback: {
    scene: 'standing center stage in a bold new concept outfit, holographic album art glowing in the air behind them, theatrical mist swirling at their feet',
    atmosphere: 'electric anticipation, vivid neon accent lights, dramatic spotlight beam piercing through stage smoke',
  },
  concert: {
    scene: 'performing to a massive euphoric crowd, striking a dynamic pose on stage, an ocean of colorful lightsticks glowing below',
    atmosphere: 'euphoric energy and connection, laser grids overhead, LED stage explosions, the crowd is a sea of light',
  },
  award: {
    scene: 'holding a gleaming golden trophy on a grand award ceremony stage, eyes glistening with emotion and gratitude',
    atmosphere: 'prestigious triumph, golden confetti frozen mid-air, a single warm spotlight, an overwhelming sense of achievement',
  },
  drama: {
    scene: 'in a cinematic Korean drama moment by the Han River at dusk, Seoul city lights reflecting on the water',
    atmosphere: 'romantic tension and emotional depth, golden hour warm tones, soft film grain, widescreen cinematic framing',
  },
  romance: {
    scene: 'in a romantic rooftop setting above Seoul at night, warm café lights below and the Han River visible in the distance',
    atmosphere: 'warm and intimate, soft bokeh city lights, amber and pink glow, stars emerging in the twilight sky',
  },
  military: {
    scene: 'in a dignified bittersweet farewell scene, cherry blossom petals drifting down, surrounded by supportive fans',
    atmosphere: 'bittersweet yet proud, warm dawn golden light, soft morning mist, deeply emotional and honorable',
  },
  debut: {
    scene: 'standing at the edge of a brand new stage at sunrise, expression full of nervous excitement and bright hope',
    atmosphere: 'dawn light rays bursting through, vibrant sunrise gradient, a sense of limitless possibility',
  },
  birthday: {
    scene: 'joyfully surprised by a festive birthday celebration, colorful confetti raining down, cheerful balloons all around',
    atmosphere: 'genuinely joyful and warm, golden sparkle glow, colorful bokeh light, sweet festive celebration energy',
  },
  fashion: {
    scene: 'posing confidently on a luxury red carpet in a stunning fashion-forward ensemble, cameras flashing',
    atmosphere: 'glamorous and powerful, dramatic front spotlights, luxurious velvet and marble backdrop, high-fashion editorial mood',
  },
  audition: {
    scene: 'in a dance practice studio, reflected in the wall mirror, intense focused expression, pushing through exhaustion',
    atmosphere: 'determined and focused, a single beam spotlight, high contrast shadows, raw competitive energy',
  },
  scandal: {
    scene: 'alone in a quiet contemplative moment, gazing out a rain-streaked window in introspection',
    atmosphere: 'tense and uncertain, moody chiaroscuro side lighting, deep meaningful shadows, cool blue-grey tones',
  },
  chart: {
    scene: 'celebrating a record-breaking milestone with joy, numbers and stars exploding around them in a victorious moment',
    atmosphere: 'triumphant and celebratory, colorful digital fireworks, neon streaming lights, vibrant achievement energy',
  },
  general: {
    scene: 'striking a charismatic dynamic pose on a spectacular K-pop performance stage, full of magnetic energy',
    atmosphere: 'energetic and captivating, rich saturated stage lighting, high contrast dramatic spotlight, vibrant K-pop presence',
  },
};

// Build a rich, context-aware DALL-E 3 image prompt (natural language paragraph form)
function buildImagePrompt(title: string, summary: string, category: string): string {
  const combinedText = `${title} ${summary}`;
  const group = extractKpopGroup(combinedText);
  const eventType = detectEventType(combinedText);

  const groupVis = group ? GROUP_VISUALS[group] : null;
  const eventVis = EVENT_VISUALS[eventType] || EVENT_VISUALS['general'];

  // Base style — watercolor sketch anime, matching the reference image aesthetic
  const styleDescription = 'A beautiful watercolor illustration with soft visible pencil and ink sketch lines underneath the washes, in the style of Studio Ghibli and Makoto Shinkai anime. Soft cel-shading, luminous warm lighting, delicate bokeh particles, and a dreamy ethereal atmosphere.';

  // Character description
  const characterDesc = groupVis
    ? `The scene features ${groupVis.character}.`
    : (() => {
        const catChars: Record<string, string> = {
          music: 'The scene features a beautiful young Korean female idol with long flowing hair, soft expressive eyes, and a graceful elegant pose.',
          drama: 'The scene features a beautiful Korean actress with expressive eyes and elegant presence, in a cinematic K-drama moment.',
          celebrity: 'The scene features a charismatic young Korean idol with bright expressive eyes, warm smile, and stylish presence.',
          fashion: 'The scene features a stunning young Korean female idol with perfect posture, glamorous outfit, and confident grace.',
          variety: 'The scene features a cheerful young Korean idol with a bright infectious smile and playful energetic personality.',
          news: 'The scene features a poised young Korean idol with calm expressive eyes and dignified presence.',
        };
        return catChars[category] || 'The scene features a beautiful young Korean idol with luminous expressive eyes, flowing hair catching the light, and an elegant captivating presence.';
      })();

  // Setting and context
  const settingDesc = groupVis
    ? `They are ${eventVis.scene}, set within ${groupVis.setting}.`
    : `They are ${eventVis.scene}.`;

  // Color and atmosphere
  const palette = groupVis ? groupVis.palette : (() => {
    const catPalettes: Record<string, string> = {
      music: 'electric pink, deep purple, neon blue with golden highlights',
      drama: 'warm golden amber, soft teal, cinematic warm orange',
      celebrity: 'rose gold, champagne, soft cream white',
      fashion: 'rich jewel tones with bold editorial contrasts',
      variety: 'bright rainbow pastels, warm cheerful colors',
      news: 'warm golden tones, soft blue, elegant silver',
    };
    return catPalettes[category] || 'warm golden tones, soft pink and lavender, luminous whites';
  })();

  return `${styleDescription} ${characterDesc} ${settingDesc} The atmosphere is ${eventVis.atmosphere}. Color palette: ${palette}. Natural elements like soft flower petals, glowing light particles, or gentle bokeh enhance the scene. Widescreen 16:9 cinematic composition. No text, no watermarks, no logos.`;
}

// Generate context-aware image prompt (AI-enhanced)
async function generateImagePrompt(
  title: string,
  summary: string,
  category: string
): Promise<string> {
  // First build the structured base prompt from our knowledge base
  const basePrompt = buildImagePrompt(title, summary, category);

  try {
    // Use LLM to creatively enhance the structured prompt for DALL-E 3
    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an expert image prompt writer for DALL-E 3, specializing in K-Pop news thumbnails with a Studio Ghibli / Makoto Shinkai watercolor anime aesthetic.

You will receive a base prompt and a news article. Your job is to ADD 1-2 specific visual details that make the image feel connected to this specific news story.

RULES:
- Write in natural English sentences (NOT comma-separated tags)
- The style is watercolor illustration with pencil sketch lines — NOT photorealistic
- The character should feel like a beautiful anime interpretation, NOT a real person
- Add one specific detail about: the character's expression/emotion, a unique visual element from the story, or a mood-enhancing environmental detail
- Keep the total output under 180 words
- Output ONLY the complete enhanced prompt, nothing else`
        },
        {
          role: 'user',
          content: `Base prompt: ${basePrompt}

Article title: ${title}
Summary: ${summary.slice(0, 200)}

Add 1-2 specific visual details inspired by this article. Output the complete enhanced prompt only.`
        }
      ],
      temperature: 0.65,
      max_tokens: 260,
    });

    const enhanced = response.choices[0]?.message?.content?.trim();
    if (enhanced && enhanced.length > 50) {
      return enhanced;
    }
  } catch (error) {
    console.error('  Error enhancing image prompt:', error);
  }

  // Fallback: use the structured base prompt directly
  return basePrompt;
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

// Negative prompt for SDXL — anime style, NO photorealism, clearly illustrated
const SDXL_NEGATIVE_PROMPT = '(worst quality, low quality:1.4), photorealistic, photography, real photograph, live action photo, (3D render:1.3), western cartoon, ugly, deformed, bad anatomy, extra limbs, blurry, watermark, text, logo, signature, duplicate, nsfw, explicit';

// Generate AI image using Pollinations.ai — completely free, no API key, Flux model
async function generateAIImagePollinations(imagePrompt: string, slug: string): Promise<string | undefined> {
  try {
    console.log(`  Generating image with Pollinations.ai (Flux, free)...`);

    // Pollinations: keep prompt short (URL length limit ~2000 chars) + use supported resolution
    const compactPrompt = imagePrompt
      .replace(/^A beautiful watercolor illustration[^.]+\.\s*/i, '')
      .replace(/No text[^.]*\.\s*$/i, '')
      .replace(/Widescreen[^.]*\.\s*$/i, '')
      .trim()
      .slice(0, 200);

    const fullPrompt = `watercolor illustration, Studio Ghibli anime style, soft pencil sketch lines, ${compactPrompt}`;
    const encoded = encodeURIComponent(fullPrompt);
    const seed = Math.floor(Math.random() * 999999);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=1280&height=720&model=flux&nologo=true&seed=${seed}`;

    const response = await fetch(url, { timeout: 90000 } as RequestInit);
    if (!response.ok) {
      console.error(`  Pollinations error: ${response.status}`);
      return undefined;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      console.error(`  Pollinations returned non-image content: ${contentType}`);
      return undefined;
    }

    const imageBuffer = await response.buffer();
    return saveGeneratedImageBuffer(imageBuffer, slug);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`  Pollinations error: ${msg.slice(0, 120)}`);
    return undefined;
  }
}

// Generate AI image: Pollinations (free Flux) → Cloudflare SDXL → flux-1-schnell
async function generateAIImage(
  category: string,
  title: string,
  summary: string,
  slug: string
): Promise<string | undefined> {
  console.log(`  Building context-aware image prompt...`);
  const imagePrompt = await generateImagePrompt(title, summary, category);
  console.log(`  Image prompt: ${imagePrompt.slice(0, 120)}...`);

  // 1st choice: Pollinations.ai — free, no API key, Flux model
  const result = await generateAIImagePollinations(imagePrompt, slug);
  if (result) return result;

  console.log('  Pollinations failed, falling back to Cloudflare SDXL...');

  // 2nd choice: Cloudflare SDXL Lightning
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    console.log('  No fallback credentials configured, skipping.');
    return undefined;
  }

  try {
    console.log(`  Generating image with Cloudflare Workers AI (SDXL Lightning)...`);
    const sdxlPrompt = `masterpiece, best quality, Studio Ghibli anime style, watercolor illustration, ${imagePrompt.replace(/[.!?]/g, ',').slice(0, 400)}`;

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/bytedance/stable-diffusion-xl-lightning`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: sdxlPrompt,
          negative_prompt: SDXL_NEGATIVE_PROMPT,
          num_steps: 4,
          guidance: 0,
          width: 1024,
          height: 576,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`  SDXL Lightning error: ${response.status} — ${errorText.slice(0, 100)}`);
      return generateAIImageFallback(imagePrompt, slug);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('image/') || contentType.includes('application/octet-stream')) {
      const imageBuffer = await response.buffer();
      return saveGeneratedImageBuffer(imageBuffer, slug);
    }

    const result2 = await response.json() as { success: boolean; result?: { image: string } };
    if (!result2.success || !result2.result?.image) {
      return generateAIImageFallback(imagePrompt, slug);
    }

    return saveGeneratedImage(result2.result.image, slug);

  } catch (error) {
    console.error('  Error generating AI image:', error);
    return undefined;
  }
}

// Fallback: flux-1-schnell if SDXL Lightning is unavailable
async function generateAIImageFallback(imagePrompt: string, slug: string): Promise<string | undefined> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt, num_steps: 8 }),
      }
    );
    if (!response.ok) return undefined;
    const result = await response.json() as { success: boolean; result?: { image: string } };
    if (!result.success || !result.result?.image) return undefined;
    return saveGeneratedImage(result.result.image, slug);
  } catch {
    return undefined;
  }
}

// Save raw binary image buffer as optimized WebP
async function saveGeneratedImageBuffer(imageBuffer: Buffer, slug: string): Promise<string | undefined> {
  try {
    const imagesDir = path.join(process.cwd(), 'public/images/posts');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

    const filename = `${slug}.webp`;
    const outputPath = path.join(imagesDir, filename);

    await sharp(imageBuffer)
      .resize(1200, 630, { fit: 'cover', position: 'center' })
      .webp({ quality: 88, effort: 5 })
      .toFile(outputPath);

    const publicPath = `/images/posts/${filename}`;
    console.log(`  Image saved (binary): ${publicPath}`);

    // Generate animated WebP in background (non-blocking)
    createAnimatedThumbnail(outputPath, slug).catch(() => {});

    return publicPath;
  } catch (error) {
    console.error('  Error saving binary image:', error);
    return undefined;
  }
}

// Save base64 image as optimized WebP
async function saveGeneratedImage(base64Image: string, slug: string): Promise<string | undefined> {
  try {
    const imageBuffer = Buffer.from(base64Image, 'base64');
    const imagesDir = path.join(process.cwd(), 'public/images/posts');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

    const filename = `${slug}.webp`;
    const outputPath = path.join(imagesDir, filename);

    await sharp(imageBuffer)
      .resize(1200, 630, { fit: 'cover', position: 'center' })
      .webp({ quality: 88, effort: 5 })
      .toFile(outputPath);

    const publicPath = `/images/posts/${filename}`;
    console.log(`  Image saved: ${publicPath}`);

    // Generate animated WebP in background (non-blocking)
    createAnimatedThumbnail(outputPath, slug).catch(() => {});

    return publicPath;
  } catch (error) {
    console.error('  Error saving image:', error);
    return undefined;
  }
}

// Create animated WebP thumbnail using Ken Burns effect
// Returns path to animated WebP (saves alongside static WebP)
async function createAnimatedThumbnail(staticWebpPath: string, slug: string): Promise<string | undefined> {
  try {
    const OUTPUT_W = 1200;
    const OUTPUT_H = 630;
    const NUM_FRAMES = 16;
    const FRAME_DELAY = 120; // ms per frame → ~2s full loop

    // Load and resize base image slightly larger for Ken Burns headroom
    const scale = 1.07;
    const scaledW = Math.round(OUTPUT_W * scale);
    const scaledH = Math.round(OUTPUT_H * scale);

    const baseBuffer = await sharp(staticWebpPath)
      .resize(scaledW, scaledH, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
      .toBuffer();

    // Build frames: subtle pan + zoom (upper-left → lower-right)
    const sharpFrames = Array.from({ length: NUM_FRAMES }, (_, i) => {
      const t = i / (NUM_FRAMES - 1); // 0 → 1
      const left = Math.round(t * (scaledW - OUTPUT_W));
      const top  = Math.round(t * (scaledH - OUTPUT_H));
      return sharp(baseBuffer).extract({ left, top, width: OUTPUT_W, height: OUTPUT_H });
    });

    // Combine into animated WebP via sharp-gif2
    const animated = await GIF
      .createGif({ delay: FRAME_DELAY, repeat: 0, width: OUTPUT_W, height: OUTPUT_H })
      .addFrame(sharpFrames)
      .toSharp();

    const imagesDir = path.join(process.cwd(), 'public/images/posts');
    const animFilename = `${slug}-animated.webp`;
    const animPath = path.join(imagesDir, animFilename);

    await animated.webp({ loop: 0 }).toFile(animPath);

    const publicPath = `/images/posts/${animFilename}`;
    const fileSizeKb = Math.round(fs.statSync(animPath).size / 1024);
    console.log(`  Animated WebP saved: ${publicPath} (${fileSizeKb}KB, ${NUM_FRAMES} frames)`);
    return publicPath;
  } catch (error) {
    console.error('  Error creating animated thumbnail:', error);
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

// Initialize Groq via OpenAI-compatible endpoint (for text/LLM tasks)
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

// Extract a YAML field value supporting all common YAML scalar formats
function extractYamlField(content: string, field: string): string | null {
  // Double-quoted: field: "value"
  const dqMatch = content.match(new RegExp(`^${field}:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'm'));
  if (dqMatch) return dqMatch[1].replace(/\\"/g, '"');

  // Single-quoted: field: 'value'
  const sqMatch = content.match(new RegExp(`^${field}:\\s*'((?:[^']|'')*)'`, 'm'));
  if (sqMatch) return sqMatch[1].replace(/''/g, "'");

  // Block scalar: field: >-\n  line1\n  line2
  const blockMatch = content.match(new RegExp(`^${field}:\\s*>-?\\s*\\n((?:[ \\t]+.+\\n?)+)`, 'm'));
  if (blockMatch) return blockMatch[1].replace(/^[ \t]+/gm, '').replace(/\n/g, ' ').trim();

  // Plain scalar: field: value (no quotes, single line)
  const plainMatch = content.match(new RegExp(`^${field}:\\s*([^\\n'">{|][^\\n]*)`, 'm'));
  if (plainMatch) return plainMatch[1].trim();

  return null;
}

// Load existing article titles for duplicate detection
function loadExistingTitles(): string[] {
  const titles: string[] = [];
  try {
    if (!fs.existsSync(CONTENT_DIR)) return titles;

    const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
      const title = extractYamlField(content, 'title');
      const originalTitle = extractYamlField(content, 'originalTitle');
      if (title) titles.push(title.toLowerCase());
      if (originalTitle) titles.push(originalTitle.toLowerCase());
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
        console.error('  JSON parse failed after all attempts. Raw text:', text.slice(0, 300));
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response = await (openai.chat.completions.create as any)({
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
          response_format: { type: 'json_object' },
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

  // Process top KPOP items (MAX_ARTICLES env var overrides default of 3)
  const maxArticles = parseInt(process.env.MAX_ARTICLES || '3', 10);
  const itemsToProcess = scoredItems.slice(0, maxArticles).map(s => s.item);
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
