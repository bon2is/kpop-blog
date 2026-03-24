/**
 * backfill-images.ts
 *
 * 기존 기사 이미지를 새 전략으로 소급 업데이트합니다:
 *   1) YouTube 썸네일 (원본 기사에서 YouTube 링크 추출)
 *   2) AI 생성 ultra-detail anime (fetch-news.ts와 동일한 프롬프트 엔진)
 *
 * 실행: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/backfill-images.ts
 *
 * 옵션:
 *   --dry-run      실제로 파일을 변경하지 않고 결과만 출력
 *   --limit N      최대 N개 기사만 처리 (기본값: 전체)
 *   --category X   특정 카테고리만 처리
 *   --ai-only      YouTube 없는 기사만 처리 (AI 이미지 품질 업그레이드)
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import sharp from 'sharp';
import OpenAI from 'openai';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fetch = require('node-fetch');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cheerio = require('cheerio');

const CONTENT_DIR = path.join(process.cwd(), 'content/posts');
const IMAGES_DIR = path.join(process.cwd(), 'public/images/posts');

const args = process.argv.slice(2);
const DRY_RUN   = args.includes('--dry-run');
const AI_ONLY   = args.includes('--ai-only');
const LIMIT = (() => { const i = args.indexOf('--limit'); return i !== -1 ? parseInt(args[i + 1], 10) : Infinity; })();
const FILTER_CATEGORY = (() => { const i = args.indexOf('--category'); return i !== -1 ? args[i + 1] : null; })();

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || '',
  baseURL: process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : undefined,
});

// ── YouTube ───────────────────────────────────────────────────────────────────

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

async function extractYouTubeFromArticle(articleUrl: string): Promise<string | undefined> {
  try {
    const response = await fetch(articleUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KpopDailyBot/1.0)' },
      timeout: 12000,
    });
    if (!response.ok) return undefined;

    const html = await response.text();
    const $ = cheerio.load(html);
    const seen = new Set<string>();

    let videoId: string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $('a[href], iframe[src]').each((_: number, el: any) => {
      if (videoId) return;
      const attr = $(el).attr('href') || $(el).attr('src') || '';
      const id = extractYouTubeId(attr);
      if (id && !seen.has(id)) { seen.add(id); videoId = id; }
    });
    return videoId;
  } catch {
    return undefined;
  }
}

async function getYouTubeThumbnail(videoId: string, slug: string): Promise<string | undefined> {
  const thumbnail = await downloadAndSave(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, slug);
  if (thumbnail) return thumbnail;
  return downloadAndSave(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, slug);
}

// ── Image download ────────────────────────────────────────────────────────────

async function downloadAndSave(imageUrl: string, slug: string): Promise<string | undefined> {
  try {
    const response = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KpopDailyBot/1.0)' },
      timeout: 15000,
    });
    if (!response.ok) return undefined;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return undefined;
    const imageBuffer = await response.buffer();
    if (imageBuffer.length < 5000) return undefined;

    const outputPath = path.join(IMAGES_DIR, `${slug}.webp`);
    await sharp(imageBuffer)
      .resize(1200, 630, { fit: 'cover', position: 'center' })
      .webp({ quality: 88, effort: 5 })
      .toFile(outputPath);

    return `/images/posts/${slug}.webp`;
  } catch {
    return undefined;
  }
}

// ── AI image generation (same prompt engine as fetch-news.ts) ─────────────────

// Group concept themes (no real person descriptions)
const GROUP_THEMES: Record<string, { setting: string; palette: string }> = {
  'BTS':          { setting: 'dreamlike concert stadium, ocean of glowing purple lightsticks, cherry blossom petals drifting', palette: 'deep violet, cobalt blue, soft lavender, silver shimmer' },
  'BLACKPINK':    { setting: 'luxury editorial stage with cascading pink rose petals, black velvet drapes, golden spotlights', palette: 'hot pink, jet black, rose gold, cream white' },
  'aespa':        { setting: 'digital metaverse portal, swirling holographic particle effects, neon-cyan grid', palette: 'holographic silver, teal, neon cyan, metallic white' },
  'NewJeans':     { setting: 'cozy sunlit café with pastel daisies, Y2K retro accessories, golden-hour window light', palette: 'baby blue, soft pink, cream white, pastel mint' },
  'IVE':          { setting: 'grand stage bathed in royal blue and champagne gold light, aurora sky backdrop', palette: 'royal blue, pearl white, champagne gold, soft cream' },
  'LE SSERAFIM':  { setting: 'dramatic arena with motion-blur energy lines, sparks, intense red and navy stage lighting', palette: 'deep navy, crimson red, stark white, gold' },
  'TWICE':        { setting: 'vibrant stage surrounded by heart-shaped confetti, rainbow bokeh, balloons and flowers', palette: 'candy pink, coral orange, rainbow pastels, soft white' },
  'SEVENTEEN':    { setting: 'center stage with diamond-blue sparkle formations, synchronized light pillars', palette: 'diamond blue, sky blue, silver white, pale gold' },
  'Stray Kids':   { setting: 'industrial performance space, neon green light slicing through dark fog', palette: 'dark charcoal, neon green, deep crimson, black' },
  'ATEEZ':        { setting: 'theatrical stage with grand crimson spotlights, swirling fog, epic performance energy', palette: 'deep orange, pirate gold, crimson red, dark charcoal' },
  'ENHYPEN':      { setting: 'gothic garden at midnight, silver moonbeams, dark red petals floating', palette: 'deep purple, blood crimson, pale silver, midnight black' },
};

const CATEGORY_CHARACTERS: Record<string, string> = {
  music:     'beautiful young woman, long silky dark hair with crystal pins, luminous porcelain skin, sparkling eyes with long lashes, elaborate stage costume with embroidered details',
  drama:     'elegant young woman with expressive deep eyes, porcelain skin, wearing a delicate lace-trimmed costume, hair pinned with jade ornaments',
  celebrity: 'graceful young woman with high cheekbones, radiant glowing skin, crystal jewelry, chic fashion-forward outfit',
  fashion:   'stunning young woman with sharp elegant features, diamond earrings, flawless skin, couture gown with floral embroidery',
  variety:   'cheerful young woman with bright sparkling eyes, rosy cheeks, warm smile, colorful pastel casual outfit, loose playful waves',
  news:      'poised young woman with calm luminous eyes, crystal jewelry, stylish modern outfit in soft neutral tones',
  audition:  'determined young woman in sleek dance-practice outfit, fierce focused eyes, glowing skin, dynamic energetic pose',
  default:   'beautiful young woman with flowing hair, sparkling eyes, delicate features with luminous skin, elegant K-pop outfit with jeweled accessories',
};

const EVENT_SCENES: Record<string, { scene: string; lighting: string }> = {
  comeback:  { scene: 'center stage with holographic album art glowing in the air, theatrical mist, dramatic spotlight', lighting: 'electric neon accent lights, volumetric god rays, stage smoke glow' },
  concert:   { scene: 'massive stage, ocean of colorful lightsticks glowing below, laser grid overhead', lighting: 'explosive LED stage lighting, laser beams cutting through smoke' },
  award:     { scene: 'grand award ceremony stage, golden confetti frozen mid-air, gleaming trophy in hand', lighting: 'warm prestige spotlight, golden shimmer' },
  drama:     { scene: 'cinematic Korean drama setting — Han River at dusk, Seoul city lights reflecting on water', lighting: 'warm cinematic golden-hour, soft film bokeh, gentle lens flare' },
  romance:   { scene: 'romantic rooftop above Seoul at twilight, warm café lights, Han River, first stars appearing', lighting: 'amber and rose glow, soft bokeh city lights' },
  debut:     { scene: 'first stage at sunrise, expression full of bright hope, fresh new world opening', lighting: 'sunrise gradient bursting through, vibrant warm rays' },
  birthday:  { scene: 'festive celebration, colorful confetti, sparklers, beautiful flowers, eyes wide with joy', lighting: 'golden sparkle glow, colorful bokeh, warm candlelight shimmer' },
  fashion:   { scene: 'luxury red carpet, marble columns, velvet drapes, cameras flashing', lighting: 'dramatic front spotlights, editorial high-contrast' },
  chart:     { scene: 'triumphant celebration with digital fireworks and neon streaming light trails', lighting: 'colorful fireworks burst, neon glow, celebratory light storm' },
  general:   { scene: 'spectacular K-pop performance stage with dynamic light formations and dazzling visual effects', lighting: 'rich saturated stage lighting, high-contrast dramatic spotlight' },
};

function extractKpopGroup(text: string): string | null {
  const groups = [
    { names: ['bts', 'bangtan', 'jimin', 'jungkook', 'suga', 'j-hope', 'rm '], key: 'BTS' },
    { names: ['blackpink', 'jennie', 'lisa', 'jisoo', 'rosé', 'rose '], key: 'BLACKPINK' },
    { names: ['aespa', 'karina', 'giselle', 'ningning'], key: 'aespa' },
    { names: ['newjeans', 'new jeans', 'minji', 'hanni', 'danielle', 'haerin'], key: 'NewJeans' },
    { names: ["ive'", 'wonyoung', 'yujin', "ive's", '\bive\b'], key: 'IVE' },
    { names: ['le sserafim', 'lesserafim', 'kazuha', 'sakura', 'chaewon', 'yunjin'], key: 'LE SSERAFIM' },
    { names: ['twice', 'nayeon', 'jihyo', 'momo', 'sana', 'mina', 'tzuyu'], key: 'TWICE' },
    { names: ['seventeen', 's.coups', 'jeonghan', 'hoshi', 'wonwoo', 'woozi'], key: 'SEVENTEEN' },
    { names: ['stray kids', 'straykids', 'bang chan', 'hyunjin', 'felix'], key: 'Stray Kids' },
    { names: ['ateez', 'hongjoong', 'seonghwa', 'yunho', 'yeosang'], key: 'ATEEZ' },
    { names: ['enhypen', 'jungwon', 'heeseung', 'sunghoon', 'sunoo'], key: 'ENHYPEN' },
  ];
  const lower = text.toLowerCase();
  for (const g of groups) {
    if (g.names.some(n => lower.includes(n))) return g.key;
  }
  return null;
}

function detectEventType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.match(/\b(comeback|new (song|album|mv)|release|single|mini.?album)\b/)) return 'comeback';
  if (lower.match(/\b(concert|tour|world tour|live performance|fancon)\b/)) return 'concert';
  if (lower.match(/\b(award|trophy|win|mama|grammy|daesang)\b/)) return 'award';
  if (lower.match(/\b(drama|k-drama|kdrama|cast|lead role|ost)\b/)) return 'drama';
  if (lower.match(/\b(dating|couple|romance|marry|wedding|engaged)\b/)) return 'romance';
  if (lower.match(/\b(debut|first|brand new|newly debuted)\b/)) return 'debut';
  if (lower.match(/\b(birthday|born|celebrate|anniversary)\b/)) return 'birthday';
  if (lower.match(/\b(fashion|red carpet|outfit|style|brand ambassador)\b/)) return 'fashion';
  if (lower.match(/\b(chart|billboard|spotify|streaming|million views)\b/)) return 'chart';
  return 'general';
}

function buildImagePrompt(title: string, summary: string, category: string): string {
  const combinedText = `${title} ${summary}`;
  const group = extractKpopGroup(combinedText);
  const eventType = detectEventType(combinedText);
  const groupTheme = group ? GROUP_THEMES[group] : null;
  const eventScene = EVENT_SCENES[eventType] || EVENT_SCENES['general'];
  const character = CATEGORY_CHARACTERS[category] || CATEGORY_CHARACTERS['default'];

  const quality = 'masterpiece, best quality, ultra-detailed, 8k resolution, (intricate details:1.3), (highly detailed face:1.2)';
  const style = 'stunning anime digital art illustration, 3D render quality, highly detailed sparkling eyes, ultra-detailed skin texture with soft glow, intricate jewelry and accessories, cinematic composition, widescreen 16:9';
  const setting = groupTheme ? `${eventScene.scene}, within ${groupTheme.setting}` : eventScene.scene;
  const lighting = `${eventScene.lighting}, soft volumetric lighting, dreamy bokeh background, glitter sparkle particles, luminous ambient glow`;
  const palette = groupTheme?.palette ?? 'warm golden tones, soft pink, lavender, luminous whites';

  return `${quality}, ${style}, ${character}, ${setting}, ${lighting}, color palette: ${palette}, no text, no watermarks, no logos, no real person, fictional character only`;
}

async function generateAIImagePrompt(title: string, summary: string, category: string): Promise<string> {
  const basePrompt = buildImagePrompt(title, summary, category);
  try {
    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an expert AI image prompt engineer for ultra-detailed anime illustrations.
Output ONLY comma-separated prompt tags. Always keep: masterpiece, best quality, ultra-detailed, 8k.
Character MUST be fictional — NEVER reference any real K-pop celebrity.
Add 2-3 visual tags from the article mood. No sentences. Under 200 characters.`,
        },
        {
          role: 'user',
          content: `Base: ${basePrompt}\nArticle: ${title} — ${summary.slice(0, 120)}\nAdd 2-3 mood tags only.`,
        },
      ],
      temperature: 0.6,
      max_tokens: 200,
    });
    const enhanced = response.choices[0]?.message?.content?.trim();
    if (enhanced && enhanced.length > 20) return enhanced;
  } catch { /* use base */ }
  return basePrompt;
}

async function generateAIImage(title: string, summary: string, category: string, slug: string): Promise<string | undefined> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    console.log('  No Cloudflare credentials — skipping AI generation');
    return undefined;
  }

  const prompt = await generateAIImagePrompt(title, summary, category);
  const trimmed = prompt.slice(0, 500);
  const fullPrompt = `masterpiece, best quality, ultra-detailed, 8k, (intricate details:1.3), beautiful anime girl, ${trimmed}, no text, no watermarks, no real person`;

  try {
    console.log(`  Generating AI image (Cloudflare SDXL Lightning)...`);
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/bytedance/stable-diffusion-xl-lightning`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          negative_prompt: '(worst quality, low quality:1.4), ugly, deformed, bad anatomy, extra limbs, blurry, watermark, text, logo, real person, celebrity, photorealistic',
          num_steps: 4,
          guidance: 0,
          width: 1024,
          height: 576,
        }),
        timeout: 60000,
      }
    );

    if (!response.ok) {
      console.error(`  Cloudflare error: ${response.status}`);
      return undefined;
    }

    const contentType = response.headers.get('content-type') || '';
    let imageBuffer: Buffer;

    if (contentType.startsWith('image/')) {
      imageBuffer = await response.buffer();
    } else {
      const json = await response.json() as { success: boolean; result?: { image: string } };
      if (!json.success || !json.result?.image) return undefined;
      imageBuffer = Buffer.from(json.result.image, 'base64');
    }

    if (imageBuffer.length < 5000) return undefined;

    const outputPath = path.join(IMAGES_DIR, `${slug}.webp`);
    await sharp(imageBuffer)
      .resize(1200, 630, { fit: 'cover', position: 'center' })
      .webp({ quality: 88, effort: 5 })
      .toFile(outputPath);
    return `/images/posts/${slug}.webp`;
  } catch (err) {
    console.error(`  AI generation error: ${err}`);
    return undefined;
  }
}

// ── Update article frontmatter ────────────────────────────────────────────────

function updateArticleFrontmatter(filePath: string, thumbnailPath: string, isAI: boolean): void {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = matter(raw);
  parsed.data.thumbnail = thumbnailPath;
  parsed.data.isAIGenerated = isAI;
  fs.writeFileSync(filePath, matter.stringify(parsed.content, parsed.data), 'utf-8');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`=== Backfill Images (YouTube → AI ultra-detail) ===`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'} | AI-only: ${AI_ONLY}`);
  if (FILTER_CATEGORY) console.log(`Category filter: ${FILTER_CATEGORY}`);
  if (LIMIT !== Infinity) console.log(`Limit: ${LIMIT}`);
  console.log('');

  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
  const targets: Array<{ file: string; slug: string; data: Record<string, unknown> }> = [];

  for (const file of files) {
    const { data } = matter(fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8'));
    if (!data.sourceUrl) continue;
    if (FILTER_CATEGORY && data.category !== FILTER_CATEGORY) continue;
    targets.push({ file, slug: file.replace('.md', ''), data });
  }

  console.log(`Found ${targets.length} articles to process\n`);

  let ytSuccess = 0, aiSuccess = 0, failed = 0, count = 0;

  for (const { file, slug, data } of targets) {
    if (count >= LIMIT) break;
    count++;

    const category = data.category as string;
    const sourceUrl = data.sourceUrl as string;
    const title = data.title as string;
    const summary = (data.summary || data.excerpt || '') as string;

    console.log(`[${count}/${Math.min(targets.length, LIMIT)}] ${title.slice(0, 60)}`);

    let savedPath: string | undefined;
    let isAI = false;

    if (!AI_ONLY) {
      // 1) Try YouTube thumbnail
      const videoId = await extractYouTubeFromArticle(sourceUrl);
      if (videoId) {
        console.log(`  YouTube ID: ${videoId}`);
        if (!DRY_RUN) savedPath = await getYouTubeThumbnail(videoId, slug);
        else { console.log(`  → [DRY RUN] Would use YouTube thumbnail`); savedPath = 'dry-run'; }
        if (savedPath) { ytSuccess++; console.log(`  ✓ YouTube thumbnail`); }
      }
    }

    // 2) AI fallback
    if (!savedPath) {
      console.log(`  No YouTube → generating AI ultra-detail anime image...`);
      if (!DRY_RUN) {
        savedPath = await generateAIImage(title, summary, category, slug);
        if (savedPath) isAI = true;
      } else {
        console.log(`  → [DRY RUN] Would generate AI image`);
        savedPath = 'dry-run'; isAI = true;
      }
      if (savedPath) { aiSuccess++; console.log(`  ✓ AI generated`); }
    }

    if (!savedPath) {
      console.log(`  ✗ Failed`);
      failed++;
      await new Promise(r => setTimeout(r, 500));
      continue;
    }

    if (!DRY_RUN) {
      updateArticleFrontmatter(path.join(CONTENT_DIR, file), savedPath, isAI);
    }

    // Rate limiting: YouTube는 빠르게, AI는 Pollinations 서버 부하 고려
    await new Promise(r => setTimeout(r, isAI ? 3000 : 800));
  }

  console.log(`\n=== Done ===`);
  console.log(`YouTube: ${ytSuccess} | AI-generated: ${aiSuccess} | Failed: ${failed}`);
  if (DRY_RUN) console.log('(Dry run — no files changed)');
}

main().catch(console.error);
