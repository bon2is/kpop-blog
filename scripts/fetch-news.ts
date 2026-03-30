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
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Cloudflare R2 client (S3-compatible) — used when R2 env vars are set
const r2Client = (
  process.env.R2_ENDPOINT &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY
) ? new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
}) : null;

// Upload a buffer to R2 and return its public URL
async function uploadToR2(buffer: Buffer, key: string): Promise<string | undefined> {
  if (!r2Client || !process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) {
    return undefined;
  }
  try {
    await r2Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    const publicUrl = `${process.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
    console.log(`  R2 upload: ${key}`);
    return publicUrl;
  } catch (error) {
    console.error('  R2 upload error:', error);
    return undefined;
  }
}

// Types for extracted media
interface ExtractedMedia {
  youtubeLinks: string[];
  externalLinks: { url: string; text: string }[];
  ogImage?: string;   // og:image from original article (press/promotional photo)
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

    // Extract og:image (official press/promotional photo)
    const ogImage =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('meta[name="twitter:image:src"]').attr('content');
    if (ogImage && ogImage.startsWith('http')) {
      result.ogImage = ogImage;
      console.log(`  Found og:image: ${ogImage.slice(0, 80)}...`);
    }

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

// Extract the primary K-pop subject (group or solo artist) for image search
function extractKpopSubject(title: string, summary: string): string | null {
  // Solo artist map: [Wikipedia-friendly display name, search terms[]]
  // Checked BEFORE group detection to avoid summary mentions hijacking the result
  // e.g. "Baekhyun To Appear On..." should not become BTS just because summary mentions BTS
  const soloArtists: [string, string[]][] = [
    ['Jungkook', ['jungkook']],
    ['Jimin', [' jimin bts', ' jimin ']],
    ['Kim Taehyung', ['kim taehyung', ' taehyung ']],
    ['Suga', [' suga bts', 'agust d']],
    ['J-Hope', ['j-hope', 'jhope']],
    ['Jin BTS', [' jin bts', ' seokjin']],
    ['RM BTS', [' rm bts', 'kim namjoon', ' namjoon ']],
    ['Jennie', [' jennie ']],
    ['Lisa', [' lisa ']],
    ['Jisoo', [' jisoo ']],
    ['Rosé', ['rosé', ' rose ']],
    ['Taeyeon', ['taeyeon']],
    ['Taemin', ['taemin']],
    ['Baekhyun', ['baekhyun']],
    ['Hwasa', ['hwasa']],
    ['Hyunjin', [' hyunjin ']],
    ['IU singer', [' iu ', " 'iu'", ' "iu"']],
    ['G-Dragon', ['g-dragon', 'gdragon']],
    ['Karina aespa', ['karina aespa']],
    ['Wonyoung', ['wonyoung']],
  ];

  // Step 1: solo artist match on title only (most reliable signal)
  const titleLower = title.toLowerCase();
  for (const [name, terms] of soloArtists) {
    if (terms.some(t => titleLower.includes(t))) return name;
  }

  // Step 2: group match on title only
  const groupFromTitle = extractKpopGroup(title);
  if (groupFromTitle) return groupFromTitle;

  // Step 3: solo artist match on combined text (title + summary)
  const combinedLower = `${title} ${summary}`.toLowerCase();
  for (const [name, terms] of soloArtists) {
    if (terms.some(t => combinedLower.includes(t))) return name;
  }

  // Step 4: group match on combined text
  return extractKpopGroup(`${title} ${summary}`);
}

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

// Group concept themes — palette + setting ONLY, no real person descriptions
// Character is always a beautiful fictional K-pop idol (no real celebrity likeness)
const GROUP_THEMES: Record<string, { setting: string; palette: string }> = {
  'BTS':          { setting: 'dreamlike concert stadium, ocean of glowing purple lightsticks, cherry blossom petals drifting through the air, grand stage pyrotechnics', palette: 'deep violet, cobalt blue, soft lavender, silver shimmer' },
  'BLACKPINK':    { setting: 'luxury editorial stage with cascading pink rose petals, black velvet drapes, golden spotlights, rose-petal storm', palette: 'hot pink, jet black, rose gold, cream white' },
  'aespa':        { setting: 'breathtaking digital metaverse portal, swirling holographic particle effects, neon-cyan grid stretching into infinity', palette: 'holographic silver, teal, neon cyan, metallic white' },
  'NewJeans':     { setting: 'cozy sunlit café with pastel daisies, Y2K retro accessories, afternoon golden-hour window light, film grain haze', palette: 'baby blue, soft pink, cream white, pastel mint' },
  'IVE':          { setting: 'grand stage bathed in royal blue and champagne gold light, soft mist at the feet, aurora sky backdrop', palette: 'royal blue, pearl white, champagne gold, soft cream' },
  'LE SSERAFIM':  { setting: 'dramatic arena with motion-blur energy lines, sparks flying, intense red and navy stage lighting', palette: 'deep navy, crimson red, stark white, gold' },
  'TWICE':        { setting: 'vibrant stage surrounded by heart-shaped confetti, rainbow bokeh lights, balloons and blooming flowers everywhere', palette: 'candy pink, coral orange, rainbow pastels, soft white' },
  'SEVENTEEN':    { setting: 'center stage with diamond-blue sparkle formations, synchronized light pillars radiating outward, grand performance energy', palette: 'diamond blue, sky blue, silver white, pale gold' },
  'Stray Kids':   { setting: 'industrial performance space, neon green light slicing through dark fog, raw gritty urban atmosphere', palette: 'dark charcoal, neon green, deep crimson, black' },
  'NCT':          { setting: 'glowing neo-city skyline at night, geometric neon patterns reflecting on wet pavement, cyberpunk rain', palette: 'neon pink, metallic silver, electric white, deep blue' },
  'EXO':          { setting: 'celestial stage surrounded by galaxy of stars, supernatural golden aura light beams piercing the dark', palette: 'deep black, imperial gold, celestial deep blue, starlight white' },
  'ENHYPEN':      { setting: 'gothic garden at midnight, silver moonbeams through dark rose arches, dark red petals floating in the air', palette: 'deep purple, blood crimson, pale silver, midnight black' },
  'TXT':          { setting: 'surreal floating dreamscape, giant glowing moons, swirling book pages and twilight sky shifting from orange to purple', palette: 'twilight sky blue, soft burnt orange, dreamy purple, cream' },
  'ATEEZ':        { setting: 'theatrical stage with grand crimson spotlights, swirling stage fog, dramatic ship-deck set pieces, epic performance energy', palette: 'deep orange, pirate gold, crimson red, dark charcoal' },
  'Red Velvet':   { setting: 'candlelit velvet-curtain stage with floating red roses, playfully elegant split between a sweet café and a dramatic theatre', palette: 'deep crimson, velvet black, blush rose, warm gold' },
  'RIIZE':        { setting: 'golden-hour outdoor garden with sunflowers and warm sunset light, fresh youthful energy, lens flare', palette: 'warm sunset orange, fresh green, ivory white, golden yellow' },
  'BIGBANG':      { setting: 'legendary arena stage with electric yellow light beams and chrome surfaces, avant-garde artistic backdrop', palette: 'chrome silver, electric yellow, black, bold white' },
  'BABYMONSTER':  { setting: 'futuristic neon stage with bold color gel lights, explosive confetti and dynamic visual effects', palette: 'electric purple, hot pink, chrome silver, black' },
  'ZEROBASEONE':  { setting: 'clean modern stage with pristine white and blue lighting, rising sun visual motif in the backdrop', palette: 'sky blue, white, silver, sunrise gold' },
  'ITZY':         { setting: 'bold colorful stage set with graffiti art walls, neon signs, bright pop-art energy', palette: 'vivid yellow, hot pink, cobalt blue, white' },
  'MAMAMOO':      { setting: 'sophisticated jazz-club stage with warm amber lighting, vintage microphone stands, elegant velvet atmosphere', palette: 'warm amber, deep teal, gold, cream' },
  'SHINee':       { setting: 'sleek modern stage with clean geometric light structures and cool futuristic silver tones', palette: 'electric blue, silver, white, teal' },
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

// Category-based character archetypes (fictional, no real person)
const CATEGORY_CHARACTERS: Record<string, string> = {
  music:     'beautiful young woman, long silky dark hair adorned with crystal pins, luminous porcelain skin, sparkling almond eyes with long lashes, wearing an elaborate stage costume with embroidered details and flowing fabric',
  drama:     'elegant young woman with expressive deep eyes, porcelain skin touched with a soft blush, wearing a delicate lace-trimmed hanbok or cinematic period costume, hair pinned with jade ornaments',
  celebrity: 'graceful young woman with high cheekbones, radiant glowing skin, tasteful crystal jewelry, wearing a chic fashion-forward outfit that catches the light',
  fashion:   'stunning young woman with sharp elegant features, diamond drop earrings, flawless skin highlighted by soft shimmer, wearing a couture gown with intricate floral embroidery',
  variety:   'cheerful young woman with bright sparkling eyes, natural rosy cheeks, a warm infectious smile, wearing a colorful pastel casual outfit, hair in loose playful waves',
  news:      'poised young woman with calm luminous eyes, understated crystal jewelry, wearing a stylish modern outfit in soft neutral tones, expression serene and self-assured',
  audition:  'determined young woman in a sleek dance-practice outfit, fierce focused eyes, sweat-kissed glowing skin, dynamic pose full of raw energy',
  default:   'beautiful young woman with flowing hair, sparkling eyes, delicate features with luminous skin, wearing an elegant K-pop inspired outfit with jeweled accessories',
};

// Event-based scene settings
const EVENT_SCENES: Record<string, { scene: string; lighting: string }> = {
  comeback:  { scene: 'center stage with holographic album art glowing in the air, theatrical mist at the feet, dramatic spotlight', lighting: 'electric neon accent lights, volumetric god rays, stage smoke glow' },
  concert:   { scene: 'performing on a massive stage, ocean of colorful lightsticks glowing below, laser grid overhead', lighting: 'explosive LED stage lighting, laser beams cutting through smoke, crowd glow' },
  award:     { scene: 'grand award ceremony stage, golden confetti frozen mid-air, gleaming trophy in hand', lighting: 'single warm prestige spotlight, golden shimmer, soft fill light from the audience' },
  drama:     { scene: 'cinematic Korean drama setting — Han River at dusk with Seoul city lights reflecting on water, or a blooming palace garden in golden hour', lighting: 'warm cinematic golden-hour tones, soft film bokeh, gentle lens flare' },
  romance:   { scene: 'romantic rooftop above Seoul at twilight, warm café lights below, Han River in the distance, first stars appearing', lighting: 'amber and rose glow, soft bokeh city lights, gentle moonrise' },
  military:  { scene: 'bittersweet farewell scene under falling cherry blossom petals, crowd of supportive fans in the background', lighting: 'warm dawn light, soft morning mist, gentle golden rays' },
  debut:     { scene: 'first stage at sunrise, expression full of bright hope and nervous excitement, fresh new world opening before her', lighting: 'sunrise gradient bursting through, vibrant warm rays, limitless sky' },
  birthday:  { scene: 'festive celebration surrounded by colorful confetti, sparklers, and beautiful flowers, eyes wide with joy', lighting: 'golden sparkle glow, colorful bokeh, warm candlelight shimmer' },
  fashion:   { scene: 'luxury red carpet with marble columns and velvet drapes, cameras and flashing lights all around', lighting: 'dramatic front spotlights, editorial high-contrast, deep velvet shadows' },
  audition:  { scene: 'dance practice studio with wall-length mirror, a single intense spotlight, raw competitive energy', lighting: 'high-contrast single beam, deep dramatic shadows, sweat and determination' },
  scandal:   { scene: 'quiet contemplative moment gazing out a rain-streaked window, soft city lights blurred in the distance', lighting: 'moody chiaroscuro side-light, cool blue-grey tones, cinematic shadow play' },
  chart:     { scene: 'triumphant celebration with digital fireworks and neon streaming light trails exploding everywhere', lighting: 'colorful fireworks burst, neon glow, celebratory light storm' },
  general:   { scene: 'spectacular K-pop performance stage with dynamic light formations and dazzling visual effects', lighting: 'rich saturated stage lighting, high-contrast dramatic spotlight, vibrant K-pop energy' },
};

// Build ultra-detailed anime illustration prompt (no real person, fiction character only)
function buildImagePrompt(title: string, summary: string, category: string): string {
  const combinedText = `${title} ${summary}`;
  const group = extractKpopGroup(combinedText);
  const eventType = detectEventType(combinedText);

  const groupTheme = group ? GROUP_THEMES[group] : null;
  const eventScene = EVENT_SCENES[eventType] || EVENT_SCENES['general'];
  const character = CATEGORY_CHARACTERS[category] || CATEGORY_CHARACTERS['default'];

  // Quality boosters — critical for high-detail output with FLUX
  const quality = 'masterpiece, best quality, ultra-detailed, 8k resolution, (intricate details:1.3), (highly detailed face:1.2)';

  // Style — matching reference images: anime-3D hybrid, ultra-detailed illustration
  const style = 'stunning anime digital art illustration, 3D render quality, highly detailed sparkling eyes, ultra-detailed skin texture with soft glow, intricate jewelry and accessories, cinematic composition, widescreen 16:9';

  // Setting: group theme overrides event scene if available
  const setting = groupTheme
    ? `${eventScene.scene}, within ${groupTheme.setting}`
    : eventScene.scene;

  // Lighting
  const lighting = `${eventScene.lighting}, soft volumetric lighting, dreamy bokeh background, glitter sparkle particles, luminous ambient glow`;

  // Color palette
  const palette = groupTheme?.palette ?? (() => {
    const palettes: Record<string, string> = {
      music:     'electric pink, deep purple, neon blue, golden highlights',
      drama:     'warm golden amber, soft teal, cinematic warm orange, sakura pink',
      celebrity: 'rose gold, champagne, pearl white, soft lavender',
      fashion:   'deep jewel tones, champagne gold, editorial contrast',
      variety:   'bright rainbow pastels, warm coral, sunny yellow, mint green',
      news:      'warm gold, soft sky blue, elegant silver, cream',
      audition:  'stark white, neon blue, dark charcoal, electric energy',
    };
    return palettes[category] || 'warm golden tones, soft pink, lavender, luminous whites';
  })();

  return `${quality}, ${style}, ${character}, ${setting}, ${lighting}, color palette: ${palette}, no text, no watermarks, no logos, no real person, fictional character only`;
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
    // Use LLM to creatively enhance the structured prompt
    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an expert AI image prompt engineer specializing in ultra-detailed anime illustration thumbnails for K-Pop news articles.

Your output will be fed directly to a FLUX image generation model.

RULES:
- Output ONLY comma-separated prompt tags (no sentences, no explanations)
- Always keep: masterpiece, best quality, ultra-detailed, 8k
- Character MUST be a fictional beautiful girl — NEVER describe or reference any real K-pop celebrity
- Add 2-3 specific visual tags inspired by the article mood (e.g. "falling cherry blossoms", "golden trophy", "concert lightsticks", "neon stage lights")
- Style: anime digital art, 3D render quality, highly detailed face
- NEVER add: watermark, text, logo, real person name, photorealistic
- Keep total output under 200 characters
- Output ONLY the final prompt tags, nothing else`
        },
        {
          role: 'user',
          content: `Base prompt: ${basePrompt}

Article: ${title} — ${summary.slice(0, 150)}

Enhance with 2-3 mood-specific visual tags. Output comma-separated tags only.`
        }
      ],
      temperature: 0.6,
      max_tokens: 200,
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

// Negative prompt for SDXL — ultra-detail anime, no photorealism, no real persons
const SDXL_NEGATIVE_PROMPT = '(worst quality, low quality:1.4), (bad anatomy:1.3), (ugly face:1.3), photorealistic, real photograph, live action photo, western cartoon, deformed, extra limbs, blurry, watermark, text, logo, signature, duplicate, nsfw, explicit, real celebrity, real person, actor face, idol face';

// Generate AI image: Cloudflare SDXL Lightning → flux-1-schnell fallback
async function generateAIImage(
  category: string,
  title: string,
  summary: string,
  slug: string
): Promise<string | undefined> {
  console.log(`  Building context-aware image prompt...`);
  const imagePrompt = await generateImagePrompt(title, summary, category);
  console.log(`  Image prompt: ${imagePrompt.slice(0, 120)}...`);

  // Note: Pollinations.ai (image.pollinations.ai) has migrated and is no longer functional.

  // 2nd choice: Cloudflare SDXL Lightning
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    console.log('  No fallback credentials configured, skipping.');
    return undefined;
  }

  try {
    console.log(`  Generating image with Cloudflare Workers AI (SDXL Lightning)...`);
    const sdxlPrompt = `masterpiece, best quality, ultra-detailed, 8k, (intricate details:1.3), beautiful anime girl, stunning anime digital art, ${imagePrompt.replace(/[.!?]/g, ',').slice(0, 400)}, no text, no watermarks, no real person`;

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

// Download image from URL and save as optimized WebP
async function downloadImageFromUrl(imageUrl: string, slug: string): Promise<string | undefined> {
  try {
    const response = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KpopDailyBot/1.0)' },
      timeout: 15000,
    });
    if (!response.ok) return undefined;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return undefined;

    const imageBuffer = await response.buffer();
    if (imageBuffer.length < 5000) return undefined; // Skip tiny/broken images

    return saveGeneratedImageBuffer(imageBuffer, slug);
  } catch (error) {
    console.error('  Error downloading image:', error);
    return undefined;
  }
}

// Search Wikipedia for K-Drama poster image (free, no API key, CC/fair-use licensed)
async function fetchWikipediaImage(title: string, slug: string): Promise<string | undefined> {
  try {
    // Strip episode/season/subtitle info to get clean drama title
    const searchTitle = title
      .replace(/\b(episode|ep\.?|season|s\d+|e\d+)\s*\d+.*$/i, '')
      .replace(/[-–|:].{0,40}$/, '')
      .trim()
      .slice(0, 60);

    const wikiHeaders = {
      'User-Agent': 'KpopDailyBot/1.0 (https://kpop.andxo.com; contact via site)',
      'Accept': 'application/json',
    };

    // Step 1: Try direct page summary (works if title matches Wikipedia page exactly)
    const directUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTitle)}`;
    console.log(`  Searching Wikipedia for drama: "${searchTitle}"`);

    let imageUrl: string | undefined;

    const directRes = await fetch(directUrl, { headers: wikiHeaders, timeout: 10000 });
    if (directRes.ok) {
      const data = await directRes.json() as {
        originalimage?: { source?: string };
        thumbnail?: { source?: string };
        title?: string;
      };
      imageUrl = data.originalimage?.source || data.thumbnail?.source;
      if (imageUrl) console.log(`  Wikipedia direct match: "${data.title}"`);
    }

    // Step 2: If no direct match, use MediaWiki search API
    if (!imageUrl) {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTitle + ' TV series drama')}&srlimit=3&format=json&origin=*`;
      const searchRes = await fetch(searchUrl, { headers: wikiHeaders, timeout: 10000 });
      if (!searchRes.ok) return undefined;

      const searchData = await searchRes.json() as { query?: { search?: Array<{ title: string }> } };
      const firstResult = searchData.query?.search?.[0];
      if (!firstResult) {
        console.log(`  Wikipedia: no results for "${searchTitle}"`);
        return undefined;
      }

      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstResult.title)}`;
      const summaryRes = await fetch(summaryUrl, { headers: wikiHeaders, timeout: 10000 });
      if (!summaryRes.ok) return undefined;

      const summaryData = await summaryRes.json() as {
        originalimage?: { source?: string };
        thumbnail?: { source?: string };
        title?: string;
      };
      imageUrl = summaryData.originalimage?.source || summaryData.thumbnail?.source;
      if (imageUrl) console.log(`  Wikipedia search match: "${summaryData.title}"`);
    }

    if (!imageUrl) return undefined;
    return downloadImageFromUrl(imageUrl, slug);
  } catch (error) {
    console.error('  Wikipedia search error:', error);
    return undefined;
  }
}

// Save raw binary image buffer as optimized WebP — R2 preferred, local fallback
async function saveGeneratedImageBuffer(imageBuffer: Buffer, slug: string): Promise<string | undefined> {
  try {
    const filename = `${slug}.webp`;

    // Convert to 1200×630 WebP buffer once
    const webpBuffer = await sharp(imageBuffer)
      .resize(1200, 630, { fit: 'cover', position: 'center' })
      .webp({ quality: 88, effort: 5 })
      .toBuffer();

    // R2: upload if configured
    if (r2Client) {
      const r2Url = await uploadToR2(webpBuffer, `posts/${filename}`);
      if (r2Url) {
        createAnimatedThumbnailR2(webpBuffer, slug).catch(() => {});
        return r2Url;
      }
    }

    // Local fallback
    const imagesDir = path.join(process.cwd(), 'public/images/posts');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
    const outputPath = path.join(imagesDir, filename);
    await sharp(webpBuffer).toFile(outputPath);
    console.log(`  Image saved locally: /images/posts/${filename}`);
    createAnimatedThumbnail(outputPath, slug).catch(() => {});
    return `/images/posts/${filename}`;
  } catch (error) {
    console.error('  Error saving image buffer:', error);
    return undefined;
  }
}

// Save base64 image as optimized WebP
async function saveGeneratedImage(base64Image: string, slug: string): Promise<string | undefined> {
  return saveGeneratedImageBuffer(Buffer.from(base64Image, 'base64'), slug);
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

// Create animated WebP and upload to R2 (background task, R2 mode only)
async function createAnimatedThumbnailR2(staticBuffer: Buffer, slug: string): Promise<void> {
  try {
    const OUTPUT_W = 1200, OUTPUT_H = 630, NUM_FRAMES = 16, FRAME_DELAY = 120;
    const scale = 1.07;
    const scaledW = Math.round(OUTPUT_W * scale);
    const scaledH = Math.round(OUTPUT_H * scale);

    const baseBuffer = await sharp(staticBuffer)
      .resize(scaledW, scaledH, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
      .toBuffer();

    const sharpFrames = Array.from({ length: NUM_FRAMES }, (_, i) => {
      const t = i / (NUM_FRAMES - 1);
      const left = Math.round(t * (scaledW - OUTPUT_W));
      const top  = Math.round(t * (scaledH - OUTPUT_H));
      return sharp(baseBuffer).extract({ left, top, width: OUTPUT_W, height: OUTPUT_H });
    });

    const animated = await GIF
      .createGif({ delay: FRAME_DELAY, repeat: 0, width: OUTPUT_W, height: OUTPUT_H })
      .addFrame(sharpFrames)
      .toSharp();

    const animBuffer = await animated.webp({ loop: 0 }).toBuffer();
    await uploadToR2(animBuffer, `posts/${slug}-animated.webp`);
    console.log(`  Animated WebP uploaded to R2: posts/${slug}-animated.webp`);
  } catch (error) {
    console.error('  Error creating animated thumbnail for R2:', error);
  }
}

// ── Official artist image sources (priority 1–4) ─────────────────────────────

// 1. Wikipedia: official artist/group page thumbnail (free, no key needed)
async function fetchArtistImageWikipedia(subject: string, slug: string): Promise<string | undefined> {
  try {
    const wikiHeaders = {
      'User-Agent': 'KpopDailyBot/1.0 (https://kpop.andxo.com; contact via site)',
      'Accept': 'application/json',
    };
    console.log(`  [Wikipedia] Searching: "${subject}"`);

    let imageUrl: string | undefined;

    // Direct page lookup (works when subject matches Wikipedia title exactly)
    const directRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(subject)}`,
      { headers: wikiHeaders, timeout: 10000 }
    );
    if (directRes.ok) {
      const data = await directRes.json() as {
        originalimage?: { source?: string };
        thumbnail?: { source?: string };
        title?: string;
      };
      imageUrl = data.originalimage?.source || data.thumbnail?.source;
      if (imageUrl) console.log(`  [Wikipedia] Direct match: "${data.title}"`);
    }

    // Fallback: MediaWiki search API
    if (!imageUrl) {
      const searchRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(subject + ' K-pop singer group')}&srlimit=3&format=json&origin=*`,
        { headers: wikiHeaders, timeout: 10000 }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json() as {
          query?: { search?: Array<{ title: string }> };
        };
        const firstResult = searchData.query?.search?.[0];
        if (firstResult) {
          const summaryRes = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstResult.title)}`,
            { headers: wikiHeaders, timeout: 10000 }
          );
          if (summaryRes.ok) {
            const summaryData = await summaryRes.json() as {
              originalimage?: { source?: string };
              thumbnail?: { source?: string };
              title?: string;
            };
            imageUrl = summaryData.originalimage?.source || summaryData.thumbnail?.source;
            if (imageUrl) console.log(`  [Wikipedia] Search match: "${summaryData.title}"`);
          }
        }
      }
    }

    if (!imageUrl) {
      console.log(`  [Wikipedia] No image for "${subject}"`);
      return undefined;
    }
    return downloadImageFromUrl(imageUrl, slug);
  } catch (error) {
    console.error('  [Wikipedia] Error:', error);
    return undefined;
  }
}

// 2. Last.fm: scrape og:image from artist page
// Note: Last.fm API no longer returns artist images since Aug 2019 — page scrape instead
async function fetchArtistImageLastFm(subject: string, slug: string): Promise<string | undefined> {
  try {
    const pageUrl = `https://www.last.fm/music/${encodeURIComponent(subject.replace(/\s+/g, '+'))}`;
    console.log(`  [Last.fm] Fetching: "${subject}"`);

    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 12000,
    });

    if (!response.ok) {
      console.log(`  [Last.fm] Not found: "${subject}" (${response.status})`);
      return undefined;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // og:image is the artist promo/press photo on Last.fm
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage && ogImage.startsWith('http')
        && !ogImage.includes('/default_') && !ogImage.includes('placeholder')) {
      console.log(`  [Last.fm] Found og:image`);
      return downloadImageFromUrl(ogImage, slug);
    }

    // Fallback: artist header image element
    const headerSrc = $('.header-new-background-image').attr('src') ||
                      $('.artist-header-image img').attr('src');
    if (headerSrc && headerSrc.startsWith('http')) {
      console.log(`  [Last.fm] Found header image`);
      return downloadImageFromUrl(headerSrc, slug);
    }

    console.log(`  [Last.fm] No suitable image for "${subject}"`);
    return undefined;
  } catch (error) {
    console.error('  [Last.fm] Error:', error);
    return undefined;
  }
}

// 3. Melon crawl: parse artist image from Melon search page HTML
// Melon uses SSR for initial artist cards, so some data is in raw HTML
async function fetchArtistImageMelonCrawl(subject: string, slug: string): Promise<string | undefined> {
  try {
    console.log(`  [Melon Crawl] Searching: "${subject}"`);
    const searchUrl = `https://www.melon.com/search/keyword/index.htm?q=${encodeURIComponent(subject)}`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Referer': 'https://www.melon.com',
      },
      timeout: 12000,
    });

    if (!response.ok) {
      console.log(`  [Melon Crawl] Request failed: ${response.status}`);
      return undefined;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Look for artist image in Melon's SSR-rendered artist cards
    const imgUrl =
      $('img[src*="cdnimg.melon.co.kr/cm/artist"]').first().attr('src') ||
      $('div.artist img.thumb_atist').first().attr('src') ||
      $('li.artist .thumb img').first().attr('src');

    if (imgUrl && imgUrl.startsWith('http')) {
      console.log(`  [Melon Crawl] Found artist image`);
      return downloadImageFromUrl(imgUrl, slug);
    }

    // Extract artistId from page JS/HTML and construct Melon CDN URL
    const artistIdMatch = html.match(/artistId['":\s=]+(\d{5,8})/);
    if (artistIdMatch) {
      const artistId = artistIdMatch[1];
      const cdnUrl = `https://cdnimg.melon.co.kr/cm/artist/images/${artistId}/${artistId}.jpg`;
      console.log(`  [Melon Crawl] Trying CDN for artistId=${artistId}`);
      const result = await downloadImageFromUrl(cdnUrl, slug);
      if (result) return result;
    }

    console.log(`  [Melon Crawl] No image for "${subject}"`);
    return undefined;
  } catch (error) {
    console.error('  [Melon Crawl] Error:', error);
    return undefined;
  }
}

// 4. Melon API: find artistId via AJAX, then fetch from Melon CDN / artist info API
async function fetchArtistImageMelonApi(subject: string, slug: string): Promise<string | undefined> {
  try {
    console.log(`  [Melon API] Searching: "${subject}"`);

    // Use Melon's search with XHR headers to get a lighter response
    const searchUrl = `https://www.melon.com/search/keyword/index.htm?q=${encodeURIComponent(subject)}&section=artist&display=5&page=1`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://www.melon.com',
      },
      timeout: 12000,
    });

    if (!searchRes.ok) return undefined;

    const text = await searchRes.text();

    // Find artistId in the JSON/HTML response
    const artistIdMatch = text.match(/["']?artistId["']?\s*[:=]\s*["']?(\d{5,8})["']?/);
    if (!artistIdMatch) {
      console.log(`  [Melon API] artistId not found for "${subject}"`);
      return undefined;
    }

    const artistId = artistIdMatch[1];
    console.log(`  [Melon API] Found artistId=${artistId}`);

    // Try Melon's artist timeline/info API
    const infoRes = await fetch(
      `https://www.melon.com/artist/albumTimelineList.json?artistId=${artistId}&listType=artistAlbum&startIndex=1&pageSize=1`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://www.melon.com',
        },
        timeout: 10000,
      }
    );

    if (infoRes.ok) {
      const data = await infoRes.json() as {
        artistInfo?: { artistImgPath?: string };
      };
      const imgPath = data?.artistInfo?.artistImgPath;
      if (imgPath && imgPath.startsWith('http')) {
        console.log(`  [Melon API] Found artist image via API`);
        return downloadImageFromUrl(imgPath, slug);
      }
    }

    // Final fallback: construct CDN URL from artistId
    const cdnUrl = `https://cdnimg.melon.co.kr/cm/artist/images/${artistId}/${artistId}.jpg`;
    console.log(`  [Melon API] Trying CDN URL for artistId=${artistId}`);
    return downloadImageFromUrl(cdnUrl, slug);
  } catch (error) {
    console.error('  [Melon API] Error:', error);
    return undefined;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

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
  {
    name: 'HelloKpop',
    url: 'https://www.hellokpop.com/feed/',
    enabled: true,
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

// Determine category based on content — ordered by specificity (most specific first)
function detectCategory(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();

  // K-Drama is very specific
  if (
    text.includes('k-drama') || text.includes('kdrama') ||
    text.includes(' drama') || text.includes('drama series') ||
    text.includes('drama cast') || text.includes('ott') || text.includes('netflix') ||
    text.includes('disney+') || text.includes('streaming') ||
    text.includes('episode') || text.includes('k-movie') || text.includes('korean movie')
  ) {
    return 'drama';
  }

  // Award shows
  if (
    text.includes('award') || text.includes('daesang') || text.includes('bonsang') ||
    text.includes('mama ') || text.includes('melon music') || text.includes('gaon') ||
    text.includes('billboard korea') || text.includes('golden disc') || text.includes('seoul music awards')
  ) {
    return 'award';
  }

  // Tours & concerts
  if (
    text.includes('world tour') || text.includes('concert tour') ||
    text.includes('fan meeting') || text.includes('fanmeeting') ||
    text.includes(' tour ') || text.includes('sold out') ||
    (text.includes('concert') && !text.includes('album') && !text.includes('comeback'))
  ) {
    return 'tour';
  }

  // New releases / comebacks (prioritize over general music)
  if (text.includes('comeback') || text.includes('new release') || text.includes('dropped')) {
    return 'comeback';
  }

  if (text.includes('audition') || text.includes('trainee') || text.includes('debut')) {
    return 'audition';
  }
  if (text.includes('album') || text.includes('music video') || text.includes(' mv') || text.includes('chart') || text.includes('single')) {
    return 'music';
  }
  if (text.includes('fashion') || text.includes('style') || text.includes('outfit') || text.includes('wear') || text.includes('brand ambassador')) {
    return 'fashion';
  }
  if (text.includes('variety') || text.includes('running man') || text.includes('knowing bros') || text.includes('game show')) {
    return 'variety';
  }
  if (text.includes('dating') || text.includes('relationship') || text.includes('married') || text.includes('personal') || text.includes('enlist') || text.includes('military')) {
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
0. title: Rewrite the headline to maximize clicks on Google Discover and social media.
   RULES for title:
   - Keep it under 70 characters
   - Lead with the artist/group name if it's a major act (BTS, BLACKPINK, etc.)
   - Use emotional or curiosity-driven language: "Shocks Fans", "Breaks Silence", "Reveals", "Makes History", "Sparks Debate", "You Won't Believe", etc.
   - Be specific — include a key detail (album name, award, number) when relevant
   - Do NOT use clickbait that misrepresents the story
   - Example rewrites:
     - "BTS Announces New Album" → "BTS Drops Surprise Album Announcement — Release Date Revealed"
     - "BLACKPINK Jennie Attends Event" → "BLACKPINK Jennie Stuns at Paris Fashion Week in Rare Appearance"
1. excerpt: One punchy sentence (under 160 chars) that makes someone want to click.
2. summary: A factual summary of the news (2-3 sentences)
3. commentary: Your ORIGINAL analysis split into 3-4 SHORT paragraphs (use "\\n\\n" to separate paragraphs). Each paragraph should be 2-3 sentences. Cover:
   - Why this news matters
   - Context in the K-Pop industry
   - What this means for fans or the artist's career
4. tags: An array of 3-5 relevant keyword tags for this article. Include:
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

  // ── Negative filter ──────────────────────────────────────────────────────────
  // Substring match: safe for longer/unambiguous keywords
  const NEGATIVE_SUBSTR = [
    'death', 'died', 'dies', 'dead', 'funeral', 'suicide', 'suicid',
    'accident', 'crash', 'arrested', 'arrest', 'jail', 'prison', 'imprisoned',
    'charged', 'lawsuit', 'sued', 'scandal', 'accused', 'allegation',
    'assault', 'abuse', 'abusive', 'manipulat',
    'divorce', 'breakup', 'cheating', 'affair',
    'overdose', 'dui', 'drunk driving',
    'bullying', 'harassment', 'victim',
    'cancelled', 'canceled', 'boycott',
    'disaster', 'tragic', 'tragedy',
    'racism', 'racist', 'sexism', 'sexist',
    'disbandment', 'disbanding', 'disband',
    'controversy', 'controversi',
    // Exclude non-music K-drama content
    'k-drama', 'kdrama', 'acting role', 'starring in', 'cast in', 'lead role', 'lead actor', 'cameo',
  ];
  // Word-boundary match: short words prone to false positives
  // e.g. 'sue' would match 'issue'; 'army' matches 'BTS ARMY' (fandom name!)
  const NEGATIVE_WORD = [
    /\bsue\b/i, /\bdrug\b/i, /\bdrugs\b/i, /\bfail\b/i, /\bflop\b/i,
    /\bworst\b/i, /\bhate\b/i, /\bcheat\b/i, /\bcancel\b/i, /\bbully\b/i,
    /\bsplit\b/i,
  ];

  function isNegativeArticle(title: string, snippet: string): string | null {
    const text = `${title} ${snippet}`.toLowerCase();
    for (const kw of NEGATIVE_SUBSTR) {
      if (text.includes(kw)) return kw;
    }
    for (const re of NEGATIVE_WORD) {
      if (re.test(text)) return re.source;
    }
    return null;
  }

  const positiveItems = uniqueItems.filter((item) => {
    const hit = isNegativeArticle(item.title || '', item.contentSnippet || item.content || '');
    if (hit) {
      console.log(`  Skipping negative: "${item.title?.slice(0, 50)}" (${hit})`);
      return false;
    }
    return true;
  });
  console.log(`After negative filter: ${positiveItems.length}`);

  // ── K-Pop only filter ─────────────────────────────────────────────────────
  const kpopKeywords = [
    // Tier-1 global groups
    'bts', 'blackpink', 'twice', 'newjeans', 'aespa', 'ive', 'le sserafim',
    'stray kids', 'seventeen', 'nct', 'exo', 'red velvet', 'itzy', 'txt', 'enhypen',
    // Tier-2/3 groups
    'got7', 'monsta x', 'ateez', 'the boyz', 'treasure', 'g i-dle', 'gi-dle', 'gidle',
    'mamamoo', 'bigbang', '2ne1', 'girls generation', 'snsd', 'super junior', 'shinee',
    'riize', 'zerobaseone', 'boynextdoor', 'xikers', 'kiss of life', 'babymonster',
    'nmixx', 'kep1er', 'fromis', 'wjsn', 'oh my girl', 'loona', 'everglow', 'dreamcatcher',
    'billlie', 'viviz', 'weeekly', 'lapillus', 'katseye', 'illit', 'unis', 'fifty fifty',
    // Solo artists (popular for global search)
    'jungkook', 'jimin', 'taehyung', 'suga', ' rm ', 'j-hope', 'jhope',
    'jennie', 'lisa', 'rosé', 'jisoo', 'taeyeon', 'taemin', 'baekhyun', 'kai ',
    'hwasa', 'solar', 'moonbyul', 'wheein', 'hyunjin', 'felix stray',
    // Labels & platforms
    'hybe', 'jyp', 'sm entertainment', 'yg entertainment', 'starship', 'cube',
    // K-Pop terms
    'k-pop', 'kpop', 'idol', 'idols', 'comeback', 'debut', 'fandom', 'lightstick',
    'music show', 'inkigayo', 'music bank', 'mcountdown', 'show champion',
    'hanteo', 'circle chart', 'gaon', 'golden disc', 'mama award',
    'fan meeting', 'fan concert', 'weverse', 'vlive',
  ];

  const kpopItems = positiveItems.filter((item) => {
    const text = `${item.title || ''} ${item.contentSnippet || item.content || ''}`.toLowerCase();
    const ok = kpopKeywords.some(kw => text.includes(kw));
    if (!ok) console.log(`  Skipping non-KPOP: ${item.title?.slice(0, 50)}...`);
    return ok;
  });
  console.log(`K-Pop only items: ${kpopItems.length}`);

  if (kpopItems.length === 0) {
    console.log('No new K-Pop articles to process.');
    return;
  }

  // ── Priority scoring ──────────────────────────────────────────────────────
  // Fandom size tiers (global social following + search volume)
  const FANDOM_T1 = ['bts', 'blackpink'];                                        // +10
  const FANDOM_T2 = ['twice', 'seventeen', 'stray kids', 'nct', 'exo',
                     'aespa', 'ive', 'newjeans', 'le sserafim'];                 // +7
  const FANDOM_T3 = ['red velvet', 'enhypen', 'txt', 'ateez', 'itzy', 'nmixx',
                     'riize', 'babymonster', 'illit', 'zerobaseone', 'got7',
                     'mamamoo', 'bigbang', 'shinee', 'super junior', 'monsta x']; // +5
  const FANDOM_T4 = ['the boyz', 'treasure', 'g i-dle', 'kep1er', 'kiss of life',
                     'boynextdoor', 'xikers', 'katseye', 'fifty fifty',
                     'everglow', 'dreamcatcher', 'viviz', 'wjsn'];               // +3

  // High-search solo artists (BTS/BP members generate huge individual traffic)
  const SOLO_HIGH = ['jungkook', 'jimin', 'taehyung', 'suga', 'j-hope', 'jhope',
                     'jennie', 'lisa', 'rosé', 'jisoo', 'taeyeon', 'taemin',
                     'baekhyun', 'hwasa', 'hyunjin'];                            // +6

  // Urgency signals
  const URGENCY_BREAKING = [
    'breaking', 'just in', 'exclusive', 'official', 'confirms', 'announces', 'reveals',
    'comeback', 'new album', 'new single', 'music video', 'mv teaser', 'mv release',
    'world tour', 'tour dates', 'concert', 'sold out', 'debut',
    '#1', 'number one', 'record', 'historic', 'first time ever', 'milestone',
    'grammy', 'billboard', 'daesang', 'golden disc', 'mama award', 'award win',
    'collaboration', 'collab', 'featuring', 'pre-order',
  ];
  const URGENCY_MED = [
    'award', 'chart', 'million views', 'million streams', 'billion',
    'performance', 'stage', 'interview', 'photoshoot', 'magazine cover',
    'brand ambassador', 'fan meeting', 'anniversary', 'teaser',
  ];

  const scoredItems = kpopItems.map((item) => {
    const text = `${item.title || ''} ${item.contentSnippet || ''}`.toLowerCase();
    let score = 0;

    // Fandom size (only highest tier counts)
    if (FANDOM_T1.some(g => text.includes(g)))      score += 10;
    else if (FANDOM_T2.some(g => text.includes(g))) score += 7;
    else if (FANDOM_T3.some(g => text.includes(g))) score += 5;
    else if (FANDOM_T4.some(g => text.includes(g))) score += 3;

    // Solo artist bonus (stackable with group tier)
    if (SOLO_HIGH.some(a => text.includes(a))) score += 6;

    // Urgency/issue signals
    if (URGENCY_BREAKING.some(kw => text.includes(kw))) score += 5;
    score += Math.min(URGENCY_MED.filter(kw => text.includes(kw)).length * 2, 6);

    // Recency: freshness is critical for K-pop news
    if (item.pubDate) {
      const ageHours = (Date.now() - new Date(item.pubDate).getTime()) / 3600000;
      if (ageHours < 3)       score += 6;  // Breaking (<3h)
      else if (ageHours < 6)  score += 5;  // Very fresh
      else if (ageHours < 12) score += 3;  // Same morning
      else if (ageHours < 24) score += 2;  // Today
      else if (ageHours < 48) score += 1;  // Yesterday
      else                    score -= 3;  // Old — deprioritize
    }

    return { item, score };
  });

  scoredItems.sort((a, b) => b.score - a.score);

  console.log('Top scored K-Pop articles:');
  scoredItems.slice(0, 10).forEach((s, i) => {
    console.log(`  ${i + 1}. [${s.score}pts] ${s.item.title?.slice(0, 60)}`);
  });

  // ── Select top N, skipping same-batch duplicates ──────────────────────────
  const maxArticles = parseInt(process.env.MAX_ARTICLES || '5', 10);
  const sessionTitles: string[] = [];
  const itemsToProcess: typeof kpopItems = [];

  for (const { item } of scoredItems) {
    if (itemsToProcess.length >= maxArticles) break;
    if (!item.title || !item.link) continue;
    // Skip if similar to an article already selected in this run
    if (isDuplicateContent(item.title, [...existingTitles, ...sessionTitles])) {
      console.log(`  Skipping same-batch duplicate: ${item.title.slice(0, 50)}...`);
      continue;
    }
    itemsToProcess.push(item);
    sessionTitles.push(item.title);
  }

  console.log(`Processing ${itemsToProcess.length} articles`);
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

      // --- Image strategy: Wikipedia → Last.fm → Melon crawl → Melon API → YouTube → AI ---
      let thumbnail: string | undefined;
      let isAIGenerated = false;

      // Extract the K-pop artist/group for official image search
      const subject = extractKpopSubject(safeContent.title, safeContent.summary);
      if (subject) console.log(`  Subject: ${subject}`);

      // 1) Wikipedia: official artist/group page photo
      if (subject) {
        thumbnail = await fetchArtistImageWikipedia(subject, slug);
        if (thumbnail) console.log(`  Thumbnail: Wikipedia`);
      }

      // 2) Last.fm: official artist photo (scraped from artist page)
      if (!thumbnail && subject) {
        thumbnail = await fetchArtistImageLastFm(subject, slug);
        if (thumbnail) console.log(`  Thumbnail: Last.fm`);
      }

      // 3) Melon crawl: artist image from Melon search HTML
      if (!thumbnail && subject) {
        thumbnail = await fetchArtistImageMelonCrawl(subject, slug);
        if (thumbnail) console.log(`  Thumbnail: Melon crawl`);
      }

      // 4) Melon API: artist image via Melon CDN/API
      if (!thumbnail && subject) {
        thumbnail = await fetchArtistImageMelonApi(subject, slug);
        if (thumbnail) console.log(`  Thumbnail: Melon API`);
      }

      // 5) YouTube thumbnail from extracted article links
      if (!thumbnail && extractedMedia.youtubeLinks.length > 0) {
        const videoId = extractYouTubeId(extractedMedia.youtubeLinks[0]);
        if (videoId) {
          thumbnail = await downloadImageFromUrl(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, slug);
          if (!thumbnail) {
            thumbnail = await downloadImageFromUrl(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, slug);
          }
          if (thumbnail) console.log(`  Thumbnail: YouTube (${videoId})`);
        }
      }

      // 6) AI-generated fallback (last resort)
      if (!thumbnail) {
        thumbnail = await generateAIImage(category, safeContent.title, safeContent.summary, slug);
        if (thumbnail) isAIGenerated = true;
        console.log(`  Thumbnail: ${thumbnail ? 'AI-generated (fallback)' : 'skipped'}`);
      }

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
        isAIGenerated,
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
